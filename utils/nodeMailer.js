import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Must be false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Keep using your Google App Password
    },
    // Adding these timeout settings prevents the backend from hanging too long
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
});