const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const keyManager = require('./keyManager');

/**
 * JWT Service
 * 
 * Generates JWT tokens using the active private key from keyManager.
 * Tokens include the key ID (kid) in the header for proper validation.
 */

const generateToken = (claims) => {
  // Get active private key from key manager
  const privateKey = keyManager.getActivePrivateKey();
  const activeKid = keyManager.getActiveKid();

  if (!privateKey) {
    throw new Error('JWT private key not configured');
  }

  if (!activeKid) {
    throw new Error('JWT active key ID not configured');
  }

  const expiryMinutes = parseInt(process.env.JWT_EXPIRY_MINUTES || '15', 10);
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    sub: claims.sub, // user_id
    email: claims.email,
    organization_id: claims.organization_id,
    roles: claims.roles || [],
    iat: now,
    exp: now + expiryMinutes * 60,
    iss: process.env.JWT_ISSUER || 'auth-microservice',
    aud: process.env.JWT_AUDIENCE || 'educore-ai',
  };

  // Sign token with active key and include kid in header
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: activeKid, // Include kid in JWT header for proper key selection during validation
  });
};

module.exports = {
  generateToken,
};

