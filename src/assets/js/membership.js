// This file is loaded as an ES module so we can both export the helper and run setup code.
const ENDPOINT = "/.netlify/functions/create-checkout-session";

/**
 * Starts the membership checkout flow by calling our Netlify Function.
 * @param {string} priceId - The Stripe Price ID stored in the button's data attribute.
 * @param {string} email - Customer email address so Stripe can send confirmations.
 * @param {HTMLButtonElement} button - The button that launched the request; used for UI feedback.
 * @param {HTMLElement} messageTarget - Element that shows success or error messages to the visitor.
 */
export async function startMembership(priceId, email, button, messageTarget) {
    // Store the original button label so we can restore it later.
    const originalLabel = button.textContent;

    // Visual feedback: disable the button to prevent double submissions and show a friendly message.
    button.disabled = true;
    button.textContent = "Just a sec…";

    // Clear any previous messages before we begin a fresh request.
    if (messageTarget) {
        messageTarget.textContent = "";
    }

    try {
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId, email }),
        });

        if (!response.ok) {
            // Surface the error details so debugging is easier during testing.
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || "Unable to start checkout. Please try again.");
        }

        const data = await response.json();

        if (data.url) {
            // Stripe returns a hosted checkout URL; redirect the browser there immediately.
            window.location.href = data.url;
        } else {
            throw new Error("Stripe did not return a checkout link. Double-check your environment variables.");
        }
    } catch (error) {
        // If anything fails we re-enable the button and show the visitor what happened.
        button.disabled = false;
        button.textContent = originalLabel;

        if (messageTarget) {
            messageTarget.textContent = error.message;
            messageTarget.setAttribute("role", "alert");
        }
    }
}

// Automatically wire up the pricing buttons once the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("memberEmail");
    const statusMessage = document.getElementById("membershipMessage");

    const planButtons = document.querySelectorAll("button[data-price-id]");
    if (!planButtons.length) return; // Exit quietly if the pricing section is not present.

    planButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const priceId = button.dataset.priceId;
            const email = emailInput ? emailInput.value.trim() : "";

            if (!priceId || priceId.startsWith("__")) {
                if (statusMessage) {
                    statusMessage.textContent = "Pricing is not configured yet. Add your Stripe Price IDs.";
                    statusMessage.setAttribute("role", "alert");
                }
                return;
            }

            if (!email) {
                if (statusMessage) {
                    statusMessage.textContent = "Please enter the email address you want us to use for confirmations.";
                    statusMessage.setAttribute("role", "alert");
                }
                if (emailInput) {
                    emailInput.focus();
                }
                return;
            }

            startMembership(priceId, email, button, statusMessage);
        });
    });
});
