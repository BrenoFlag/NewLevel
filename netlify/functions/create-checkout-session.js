/**
 * Netlify Function that creates a Stripe Checkout Session for memberships.
 * Everything runs server-side so API keys and pricing IDs stay secret.
 */

const Stripe = require("stripe");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;

module.exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Allow": "POST" },
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    if (!stripe) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY." }),
        };
    }

    try {
        const { priceId, email } = JSON.parse(event.body || "{}");

        if (!priceId || !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "priceId and email are required." }),
            };
        }

        // Build absolute URLs for success and cancel flows based on incoming request headers.
        const proto = event.headers["x-forwarded-proto"] || "http";
        const host = event.headers.host || "localhost:8888";
        const origin = `${proto}://${host}`;

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: email,
            allow_promotion_codes: true,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/membership/thanks/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#pricing`,
            metadata: {
                priceId,
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "Unexpected error" }),
        };
    }
};
