const express = require('express');
const router = express.Router();
const jwksController = require('../controllers/jwksController');

// JWKS endpoint (public, no auth required)
router.get('/jwks.json', jwksController.getJWKS);

module.exports = router;

