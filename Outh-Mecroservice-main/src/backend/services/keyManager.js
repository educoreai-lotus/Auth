const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Key Manager Module
 * 
 * Manages multiple JWT key pairs for production (GitHub Secrets) and development (local files).
 * Supports automatic key rotation by maintaining multiple active keys simultaneously.
 * 
 * Key Structure:
 * {
 *   activeKid: "auth-key-2025-01",
 *   keys: {
 *     "auth-key-2025-01": { privateKey: "...", publicKey: "..." },
 *     "auth-key-2024-12": { privateKey: "...", publicKey: "..." }
 *   }
 * }
 */

let keyStore = {
  activeKid: null,
  keys: {},
};

/**
 * Load a key pair from environment variables
 * @param {number} index - The key index (1, 2, 3, ...)
 * @returns {Object|null} - { kid, privateKey, publicKey } or null if not found
 */
const loadKeyFromEnv = (index) => {
  const privateKeyEnv = `JWT_PRIVATE_KEY_${index}`;
  const publicKeyEnv = `JWT_PUBLIC_KEY_${index}`;
  const kidEnv = `JWT_KEY_ID_${index}`;

  const privateKey = process.env[privateKeyEnv];
  const publicKey = process.env[publicKeyEnv];
  const kid = process.env[kidEnv] || `auth-key-${index}`;

  if (privateKey && publicKey) {
    return { kid, privateKey, publicKey };
  }

  return null;
};

/**
 * Load a key pair from local files (development mode)
 * @param {string} kid - The key ID
 * @param {string} privateKeyPath - Path to private key file
 * @param {string} publicKeyPath - Path to public key file
 * @returns {Object|null} - { kid, privateKey, publicKey } or null if not found
 */
const loadKeyFromFile = (kid, privateKeyPath, publicKeyPath) => {
  try {
    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      return { kid, privateKey, publicKey };
    }
  } catch (error) {
    logger.warn(`Failed to load key from files (${kid}):`, error.message);
  }

  return null;
};

/**
 * Initialize key manager - loads all available keys
 * Production: Reads from environment variables (JWT_PRIVATE_KEY_1, JWT_PUBLIC_KEY_1, etc.)
 * Development: Reads from local files (keys/private.pem, keys/public.pem)
 */
const initialize = () => {
  logger.info('Initializing Key Manager...');
  keyStore.keys = {};

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production mode: Load keys from environment variables
    logger.info('Loading keys from environment variables (production mode)');

    // Load keys from env vars (JWT_PRIVATE_KEY_1, JWT_PUBLIC_KEY_1, JWT_KEY_ID_1, etc.)
    let index = 1;
    let loadedCount = 0;

    while (true) {
      const keyPair = loadKeyFromEnv(index);
      if (!keyPair) {
        // No more keys found
        break;
      }

      keyStore.keys[keyPair.kid] = {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
      };

      logger.info(`Loaded key from env: ${keyPair.kid}`);
      loadedCount++;
      index++;
    }

    if (loadedCount === 0) {
      logger.warn('No keys found in environment variables. JWT operations will fail.');
    } else {
      logger.info(`Loaded ${loadedCount} key(s) from environment variables`);
    }
  } else {
    // Development mode: Load keys from local files
    logger.info('Loading keys from local files (development mode)');

    const defaultPrivateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || 
      path.join(__dirname, '../../keys/private.pem');
    const defaultPublicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || 
      path.join(__dirname, '../../keys/public.pem');
    const defaultKid = process.env.JWT_KEY_ID || 'auth-key-1';

    const keyPair = loadKeyFromFile(defaultKid, defaultPrivateKeyPath, defaultPublicKeyPath);

    if (keyPair) {
      keyStore.keys[keyPair.kid] = {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
      };
      logger.info(`Loaded key from file: ${keyPair.kid}`);
    } else {
      logger.warn('No keys found in local files. JWT operations will fail.');
    }
  }

  // Set active kid
  const activeKidFromEnv = process.env.JWT_ACTIVE_KID;
  if (activeKidFromEnv && keyStore.keys[activeKidFromEnv]) {
    keyStore.activeKid = activeKidFromEnv;
    logger.info(`Active key ID set to: ${keyStore.activeKid}`);
  } else if (Object.keys(keyStore.keys).length > 0) {
    // Use the first available key as active (or most recent if keys are sorted)
    const kids = Object.keys(keyStore.keys).sort().reverse(); // Sort descending to get newest first
    keyStore.activeKid = kids[0];
    logger.info(`Active key ID auto-selected: ${keyStore.activeKid}`);
  } else {
    logger.error('No active key ID available. JWT signing will fail.');
  }
};

