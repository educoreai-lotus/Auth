const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const logger = require('../utils/logger');

// In-memory storage for MFA secrets (in production, use encrypted storage)
// This is temporary - should be moved to Directory service or encrypted DB
const mfaSecrets = new Map();

const setup = async (req, res) => {
  try {
    const { user } = req; // From validateJWT middleware
    const { type = 'totp' } = req.body;

    if (type !== 'totp' && type !== 'webauthn') {
      return res.status(400).json({ error: 'Invalid MFA type. Use "totp" or "webauthn"' });
    }

    if (type === 'totp') {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `EduCore AI (${user.email})`,
        issuer: 'EduCore AI',
      });

      // Store secret (temporary - should be in Directory or encrypted storage)
      mfaSecrets.set(user.user_id, {
        secret: secret.base32,
        type: 'totp',
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      res.json({
        secret: secret.base32,
        qr_code: qrCodeUrl,
        manual_entry_key: secret.base32,
      });
    } else if (type === 'webauthn') {
      // WebAuthn setup would go here
      // For now, return not implemented
      res.status(501).json({ error: 'WebAuthn not yet implemented' });
    }
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
};

const verify = async (req, res) => {
  try {
    const { token, user_id } = req.body;

    if (!token || !user_id) {
      return res.status(400).json({ error: 'Token and user_id are required' });
    }

    const mfaData = mfaSecrets.get(user_id);
    if (!mfaData || mfaData.type !== 'totp') {
      return res.status(400).json({ error: 'MFA not set up for this user' });
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: mfaData.secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps of tolerance
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }

    res.json({ verified: true });
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
};

module.exports = {
  setup,
  verify,
};

