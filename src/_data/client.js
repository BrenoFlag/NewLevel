module.exports = {
    name: "Code Stitch Web Designs",
    email: "hello@nulevelgroup.org",
    phoneForTel: "7707996416",
    phoneFormatted: "(770) 799-6416",
    address: {
        lineOne: "First Address Line",
        lineTwo: "Second Address Line",
        city: "Atlanta",
        state: "GA",
        zip: "80206",
        country: "US",
        mapLink: "https://maps.app.goo.gl/TJRwLKsUx7GUF5NS9",
    },
    socials: {
        facebook: "https://www.facebook.com/share/1CaK6mLK92/?mibextid=wwXIfr",
        instagram: "https://www.instagram.com/nulevelgroup?igsh=MXZxNThqa25oYWR2NQ==",
        linkedin: "https://www.linkedin.com/company/nulevelgroup/"
    },
    //! Make sure you include the file protocol (e.g. https://) and that NO TRAILING SLASH is included
    domain: "https://www.example.com",
    // Passing the isProduction variable for use in HTML templates
    isProduction: process.env.ELEVENTY_ENV === "PROD",
};