/**
 * Get the active private key for signing
 * @returns {string|null} - The private key or null if not available
 */
const getActivePrivateKey = () => {
  if (!keyStore.activeKid || !keyStore.keys[keyStore.activeKid]) {
    return null;
  }

  return keyStore.keys[keyStore.activeKid].privateKey;
};

/**
 * Get the active key ID
 * @returns {string|null} - The active kid or null if not set
 */
const getActiveKid = () => {
  return keyStore.activeKid;
};

/**
 * Get a public key by kid
 * @param {string} kid - The key ID
 * @returns {string|null} - The public key or null if not found
 */
const getPublicKey = (kid) => {
  if (!kid || !keyStore.keys[kid]) {
    return null;
  }

  return keyStore.keys[kid].publicKey;
};

/**
 * Get all public keys (for JWKS endpoint)
 * @returns {Object} - Object mapping kid to publicKey
 */
const getAllPublicKeys = () => {
  const publicKeys = {};
  for (const [kid, keyPair] of Object.entries(keyStore.keys)) {
    publicKeys[kid] = keyPair.publicKey;
  }
  return publicKeys;
};

/**
 * Get all key IDs
 * @returns {string[]} - Array of all kid values
 */
const getAllKids = () => {
  return Object.keys(keyStore.keys);
};

/**
 * Add a new key pair (for key rotation)
 * @param {string} kid - The key ID
 * @param {string} privateKey - The private key
 * @param {string} publicKey - The public key
 * @param {boolean} setAsActive - Whether to set this key as active (default: false)
 */
const addKey = (kid, privateKey, publicKey, setAsActive = false) => {
  if (!kid || !privateKey || !publicKey) {
    throw new Error('kid, privateKey, and publicKey are required');
  }

  keyStore.keys[kid] = {
    privateKey,
    publicKey,
  };

  logger.info(`Added new key: ${kid}`);

  if (setAsActive) {
    keyStore.activeKid = kid;
    logger.info(`Set active key ID to: ${kid}`);
  }
};

/**
 * Remove a key (for purging expired keys)
 * @param {string} kid - The key ID to remove
 */
const removeKey = (kid) => {
  if (!kid || !keyStore.keys[kid]) {
    logger.warn(`Key not found for removal: ${kid}`);
    return;
  }

  // Don't remove the active key
  if (kid === keyStore.activeKid) {
    logger.warn(`Cannot remove active key: ${kid}`);
    return;
  }

  delete keyStore.keys[kid];
  logger.info(`Removed key: ${kid}`);
};

/**
 * Set the active key ID
 * @param {string} kid - The key ID to set as active
 */
const setActiveKid = (kid) => {
  if (!keyStore.keys[kid]) {
    throw new Error(`Key not found: ${kid}`);
  }

  keyStore.activeKid = kid;
  logger.info(`Active key ID changed to: ${kid}`);
};

/**
 * Get the current key store state (for debugging)
 * @returns {Object} - Current key store state
 */
const getKeyStoreState = () => {
  return {
    activeKid: keyStore.activeKid,
    availableKids: Object.keys(keyStore.keys),
    keyCount: Object.keys(keyStore.keys).length,
  };
};

// Initialize on module load
initialize();

module.exports = {
  initialize,
  getActivePrivateKey,
  getActiveKid,
  getPublicKey,
  getAllPublicKeys,
  getAllKids,
  addKey,
  removeKey,
  setActiveKid,
  getKeyStoreState,
};

