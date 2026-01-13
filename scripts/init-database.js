/**
 * Database Initialization Script
 * 
 * Creates the audit_logs collection with schema validation
 * Run this once after setting up MongoDB Atlas or local MongoDB
 * 
 * Usage: node scripts/init-database.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const auditLogsSchema = require('../src/database/schemas/audit_logs');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-audit';

async function initializeDatabase() {
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db();
    const collectionName = auditLogsSchema.collection;
    
    // Check if collection already exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    if (collections.length > 0) {
      console.log(`\n⚠ Collection '${collectionName}' already exists.`);
      console.log('Do you want to recreate it? This will delete all existing data.');
      console.log('Skipping collection creation. Using existing collection.');
      
      // Update existing collection validation (if possible)
      try {
        await db.command({
          collMod: collectionName,
          validator: auditLogsSchema.validation.$jsonSchema,
        });
        console.log('✓ Updated collection validation schema');
      } catch (error) {
        console.log('⚠ Could not update collection validation (this is okay)');
      }
    } else {
      // Create collection with validation
      console.log(`\nCreating collection '${collectionName}' with schema validation...`);
      await db.createCollection(collectionName, {
        validator: auditLogsSchema.validation.$jsonSchema,
      });
      console.log(`✓ Collection '${collectionName}' created successfully`);
    }
    
    // Verify collection
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();
    console.log(`✓ Collection verified. Current document count: ${count}`);
    
    console.log('\n✅ Database initialization complete!');
    console.log('\nSchema:');
    console.log('  - user_id (string, required)');
    console.log('  - email (string, required)');
    console.log('  - provider (string: google|github|linkedin)');
    console.log('  - company_id (string, optional)');
    console.log('  - login_at (date, required)');
    console.log('  - logout_at (date, optional)');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Check your MongoDB username and password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Check your MongoDB connection string and network access');
      console.error('   For Atlas: Ensure your IP is whitelisted in Network Access');
    } else if (error.message.includes('bad auth')) {
      console.error('\n💡 Authentication failed. Check username/password in connection string');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✓ Connection closed');
    }
  }
}

// Run initialization
initializeDatabase();

