import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generic function to send Valdora emails via Resend
 */
export const sendValdoraEmail = async (email, otp, subject) => {
    try {
        const data = await resend.emails.send({
            from: 'Valdora <onboarding@resend.dev>', // Required for Resend Free Tier
            to: email,
            subject: subject,
            html: `
                <div style="font-family: sans-serif; text-align: center; background: #0f0f0f; color: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto;">
                    <h2 style="color: #e11d48; margin-bottom: 20px;">Valdora Account Security</h2>
                    <p style="font-size: 16px; opacity: 0.9;">Use the verification code below:</p>
                    <div style="background: #1a1a1a; padding: 25px; border: 2px solid #e11d48; display: inline-block; border-radius: 12px; margin: 20px 0;">
                        <h1 style="letter-spacing: 12px; font-size: 42px; margin: 0; color: #e11d48;">${otp}</h1>
                    </div>
                    <p style="font-size: 14px; opacity: 0.6; margin-top: 20px;">
                        This code expires in 10 minutes. If you didn't request this, please ignore this email.
                    </p>
                </div>
            `
        });
        return data;
    } catch (error) {
        console.error("Resend Service Error:", error);
        throw error;
    }
};