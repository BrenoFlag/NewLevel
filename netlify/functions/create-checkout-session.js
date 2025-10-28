"use strict";

/**
 * Netlify serverless function for creating a Stripe Checkout Session.
 * The comments walk through each step so anyone new to functions/Stripe can follow along.
 */
const stripeLib = require("stripe");

// Lazily create the Stripe client using our secret key so we can make API calls.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? stripeLib(stripeSecretKey) : null;

module.exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    if (!stripe) {
        // Returning an error instead of throwing keeps the HTTP response friendly for the client.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Stripe secret key is missing." })
        };
    }

    try {
        // Parse the JSON body that our front-end sends.
        const { priceId, email, plan } = JSON.parse(event.body || "{}");

        if (!priceId || !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "priceId and email are required." })
            };
        }

        // Reconstruct the origin (protocol + domain) so our success/cancel URLs work in every environment.
        const headers = event.headers || {};
        const protocol = headers["x-forwarded-proto"] || "http";
        const host = headers.host || "localhost:8888";
        const origin = `${protocol}://${host}`;

        // Create the checkout session.
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer_email: email,
            allow_promotion_codes: true,
            metadata: {
                // Saving the price id makes it easy for the webhook to work out which plan was purchased later.
                priceId,
                plan: plan || ""
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: `${origin}/membership/thanks/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#pricing`
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ url: session.url })
        };
    } catch (error) {
        // Any unexpected error (bad JSON, Stripe error, etc.) lands here.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "Unknown error" })
        };
    }
};
