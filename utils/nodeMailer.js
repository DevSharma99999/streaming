import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    // Direct IPv4 for Gmail SMTP to bypass IPv6 ENETUNREACH
    host: "64.233.184.108", 
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Adding this is necessary when using a direct IP as the host
    tls: {
        servername: 'smtp.gmail.com',
        rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
});