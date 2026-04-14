import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  // Direct IPv4 address for Google's SMTP (smtp.gmail.com)
  host: "64.233.184.108", 
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // This is CRITICAL: It tells Nodemailer that even though 
    // we are hitting an IP, the certificate is for gmail.
    servername: 'smtp.gmail.com',
    rejectUnauthorized: false
  }
});