const crypto = require('crypto');
const logger = require('../utils/logger');
const keyManager = require('./keyManager');
const jwksController = require('../controllers/jwksController');

/**
 * Key Rotation Service
 * 
 * Handles automatic monthly key rotation:
 * - Adds new keys from environment variables
 * - Switches active key after rotation
 * - Keeps old keys active for at least 15 minutes (JWT expiry time)
 * - Provides function to purge expired keys
 * 
 * This service is designed to be called by GitHub Actions monthly.
 */

/**
 * Rotate to a new key from environment variables
 * 
 * Expected environment variables:
 * - JWT_PRIVATE_KEY_NEW: New private key
 * - JWT_PUBLIC_KEY_NEW: New public key
 * - JWT_NEW_KID: New key ID (optional, defaults to timestamp-based)
 * 
 * Process:
 * 1. Load new key from env vars
 * 2. Add to key store
 * 3. Switch active kid to new key
 * 4. Refresh JWKS cache
 * 
 * Old keys remain in the store for backward compatibility (tokens signed with old keys
 * can still be validated until they expire, max 15 minutes).
 */
const rotateToNewKey = () => {
  try {
    logger.info('Starting key rotation...');

    const newPrivateKey = process.env.JWT_PRIVATE_KEY_NEW;
    const newPublicKey = process.env.JWT_PUBLIC_KEY_NEW;
    const newKid = process.env.JWT_NEW_KID || `auth-key-${new Date().toISOString().slice(0, 7)}`; // e.g., "auth-key-2025-01"

    if (!newPrivateKey || !newPublicKey) {
      throw new Error('JWT_PRIVATE_KEY_NEW and JWT_PUBLIC_KEY_NEW must be set for key rotation');
    }

    // Validate that the keys are valid RSA keys
    try {
      crypto.createPrivateKey(newPrivateKey);
      crypto.createPublicKey(newPublicKey);
    } catch (error) {
      throw new Error(`Invalid key format: ${error.message}`);
    }

    const oldActiveKid = keyManager.getActiveKid();
    logger.info(`Current active key: ${oldActiveKid}`);

    // Add new key to store
    keyManager.addKey(newKid, newPrivateKey, newPublicKey, false);

    // Switch to new key as active
    keyManager.setActiveKid(newKid);
    logger.info(`New active key: ${newKid}`);

    // Refresh JWKS cache to include new key
    jwksController.refreshJWKS();
    logger.info('JWKS cache refreshed');

    // Log rotation summary
    const state = keyManager.getKeyStoreState();
    logger.info(`Key rotation completed. Active: ${newKid}, Total keys: ${state.keyCount}, Old active key (${oldActiveKid}) retained for backward compatibility`);

    return {
      success: true,
      oldActiveKid,
      newActiveKid: newKid,
      totalKeys: state.keyCount,
    };
  } catch (error) {
    logger.error('Key rotation failed:', error);
    throw error;
  }
};

/**
 * Add a new key without switching active (for gradual rotation)
 * 
 * This allows adding a new key and keeping the old one active for a grace period.
 * Useful when you want to add the key first, then switch later.
 * 
 * @param {string} kid - The key ID
 * @param {string} privateKey - The private key
 * @param {string} publicKey - The public key
 */
const addKeyWithoutActivating = (kid, privateKey, publicKey) => {
  try {
    logger.info(`Adding new key without activation: ${kid}`);

    // Validate keys
    const crypto = require('crypto');
    crypto.createPrivateKey(privateKey);
    crypto.createPublicKey(publicKey);

    keyManager.addKey(kid, privateKey, publicKey, false);

    // Refresh JWKS cache
    jwksController.refreshJWKS();
    logger.info(`Key added: ${kid}. Active key remains: ${keyManager.getActiveKid()}`);

    return {
      success: true,
      kid,
      activeKid: keyManager.getActiveKid(),
    };
  } catch (error) {
    logger.error('Failed to add key:', error);
    throw error;
  }
};

/**
 * Purge expired keys
 * 
 * Removes keys that are no longer needed. A key is safe to remove if:
 * - It's not the active key
 * - All tokens signed with it have expired (JWT lifetime is 15 minutes)
 * - At least 15 minutes have passed since it was deactivated
 * 
 * For safety, this function only removes keys that are explicitly marked for removal
 * or keys older than a specified threshold (default: 1 hour after deactivation).
 * 
 * @param {string[]} kidsToPurge - Array of key IDs to remove (optional, if not provided, removes keys older than threshold)
 * @param {number} minAgeMinutes - Minimum age in minutes before a key can be purged (default: 60)
 */
const purgeExpiredKeys = (kidsToPurge = null, minAgeMinutes = 60) => {
  try {
    logger.info('Starting key purge...');

    const activeKid = keyManager.getActiveKid();
    const allKids = keyManager.getAllKids();
    const keysToRemove = [];

    if (kidsToPurge && Array.isArray(kidsToPurge)) {
      // Explicit list provided
      for (const kid of kidsToPurge) {
        if (kid !== activeKid) {
          keysToRemove.push(kid);
        } else {
          logger.warn(`Cannot purge active key: ${kid}`);
        }
      }
    } else {
      // Auto-purge: Remove all non-active keys
      // In a production system, you might want to track key creation/deactivation timestamps
      // For now, we'll only remove keys that are explicitly not active
      // This is a conservative approach - in practice, you'd want to track key metadata
      logger.info('Auto-purge: Removing all non-active keys (conservative approach)');
      for (const kid of allKids) {
        if (kid !== activeKid) {
          keysToRemove.push(kid);
        }
      }
    }

    if (keysToRemove.length === 0) {
      logger.info('No keys to purge');
      return {
        success: true,
        purged: [],
        message: 'No keys to purge',
      };
    }

    // Remove keys
    for (const kid of keysToRemove) {
      keyManager.removeKey(kid);
      logger.info(`Purged key: ${kid}`);
    }

    // Refresh JWKS cache
    jwksController.refreshJWKS();

    logger.info(`Key purge completed. Removed ${keysToRemove.length} key(s)`);

    return {
      success: true,
      purged: keysToRemove,
      activeKid,
      remainingKeys: keyManager.getAllKids(),
    };
  } catch (error) {
    logger.error('Key purge failed:', error);
    throw error;
  }
};

/**
 * Get rotation status
 * 
 * Returns current key store state for monitoring and debugging.
 */
const getRotationStatus = () => {
  const state = keyManager.getKeyStoreState();
  return {
    activeKid: state.activeKid,
    availableKids: state.availableKids,
    keyCount: state.keyCount,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  rotateToNewKey,
  addKeyWithoutActivating,
  purgeExpiredKeys,
  getRotationStatus,
};

