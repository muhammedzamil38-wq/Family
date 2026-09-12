import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../env/backend.env') });

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass
        }
      });
    } else {
      // In development or when SMTP credentials are not yet configured, create a mock / ethereal transporter
      transporter = {
        sendMail: async (mailOptions) => {
          console.log('\n================ [EMAIL SIMULATION] ================');
          console.log(`From:    ${mailOptions.from}`);
          console.log(`To:      ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Text:    ${mailOptions.text}`);
          console.log('====================================================\n');
          return { messageId: 'simulated-' + Date.now() };
        }
      };
    }
  }
  return transporter;
}

/**
 * Sends a 6-digit OTP code to the recipient email.
 * @param {string} email - Destination email address
 * @param {string} code - 6-digit numeric OTP code
 */
export async function sendOtpEmail(email, code) {
  const fromAddress = process.env.SMTP_FROM || 'no-reply@familyapp.com';
  const mailClient = getTransporter();

  const mailOptions = {
    from: `"Family Archive Security" <${fromAddress}>`,
    to: email,
    subject: `Your Login Verification Code: ${code}`,
    text: `Hello,\n\nYour 6-digit verification code for Archive Administration is:\n\n  ${code}\n\nThis code will expire in 5 minutes. If you did not request this login, please ignore this email.\n\nBest regards,\nFamily Archive Security Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Family Archive Administration</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Secure Login Verification</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #475569; font-size: 14px; margin: 0 0 12px 0;">Use the following 6-digit one-time passcode to sign in:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0284c7; background: #e0f2fe; display: inline-block; padding: 12px 24px; border-radius: 8px; border: 1px dashed #0284c7;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 14px; margin-bottom: 0;">⏱ Valid for 5 minutes • Maximum 8 requests per hour</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
          If you did not initiate this sign-in attempt, please ensure your account password is kept safe.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Sent automatically by ${fromAddress}. Please do not reply directly to this email.
        </p>
      </div>
    `
  };

  try {
    const info = await mailClient.sendMail(mailOptions);
    console.log(`[OTP] Sent OTP code ${code} to ${email}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[OTP Error] Failed to send email to ${email}:`, error);
    // Even if remote SMTP fails in development, log the code so developer is not locked out
    console.log(`[FALLBACK OTP CODE]: ${code}`);
    return { success: false, error: error.message };
  }
}
