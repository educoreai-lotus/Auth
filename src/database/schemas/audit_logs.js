/**
 * MongoDB Schema for audit_logs collection
 * 
 * This is the only collection in the Auth microservice database.
 * Used only for login audit tracking.
 * One document represents one login lifecycle.
 */

const auditLogsSchema = {
  collection: 'audit_logs',
  validation: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'email', 'login_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'UUID from Directory service',
        },
        email: {
          bsonType: 'string',
          description: 'Verified email from OAuth provider',
        },
        provider: {
          bsonType: 'string',
          enum: ['google', 'github', 'linkedin'],
          description: 'OAuth provider used',
        },
        company_id: {
          bsonType: 'string',
          description: 'Company/Organization ID (optional)',
        },
        login_at: {
          bsonType: 'date',
          description: 'Login timestamp (UTC)',
        },
        logout_at: {
          bsonType: 'date',
          description: 'Logout timestamp (UTC, optional)',
        },
      },
    },
  },
};

module.exports = auditLogsSchema;

