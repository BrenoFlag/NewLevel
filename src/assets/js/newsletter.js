document.addEventListener("DOMContentLoaded", () => {
    const newsletterForms = document.querySelectorAll("[data-newsletter-form]");

    if (!newsletterForms.length) {
        return;
    }

    newsletterForms.forEach((form) => {
        const status = form.querySelector(".cs-form-status");

        if (!status) {
            return;
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            status.textContent = "";
            status.classList.remove("is-success", "is-error");

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            try {
                const response = await fetch("/", {
                    method: "POST",
                    body: new FormData(form),
                });

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                status.textContent = "Thanks for subscribing!";
                status.classList.add("is-success");
                form.reset();
            } catch (error) {
                status.textContent = "Something went wrong. Please try again.";
                status.classList.add("is-error");
            }
        });
    });
});
