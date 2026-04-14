import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Keep this false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // This is the CRITICAL part to fix ENETUNREACH
    tls: {
        rejectUnauthorized: false
    },
    // Force IPv4
    family: 4 
});