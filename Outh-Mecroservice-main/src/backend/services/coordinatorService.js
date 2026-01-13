const axios = require('axios');
const logger = require('../utils/logger');

const COORDINATOR_URL = process.env.COORDINATOR_URL || 'http://localhost:3001';
const COORDINATOR_API_KEY = process.env.COORDINATOR_API_KEY;

const getUserByEmail = async (email, provider) => {
  // ============================================================
  // TEMP MOCK MODE - FOR LOCAL/DEV TESTING ONLY
  // TODO: Remove this mock when Coordinator/Directory is available
  // ============================================================
  // When COORDINATOR_MOCK_MODE=true, return dummy user for testing
  // This allows testing OAuth → JWT → audit flow without Coordinator
  // DO NOT enable in production - this is a temporary development tool
  if (process.env.COORDINATOR_MOCK_MODE === 'true') {
    logger.warn('[MOCK MODE] Coordinator mock enabled - returning dummy user', {
      email,
      provider,
      warning: 'This is a temporary mock for testing only',
    });
    
    return {
      user_id: 'dummy-user-123',
      organization_id: 'dummy-org-1',
      roles: ['user'],
    };
  }
  // ============================================================
  // END TEMP MOCK MODE
  // ============================================================

  try {
    const response = await axios.post(
      `${COORDINATOR_URL}/api/fill-content-metrics`,
      {
        requester_service: 'auth',
        payload: {
          action: 'get-user',
          email,
          provider,
        },
        response: {
          user_id: '',
          organization_id: '',
          roles: [],
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(COORDINATOR_API_KEY && { 'X-API-Key': COORDINATOR_API_KEY }),
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (response.data && response.data.user_id) {
      return {
        user_id: response.data.user_id,
        organization_id: response.data.organization_id,
        roles: response.data.roles || [],
      };
    }

    return null;
  } catch (error) {
    logger.error('Coordinator service error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // If Directory is unavailable, return null (will result in 403)
    if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
      logger.warn('Directory service unavailable, queuing request or returning safe fallback');
      return null;
    }

    // 404 or 403 means user not found/not authorized
    if (error.response?.status === 404 || error.response?.status === 403) {
      return null;
    }

    throw error;
  }
};

module.exports = {
  getUserByEmail,
};

