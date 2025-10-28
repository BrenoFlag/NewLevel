"use strict";

/**
 * Utility helper for sending transactional emails using Nodemailer.
 * Every step is commented so newer developers can follow the flow.
 */
const nodemailer = require("nodemailer");

/**
 * Sends a basic HTML email using SMTP credentials stored in environment variables.
 * @param {string} to - The recipient email address.
 * @param {string} subject - The email subject line.
 * @param {string} html - HTML string that will be shown in the email body.
 */
async function sendEmail(to, subject, html) {
    // Pull SMTP details from environment variables so we never hard-code secrets.
    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS,
        FROM_EMAIL
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
        // Throwing an error keeps the calling code aware that mailing is not configured yet.
        throw new Error("SMTP environment variables are not fully configured.");
    }

    // Convert the optional port string to a number while falling back to the standard port 587.
    const port = SMTP_PORT ? Number(SMTP_PORT) : 587;

    // Create a transporter each time the function runs. For larger apps you might cache this.
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465, // Port 465 expects a secure TLS connection.
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    // Send the email and wait until Nodemailer confirms the message was handed off.
    await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html
    });
}

module.exports = {
    sendEmail
};
