const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middlewares/rateLimiter');
const authController = require('../controllers/authController');

// OAuth login initiation
// Note: router is mounted at '/login' in app.js, so this becomes '/login/:provider'
router.get('/:provider', authRateLimiter, authController.initiateOAuth);

// OAuth callback
// Note: router is mounted at '/auth' in app.js, so this becomes '/auth/:provider/callback'
router.get('/:provider/callback', authRateLimiter, authController.handleCallback);

// Silent refresh
router.get('/silent-refresh', authController.silentRefresh);

// Logout
router.post('/logout', authController.logout);

module.exports = router;

