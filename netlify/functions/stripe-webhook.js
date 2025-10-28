"use strict";

/**
 * Netlify function that processes Stripe webhook events.
 * Netlify requires us to work with the raw body for signature verification,
 * so a config object disabling the default body parser is exported at the bottom.
 */
const stripeLib = require("stripe");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("./_lib/email");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? stripeLib(stripeSecretKey) : null;

async function storeMemberRecord(details) {
    // Resolve the folder alongside this file (netlify/functions/_data)
    const dataDirectory = path.join(__dirname, "_data");
    const dataFile = path.join(dataDirectory, "members.json");

    // Ensure the directory exists so writeFile never fails because of a missing path.
    await fs.promises.mkdir(dataDirectory, { recursive: true });

    let members = [];
    try {
        const fileContents = await fs.promises.readFile(dataFile, "utf8");
        members = JSON.parse(fileContents);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        // ENOENT means the file does not exist yet, so we keep the empty array above.
    }

    // Either update an existing member or append a new one.
    const existingIndex = members.findIndex((member) => member.email === details.email);
    const timestamp = new Date().toISOString();
    const record = {
        email: details.email,
        customerId: details.customerId,
        plan: details.plan,
        status: "active",
        createdAt: existingIndex >= 0 ? members[existingIndex].createdAt : timestamp,
        updatedAt: timestamp
    };

    if (existingIndex >= 0) {
        members[existingIndex] = record;
    } else {
        members.push(record);
    }

    await fs.promises.writeFile(dataFile, JSON.stringify(members, null, 2));
}

async function handleCheckoutCompleted(session) {
    const email = session.customer_details && session.customer_details.email;
    const customerId = session.customer;
    const plan = (session.metadata && (session.metadata.plan || session.metadata.priceId)) || "unknown";

    if (!email || !customerId) {
        // If we are missing core information we simply exit early.
        return;
    }

    await storeMemberRecord({ email, customerId, plan });

    // Use the secret Calendly link if available; otherwise fall back to the public page.
    const privateBookingLink = process.env.CALENDLY_SECRET_BOOKING_URL ||
        "https://calendly.com/breno-flag/consultation";

    const message = `
        <p>Hi there!</p>
        <p>Your ${plan} membership is active. Use the link below to schedule member-only sessions:</p>
        <p><a href="${privateBookingLink}">${privateBookingLink}</a></p>
        <p>We are excited to work with you!</p>
    `;

    try {
        await sendEmail(email, "Your Member Booking Link", message);
    } catch (error) {
        console.error("Unable to send welcome email", error);
    }
}

const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    if (!stripe || !webhookSecret) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Stripe keys are not configured." })
        };
    }

    const signature = event.headers["stripe-signature"];

    if (!signature) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing Stripe signature header." })
        };
    }
    const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "");

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook signature verification failed: ${error.message}` })
        };
    }

    if (stripeEvent.type === "checkout.session.completed") {
        try {
            await handleCheckoutCompleted(stripeEvent.data.object);
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message || "Failed to process session." })
            };
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};

module.exports = {
    handler,
    config: {
        bodyParser: false
    }
};
