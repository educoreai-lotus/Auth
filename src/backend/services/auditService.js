const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

let db = null;
let client = null;

// Initialize MongoDB connection
const initializeDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-audit';
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db();
    logger.info('MongoDB connected for audit logs');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
  }
};

// Initialize on module load
initializeDB();

/**
 * Log login event
 * Inserts one new document representing a login lifecycle
 */
const logLogin = async (data) => {
  try {
    if (!db) {
      logger.warn('MongoDB not connected, skipping audit log');
      return;
    }

    const loginRecord = {
      user_id: data.user_id,
      email: data.email,
      provider: data.provider,
      company_id: data.company_id || data.organization_id, // Map organization_id to company_id
      login_at: new Date(),
    };

    await db.collection('audit_logs').insertOne(loginRecord);
    logger.info('Login audit log created', { user_id: data.user_id, email: data.email });
  } catch (error) {
    logger.error('Failed to log login event:', error);
    // Don't throw - audit logging should not break authentication flow
  }
};

/**
 * Update logout timestamp
 * Finds the most recent login document for the user and adds logout_at
 * Never creates a new document
 */
const updateLogoutTimestamp = async (data) => {
  try {
    if (!db) {
      logger.warn('MongoDB not connected, skipping logout timestamp update');
      return;
    }

    if (!data.user_id) {
      logger.warn('No user_id provided for logout timestamp update');
      return;
    }

    // Find the most recent login document for this user
    const loginRecord = await db.collection('audit_logs')
      .findOne(
        {
          user_id: data.user_id,
        },
        {
          sort: { login_at: -1 }, // Most recent first
        }
      );

    if (!loginRecord) {
      logger.warn('No login record found for user', { user_id: data.user_id });
      return;
    }

    // Update the document by adding logout_at
    await db.collection('audit_logs').updateOne(
      { _id: loginRecord._id },
      {
        $set: {
          logout_at: new Date(),
        },
      }
    );

    logger.info('Logout timestamp updated', {
      user_id: data.user_id,
      login_at: loginRecord.login_at,
    });
  } catch (error) {
    logger.error('Failed to update logout timestamp:', error);
    // Don't throw - allow caller to handle gracefully
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
});

module.exports = {
  logLogin,
  updateLogoutTimestamp,
};
