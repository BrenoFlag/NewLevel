/**
 * Handles Stripe webhook events. Netlify passes us the raw body so we can verify the signature.
 */
const fs = require("fs");
const path = require("path");
const Stripe = require("stripe");
const { sendEmail } = require("./_lib/email");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CALENDLY_FALLBACK_URL = "https://calendly.com/breno-flag/consultation";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;
const membersPath = path.join(__dirname, "_data", "members.json");

module.exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Allow": "POST" },
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Stripe webhook is not configured correctly." }),
        };
    }

    const signature = event.headers["stripe-signature"];
    if (!signature) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing Stripe signature." }),
        };
    }

    // Netlify delivers the raw payload as a string. Convert it to a buffer, decoding from base64 when needed.
    const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body || "", "utf8");

    let stripeEvent;
    try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook signature verification failed: ${error.message}` }),
        };
    }

    if (stripeEvent.type === "checkout.session.completed") {
        const session = stripeEvent.data.object;
        const customerId = session.customer;
        const email = session.customer_details?.email || session.customer_email;
        const plan = session.metadata?.plan || session.metadata?.priceId || "unknown";

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "No email found on session." }),
            };
        }

        // Load existing members, defaulting to an empty array on the first run.
        let members = [];
        try {
            if (fs.existsSync(membersPath)) {
                const fileContents = fs.readFileSync(membersPath, "utf8");
                members = JSON.parse(fileContents || "[]");
            }
        } catch (error) {
            // If reading fails we still continue to avoid blocking the webhook; Stripe will retry if needed.
            members = [];
        }

        const newRecord = {
            email,
            customerId,
            plan,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        members.push(newRecord);

        try {
            fs.writeFileSync(membersPath, JSON.stringify(members, null, 2));
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Unable to save member record: ${error.message}` }),
            };
        }

        const bookingLink = process.env.CALENDLY_SECRET_BOOKING_URL || CALENDLY_FALLBACK_URL;
        const emailBody = `
            <p>Hi there!</p>
            <p>Your membership is active. Here is your member-only booking link:</p>
            <p><a href="${bookingLink}">${bookingLink}</a></p>
            <p>We look forward to seeing you soon.</p>
        `;

        try {
            await sendEmail(email, "Your Member Booking Link", emailBody);
        } catch (error) {
            // Email issues should not cause Stripe to retry forever, so we log the failure but return success.
            console.error("Email send failed", error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
    };
};
