const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const keyManager = require('../services/keyManager');

/**
 * JWT Validation Middleware
 * 
 * Validates JWT tokens by:
 * 1. Extracting kid from token header
 * 2. Finding matching public key by kid
 * 3. If kid not found, trying all available keys (backward compatibility)
 * 
 * This ensures tokens signed with old keys remain valid during key rotation.
 */

const validateJWT = (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Decode token header to get kid (without verification)
    let tokenKid = null;
    try {
      const decodedHeader = jwt.decode(token, { complete: true });
      if (decodedHeader && decodedHeader.header && decodedHeader.header.kid) {
        tokenKid = decodedHeader.header.kid;
      }
    } catch (error) {
      logger.debug('Failed to decode token header:', error.message);
    }

    // Try to get public key by kid first
    let publicKey = null;
    if (tokenKid) {
      publicKey = keyManager.getPublicKey(tokenKid);
      if (publicKey) {
        logger.debug(`Using key for validation: ${tokenKid}`);
      }
    }

    // If kid-based lookup failed, try all keys (backward compatibility)
    // This handles cases where:
    // - Token was signed before kid was added to header
    // - Key was rotated but token is still valid
    if (!publicKey) {
      const allPublicKeys = keyManager.getAllPublicKeys();
      const allKids = Object.keys(allPublicKeys);

      if (allKids.length === 0) {
        logger.error('No public keys available for JWT validation');
        return res.status(500).json({ error: 'Authentication service misconfigured' });
      }

      // Try each key until one works
      let decoded = null;
      let lastError = null;

      for (const kid of allKids) {
        try {
          const key = allPublicKeys[kid];
          decoded = jwt.verify(token, key, {
            algorithms: ['RS256'],
            issuer: process.env.JWT_ISSUER || 'auth-microservice',
            audience: process.env.JWT_AUDIENCE || 'educore-ai',
          });
          publicKey = key; // Found valid key
          logger.debug(`Token validated with key: ${kid}`);
          break;
        } catch (error) {
          lastError = error;
          // Continue trying other keys
        }
      }

      if (!decoded) {
        // None of the keys worked
        if (lastError) {
          throw lastError;
        } else {
          throw new Error('Token validation failed with all available keys');
        }
      }

      // Attach user info to request
      req.user = {
        user_id: decoded.sub,
        email: decoded.email,
        organization_id: decoded.organization_id,
        roles: decoded.roles || [],
      };

      next();
      return;
    }

    // Verify token with the specific key
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER || 'auth-microservice',
      audience: process.env.JWT_AUDIENCE || 'educore-ai',
    });

    // Attach user info to request
    req.user = {
      user_id: decoded.sub,
      email: decoded.email,
      organization_id: decoded.organization_id,
      roles: decoded.roles || [],
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('JWT validation error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = validateJWT;

