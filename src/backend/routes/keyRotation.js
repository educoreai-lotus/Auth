const express = require('express');
const router = express.Router();
const keyRotationService = require('../services/keyRotationService');
const logger = require('../utils/logger');

/**
 * Key Rotation Routes
 * 
 * These endpoints are used for key rotation operations.
 * In production, these should be secured (e.g., require admin token or secret).
 * 
 * For GitHub Actions integration:
 * - Call POST /key-rotation/rotate with JWT_PRIVATE_KEY_NEW, JWT_PUBLIC_KEY_NEW, JWT_NEW_KID env vars
 * - Call POST /key-rotation/purge to remove expired keys after grace period
 */

/**
 * POST /key-rotation/rotate
 * 
 * Rotate to a new key from environment variables.
 * Requires: JWT_PRIVATE_KEY_NEW, JWT_PUBLIC_KEY_NEW, JWT_NEW_KID (optional)
 * 
 * TODO: Add authentication/authorization (e.g., require admin token or secret header)
 */
router.post('/rotate', async (req, res) => {
  try {
    logger.info('Key rotation requested via API');
    
    const result = keyRotationService.rotateToNewKey();
    
    res.json({
      success: true,
      message: 'Key rotation completed successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Key rotation API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Key rotation failed',
    });
  }
});

/**
 * POST /key-rotation/purge
 * 
 * Purge expired keys.
 * Body (optional): { kidsToPurge: ["auth-key-2024-12"], minAgeMinutes: 60 }
 * 
 * TODO: Add authentication/authorization
 */
router.post('/purge', async (req, res) => {
  try {
    logger.info('Key purge requested via API');
    
    const { kidsToPurge, minAgeMinutes } = req.body;
    const result = keyRotationService.purgeExpiredKeys(kidsToPurge, minAgeMinutes);
    
    res.json({
      success: true,
      message: 'Key purge completed successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Key purge API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Key purge failed',
    });
  }
});

/**
 * GET /key-rotation/status
 * 
 * Get current key rotation status.
 * Useful for monitoring and debugging.
 */
router.get('/status', (req, res) => {
  try {
    const status = keyRotationService.getRotationStatus();
    res.json(status);
  } catch (error) {
    logger.error('Key rotation status API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rotation status',
    });
  }
});

module.exports = router;

