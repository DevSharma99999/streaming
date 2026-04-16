export const sendValdoraEmail = async (email, otp, subject) => {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Valdora Team", email: "kaushikdev381@gmail.com" },
                to: [{ email: email }],
                subject: subject,
                htmlContent: `
                    <div style="font-family: sans-serif; text-align: center; background: #0f0f0f; color: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #333;">
                        <h2 style="color: #e11d48; margin-bottom: 20px;">Valdora Security</h2>
                        <p style="font-size: 16px; opacity: 0.9;">Your verification code is:</p>
                        <div style="background: #1a1a1a; padding: 25px; border: 2px solid #e11d48; display: inline-block; border-radius: 12px; margin: 20px 0;">
                            <h1 style="letter-spacing: 12px; font-size: 42px; margin: 0; color: #e11d48;">${otp}</h1>
                        </div>
                        <p style="font-size: 14px; opacity: 0.6; margin-top: 20px;">This code expires in 10 minutes.</p>
                    </div>
                `
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Brevo API Error:", data);
            return { success: false };
        }

        console.log("Brevo: Email sent successfully", data.messageId);
        return { success: true };
    } catch (error) {
        console.error("Network Error sending email:", error.message);
        return { success: false, error };
    }
};