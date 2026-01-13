const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');

/**
 * Coordinator API endpoint
 * POST /api/fill-content-metrics
 * 
 * Handles requests from Coordinator service.
 * Request body arrives as a JSON string that must be explicitly parsed.
 */
router.post('/fill-content-metrics', coordinatorController.handleCoordinatorRequest);

module.exports = router;

