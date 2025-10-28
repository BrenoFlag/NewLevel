/**
 * Simple wrapper around Nodemailer so every function can send emails with the same configuration.
 * All values come from environment variables so nothing sensitive is stored in the repository.
 */
const nodemailer = require("nodemailer");

/**
 * Sends an HTML email using the SMTP credentials defined in environment variables.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject line.
 * @param {string} html - HTML body content.
 */
async function sendEmail(to, subject, html) {
    // Read configuration once so we can provide clear error messages if anything is missing.
    const {
        SMTP_HOST,
        SMTP_PORT = 587,
        SMTP_USER,
        SMTP_PASS,
        FROM_EMAIL,
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
        throw new Error("SMTP configuration is missing. Check your environment variables.");
    }

    // Nodemailer handles both secure (465) and STARTTLS (587) ports. We pick secure automatically for 465.
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
    });
}

module.exports = { sendEmail };
