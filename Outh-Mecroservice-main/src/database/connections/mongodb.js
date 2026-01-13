const { MongoClient } = require('mongodb');
const logger = require('../../backend/utils/logger');
const auditLogsSchema = require('../schemas/audit_logs');

let client = null;
let db = null;

const connect = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-audit';
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db();
    logger.info('MongoDB connected');

    // Create indexes
    await createIndexes();

    // Create collection with validation (if not exists)
    await createCollectionWithValidation();

    return db;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    const collection = db.collection(auditLogsSchema.collection);
    
    for (const index of auditLogsSchema.indexes) {
      await collection.createIndex(index.keys, index.options);
    }
    
    logger.info('MongoDB indexes created');
  } catch (error) {
    logger.error('Failed to create indexes:', error);
  }
};

const createCollectionWithValidation = async () => {
  try {
    const collections = await db.listCollections({ name: auditLogsSchema.collection }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection(auditLogsSchema.collection, {
        validator: auditLogsSchema.validation.$jsonSchema,
      });
      logger.info('audit_logs collection created with validation');
    }
  } catch (error) {
    logger.error('Failed to create collection with validation:', error);
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('MongoDB not connected. Call connect() first.');
  }
  return db;
};

const close = async () => {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
};

// Graceful shutdown
process.on('SIGTERM', close);
process.on('SIGINT', close);

module.exports = {
  connect,
  getDb,
  close,
};

