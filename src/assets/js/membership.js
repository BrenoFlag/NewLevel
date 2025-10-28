/**
 * Front-end helper that triggers a Stripe Checkout session.
 * Everything is written in plain JavaScript so a beginner can tweak it easily.
 */
export async function startMembership(priceId, email, options = {}) {
    const { button, feedbackElement, plan } = options;

    if (!priceId) {
        throw new Error("Missing price ID.");
    }

    if (!email) {
        throw new Error("Please enter an email address.");
    }

    // Keep the original button text so we can restore it after the request completes.
    const originalLabel = button ? button.textContent : null;
    if (button) {
        button.disabled = true;
        button.textContent = "Just a sec…";
    }

    if (feedbackElement) {
        feedbackElement.textContent = "";
    }

    try {
        const response = await fetch("/.netlify/functions/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ priceId, email, plan })
        });

        if (!response.ok) {
            throw new Error("Unable to start checkout. Please try again.");
        }

        const payload = await response.json();

        if (payload.url) {
            window.location.href = payload.url;
        } else {
            throw new Error("Stripe did not return a checkout URL.");
        }
    } catch (error) {
        if (feedbackElement) {
            feedbackElement.textContent = error.message;
        } else {
            alert(error.message); // Fallback so the user still gets feedback.
        }
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalLabel || "Join";
        }
    }
}

// Automatically wire up the buttons when this module loads in the browser.
(function attachHandlers() {
    const buttons = document.querySelectorAll("[data-membership-button]");

    if (!buttons.length) {
        // Exit early on pages without the pricing section.
        return;
    }

    const emailInput = document.getElementById("memberEmail");
    const feedbackElement = document.querySelector("[data-membership-feedback]");

    buttons.forEach((button) => {
        button.addEventListener("click", async () => {
            if (feedbackElement) {
                feedbackElement.textContent = "";
            }

            const email = emailInput ? emailInput.value.trim() : "";
            const priceId = button.dataset.priceId;
            const plan = button.dataset.plan || "";

            try {
                await startMembership(priceId, email, { button, feedbackElement, plan });
            } catch (error) {
                if (feedbackElement) {
                    feedbackElement.textContent = error.message;
                }
            }
        });
    });
})();
