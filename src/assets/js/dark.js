//
//    The Dark Mode System
//

// updates the logo sources based on the current mode
function updateLogoSources(isDarkMode) {
    const logos = document.querySelectorAll('[data-light-src][data-dark-src]');

    logos.forEach((logo) => {
        const targetSource = isDarkMode ? logo.dataset.darkSrc : logo.dataset.lightSrc;

        if (targetSource && logo.getAttribute('src') !== targetSource) {
            logo.setAttribute('src', targetSource);
        }
    });
}

// helper functions to toggle dark mode
function enableDarkMode() {
    document.body.classList.add("dark-mode");
    updateLogoSources(true);
    sessionStorage.setItem("theme", "dark");
}
function disableDarkMode() {
    document.body.classList.remove("dark-mode");
    updateLogoSources(false);
    sessionStorage.setItem("theme", "light");
}

// determines a new users dark mode preferences
function detectColorScheme() {
    // default to light mode, but respect the theme chosen during this browser session
    if (sessionStorage.getItem("theme") === "dark") {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

// run on page load
detectColorScheme();

// add event listener to the dark mode button toggle
document.getElementById("dark-mode-toggle").addEventListener("click", () => {
    // on click, check the current session's dark mode value, use to apply the opposite of what's saved
    sessionStorage.getItem("theme") === "light" ? enableDarkMode() : disableDarkMode();
});
