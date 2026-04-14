import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    // Using the direct IPv4 hostname for Gmail's SMTP
    host: "smtp.gmail.com", 
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Adding this ensures it doesn't try IPv6
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    dnsLookup: (hostname, options, callback) => {
        // This forces the DNS to only look for IPv4 addresses
        callback(null, "64.233.184.108", 4); 
    }
});