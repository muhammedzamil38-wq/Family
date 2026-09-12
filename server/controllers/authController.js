import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from '../utils/email.js';

const MAX_OTP_PER_HOUR = 8;
const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Step 1 of Authentication:
 * Validates admin credentials, checks hourly rate limit (max 8/hr), generates a 6-digit OTP,
 * stores it with a 5-minute expiry, and emails the code.
 * POST /api/v1/auth/login OR POST /api/v1/auth/request-otp
 */
export async function requestOtp(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Email and password are required fields.']
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: ['The email address or password provided is incorrect.']
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errors: ['The email address or password provided is incorrect.']
      });
    }

    // Rate Limit Check: Max 8 OTP requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await Otp.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo }
    });

    if (hourlyCount >= MAX_OTP_PER_HOUR) {
      return res.status(429).json({
        message: 'Rate limit exceeded',
        errors: [`Maximum of ${MAX_OTP_PER_HOUR} OTP requests per hour reached. Please wait before trying again.`]
      });
    }

    // Generate secure 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Remove any previous pending unexpired OTP for this email
    await Otp.deleteMany({ email: normalizedEmail });

    // Store new OTP
    const otpDoc = new Otp({
      email: normalizedEmail,
      code,
      expiresAt
    });
    await otpDoc.save();

    // Send the email
    await sendOtpEmail(normalizedEmail, code);

    console.log(`[OTP] Generated 6-digit OTP for ${normalizedEmail} (Expires in ${OTP_EXPIRY_MINUTES} min)`);

    return res.json({
      message: 'Verification code sent to your email.',
      email: normalizedEmail,
      requiresOtp: true,
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Step 2 of Authentication:
 * Validates the 6-digit OTP code against the database, checks expiration and attempt counters,
 * then establishes an admin session.
 * POST /api/v1/auth/verify-otp
 */
export async function verifyOtp(req, res) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Email and 6-digit verification code are required.']
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanedCode = code.toString().trim();

  try {
    // Find active OTP record
    const otpDoc = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        message: 'Invalid or expired code',
        errors: ['Verification code has expired or was not found. Please request a new code.']
      });
    }

    // Check expiry
    if (new Date() > otpDoc.expiresAt) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        message: 'Code expired',
        errors: ['Verification code has expired. Please request a new code.']
      });
    }

    // Check attempt limit
    if (otpDoc.attempts >= MAX_VERIFY_ATTEMPTS) {
      await Otp.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        message: 'Too many attempts',
        errors: ['Too many incorrect attempts. This code has been invalidated. Please request a new one.']
      });
    }

    // Verify code match
    if (otpDoc.code !== cleanedCode) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = MAX_VERIFY_ATTEMPTS - otpDoc.attempts;

      return res.status(400).json({
        message: 'Incorrect verification code',
        errors: [`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`]
      });
    }

    // Code is valid! Consume and delete the OTP
    await Otp.deleteMany({ email: normalizedEmail });

    // Retrieve user and establish session
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        message: 'User account not found',
        errors: ['No administrator account found for this email.']
      });
    }

    // Save session payload
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    await new Promise((resolve, reject) => {
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
        } else {
          resolve();
        }
      });
    });

    console.log(`[AUTH] Admin successfully authenticated with OTP: ${user.email}`);

    return res.json({
      message: 'Authentication successful',
      user: req.session.user
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Resends a fresh OTP code to the administrator.
 * POST /api/v1/auth/resend-otp
 */
export async function resendOtp(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['Email is required.']
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        errors: ['No administrator account found with this email.']
      });
    }

    // Rate Limit Check: Max 8 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyCount = await Otp.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo }
    });

    if (hourlyCount >= MAX_OTP_PER_HOUR) {
      return res.status(429).json({
        message: 'Rate limit exceeded',
        errors: [`Maximum of ${MAX_OTP_PER_HOUR} OTP requests per hour reached. Please wait before trying again.`]
      });
    }

    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.deleteMany({ email: normalizedEmail });

    const otpDoc = new Otp({
      email: normalizedEmail,
      code,
      expiresAt
    });
    await otpDoc.save();

    await sendOtpEmail(normalizedEmail, code);

    console.log(`[OTP] Resent OTP code to ${normalizedEmail}`);

    return res.json({
      message: 'A new 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Logs out an administrator and destroys the active session cookie.
 * POST /api/v1/auth/logout
 */
export async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        message: 'Internal server error',
        errors: ['Failed to terminate administrator session.']
      });
    }

    res.clearCookie('connect.sid'); // Clear session cookie
    return res.json({
      message: 'Logged out successfully.'
    });
  });
}

/**
 * Returns session user data for persistent client-side state.
 * GET /api/v1/auth/me
 */
export async function me(req, res) {
  if (req.session && req.session.user) {
    return res.json({
      user: req.session.user
    });
  }
  return res.status(401).json({
    message: 'Unauthenticated',
    user: null
  });
}
