const crypto = require('crypto');
const logger = require('../utils/logger');
const keyManager = require('../services/keyManager');

/**
 * JWKS Controller
 * 
 * Provides JSON Web Key Set (JWKS) endpoint that returns all public keys.
 * This allows other services to validate JWTs signed with any active key.
 * 
 * JWKS is dynamically generated from all keys in keyManager, ensuring
 * backward compatibility during key rotation.
 */

// Cache JWKS (refresh on startup or key rotation)
let jwksCache = null;

/**
 * Generate JWKS from all public keys in keyManager
 * 
 * Converts all public keys to JWK format and includes them in the JWKS.
 * Each key has a unique kid for proper key selection during JWT validation.
 */
const generateJWKS = () => {
  try {
    const allPublicKeys = keyManager.getAllPublicKeys();
    const allKids = keyManager.getAllKids();

    if (allKids.length === 0) {
      logger.warn('No keys available for JWKS generation');
      return { keys: [] };
    }

    const jwksKeys = [];

    // Convert each public key to JWK format
    for (const kid of allKids) {
      try {
        const publicKey = allPublicKeys[kid];
        if (!publicKey) {
          logger.warn(`Public key not found for kid: ${kid}`);
          continue;
        }

        // Convert PEM to JWK format
        const key = crypto.createPublicKey(publicKey);
        const jwk = key.export({ format: 'jwk' });

        // Add to JWKS
        jwksKeys.push({
          kty: jwk.kty,
          use: 'sig',
          kid: kid,
          alg: 'RS256',
          n: jwk.n,
          e: jwk.e,
        });

        logger.debug(`Added key to JWKS: ${kid}`);
      } catch (error) {
        logger.error(`Failed to convert key to JWK (kid: ${kid}):`, error);
        // Continue with other keys
      }
    }

    const jwks = {
      keys: jwksKeys,
    };

    logger.info(`Generated JWKS with ${jwksKeys.length} key(s)`);
    return jwks;
  } catch (error) {
    logger.error('Failed to generate JWKS:', error);
    return { keys: [] };
  }
};

// Initialize cache on module load
jwksCache = generateJWKS();

/**
 * GET /.well-known/jwks.json
 * 
 * Returns the JSON Web Key Set containing all public keys.
 * JWKS is cached and refreshed automatically when keys are rotated.
 */
const getJWKS = (req, res) => {
  try {
    // Set cache headers (24 hours)
    // Note: In production, you might want shorter cache times during key rotation
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(jwksCache);
  } catch (error) {
    logger.error('JWKS endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve JWKS' });
  }
};

/**
 * Refresh JWKS cache
 * 
 * Called automatically when keys are rotated to ensure JWKS is up-to-date.
 * This allows JWKS to update dynamically without requiring a server restart.
 */
const refreshJWKS = () => {
  logger.info('Refreshing JWKS cache...');
  jwksCache = generateJWKS();
  logger.info('JWKS cache refreshed');
};

module.exports = {
  getJWKS,
  refreshJWKS,
};

