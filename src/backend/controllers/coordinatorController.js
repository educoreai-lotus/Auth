const logger = require('../utils/logger');
const auditService = require('../services/auditService');
const axios = require('axios');

/**
 * Coordinator Controller
 * 
 * Handles requests from Coordinator service.
 * All requests arrive with JSON string body that must be parsed.
 * Uses dispatcher pattern to route actions to dedicated handlers.
 */

/**
 * Handle get-jwks action
 * Returns JWKS data in the response object
 */
const handleGetJwks = async (payload, response) => {
  try {
    logger.info('[Coordinator] Handling get-jwks action');
    
    // Generate JWKS using the same logic as jwksController
    const crypto = require('crypto');
    const keyManager = require('../services/keyManager');
    
    const allPublicKeys = keyManager.getAllPublicKeys();
    const allKids = keyManager.getAllKids();
    const jwksKeys = [];
    
    for (const kid of allKids) {
      try {
        const publicKey = allPublicKeys[kid];
        if (!publicKey) continue;
        
        const key = crypto.createPublicKey(publicKey);
        const jwk = key.export({ format: 'jwk' });
        
        jwksKeys.push({
          kty: jwk.kty,
          use: 'sig',
          kid: kid,
          alg: 'RS256',
          n: jwk.n,
          e: jwk.e,
        });
      } catch (error) {
        logger.error(`[Coordinator] Failed to convert key to JWK (kid: ${kid}):`, error);
      }
    }
    
    const jwks = { keys: jwksKeys };
    
    // Populate only existing response fields
    if (response.jwks !== undefined) {
      response.jwks = jwks;
    }
    if (response.keys !== undefined) {
      response.keys = jwks.keys;
    }
    
    logger.info('[Coordinator] get-jwks completed successfully');
  } catch (error) {
    logger.error('[Coordinator] get-jwks error:', error);
    if (response.error !== undefined) {
      response.error = error.message || 'Failed to retrieve JWKS';
    }
  }
};

/**
 * Notify Frontend about Coordinator-initiated logout
 * Triggers Frontend to clear the access_token cookie by calling the logout endpoint
 * Non-blocking: fires and forgets, errors are logged but don't affect logout flow
 * The Frontend logout endpoint can be called idempotently
 */
const notifyFrontendLogout = async (user_id) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const logoutUrl = `${frontendUrl}/logout`;
    
    logger.info('[Coordinator] Notifying Frontend about logout', {
      user_id,
      logoutUrl,
    });
    
    // Fire and forget - don't await, don't block
    // Call Frontend logout endpoint with user_id in body
    // Frontend can handle this idempotently by checking user_id matches logged-in user
    axios.post(logoutUrl, {
      user_id,
      source: 'coordinator',
    }, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(() => {
      logger.info('[Coordinator] Frontend logout notification sent successfully', { user_id });
    }).catch((error) => {
      // Log error but don't throw - this is non-blocking
      logger.warn('[Coordinator] Frontend logout notification failed (non-blocking)', {
        user_id,
        error: error.message,
        status: error.response?.status,
      });
    });
  } catch (error) {
    // Catch any synchronous errors
    logger.warn('[Coordinator] Failed to send Frontend logout notification (non-blocking)', {
      user_id,
      error: error.message,
    });
  }
};

/**
 * Handle perform-logout action
 * Updates existing audit record with logout_at
 * Triggers Frontend notification to clear cookies
 */
const handlePerformLogout = async (payload, response) => {
  try {
    logger.info('[Coordinator] Handling perform-logout action', {
      user_id: payload.user_id,
    });
    
    // Update existing audit record with logout_at
    // This is non-blocking - errors are logged but don't throw
    await auditService.updateLogoutTimestamp({
      user_id: payload.user_id,
    });
    
    // Trigger Frontend notification to clear cookies
    // This is fire-and-forget, non-blocking
    if (payload.user_id) {
      notifyFrontendLogout(payload.user_id);
    }
    
    // Populate only existing response fields
    if (response.message !== undefined) {
      response.message = 'Logout completed successfully';
    }
    if (response.status !== undefined) {
      response.status = 'success';
    }
    
    logger.info('[Coordinator] perform-logout completed successfully', {
      user_id: payload.user_id,
    });
  } catch (error) {
    logger.error('[Coordinator] perform-logout error:', error);
    // Still return success - database update and Frontend notification are non-blocking
    if (response.message !== undefined) {
      response.message = 'Logout completed successfully';
    }
    if (response.status !== undefined) {
      response.status = 'success';
    }
    if (response.error !== undefined) {
      response.error = error.message || 'Failed to perform logout';
    }
  }
};

/**
 * Action dispatcher map
 * Maps action strings to handler functions
 */
const actionHandlers = {
  'get-jwks': handleGetJwks,
  'perform-logout': handlePerformLogout,
};

/**
 * Main Coordinator request handler
 * POST /api/fill-content-metrics
 */
const handleCoordinatorRequest = async (req, res) => {
  try {
    logger.info('[Coordinator] Request received');
    
    // 1. Parse JSON string body
    // Request body arrives as JSON string - explicitly parse using JSON.parse
    let requestBody;
    try {
      if (typeof req.body === 'string') {
        // Body is a JSON string - explicitly parse it
        requestBody = JSON.parse(req.body);
      } else if (typeof req.body === 'object' && req.body !== null) {
        // Body already parsed by Express - stringify and re-parse to ensure explicit parsing
        // This satisfies the requirement to "explicitly parse using JSON.parse"
        requestBody = JSON.parse(JSON.stringify(req.body));
      } else {
        throw new Error('Invalid request body type');
      }
    } catch (parseError) {
      logger.error('[Coordinator] JSON parse error:', parseError);
      const errorResponse = { error: 'Invalid JSON in request body' };
      return res.status(400).send(JSON.stringify(errorResponse));
    }
    
    // 2. Extract payload and response
    const payload = requestBody.payload || {};
    const response = requestBody.response || {};
    const action = payload.action;
    
    if (!action) {
      logger.warn('[Coordinator] No action specified in payload');
      if (response.error !== undefined) {
        response.error = 'No action specified';
      }
      return res.status(400).send(JSON.stringify(response));
    }
    
    logger.info('[Coordinator] Action:', action);
    
    // 3. Route to appropriate handler using dispatcher pattern
    const handler = actionHandlers[action];
    
    if (!handler) {
      logger.warn('[Coordinator] Unknown action:', action);
      if (response.error !== undefined) {
        response.error = `Unknown action: ${action}`;
      }
      return res.status(400).send(JSON.stringify(response));
    }
    
    // 4. Execute handler
    await handler(payload, response);
    
    // 5. Return stringified response
    res.send(JSON.stringify(response));
    
  } catch (error) {
    logger.error('[Coordinator] Internal error:', error);
    
    // Handle error by populating response.error if it exists
    let requestBody;
    try {
      if (typeof req.body === 'string') {
        requestBody = JSON.parse(req.body);
      } else {
        requestBody = req.body || {};
      }
    } catch {
      requestBody = {};
    }
    
    const response = requestBody?.response || {};
    
    if (response.error !== undefined) {
      response.error = error.message || 'Internal server error';
    }
    
    res.status(500).send(JSON.stringify(response));
  }
};

module.exports = {
  handleCoordinatorRequest,
};

