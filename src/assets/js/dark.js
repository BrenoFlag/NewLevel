//
//    The Dark Mode System
//

// helper functions to toggle dark mode
function enableDarkMode() {
    document.body.classList.add("dark-mode");
    sessionStorage.setItem("theme", "dark");
}
function disableDarkMode() {
    document.body.classList.remove("dark-mode");
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
