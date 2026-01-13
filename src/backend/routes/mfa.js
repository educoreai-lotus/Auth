const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middlewares/rateLimiter');
const validateJWT = require('../middlewares/validateJWT');
const mfaController = require('../controllers/mfaController');

// MFA setup (requires authentication)
router.post('/setup', validateJWT, mfaController.setup);

// MFA verification
router.post('/verify', authRateLimiter, mfaController.verify);

module.exports = router;

