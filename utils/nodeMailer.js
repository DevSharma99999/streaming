import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // INCREASE TIMEOUTS for Render's slower network
    connectionTimeout: 20000, // 20 seconds
    greetingTimeout: 20000,
    socketTimeout: 30000,
    // Keep the IPv4 force
    dnsLookup: (hostname, options, callback) => {
        callback(null, "64.233.184.108", 4); 
    },
    tls: {
        rejectUnauthorized: false,
        // This helps prevent protocol hanging
        minVersion: 'TLSv1.2' 
    }
});