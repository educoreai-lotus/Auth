# Auth Microservice - EduCore AI Platform

Centralized authentication microservice for the EduCore AI platform, providing OAuth2-based authentication, JWT token management, and multi-factor authentication.

## Overview

The Auth Microservice provides:
- **OAuth-only authentication** via Google, GitHub, and LinkedIn
- **Stateless JWT-based sessions** (15-minute RS256-signed tokens)
- **Multi-factor authentication** (TOTP, WebAuthn)
- **Multi-tenant RBAC** via organization_id and roles in JWT claims
- **Audit logging** for compliance and security monitoring

## Architecture

- **Backend**: Node.js + Express
- **Frontend**: React (JSX only, no TypeScript)
- **Database**: MongoDB (audit logs only)
- **Authentication**: OAuth2/OpenID Connect
- **Tokens**: RS256-signed JWTs (15 min lifetime, no refresh tokens)

## Project Structure

```
auth-microservice/
├── docs/                    # Documentation
├── infra/                   # Infrastructure (K8s, Terraform)
├── src/
│   ├── backend/            # Express.js backend
│   ├── frontend/           # React frontend
│   └── database/          # MongoDB schemas and migrations
├── tests/                  # Test suites
├── docker/                 # Dockerfiles
├── scripts/                # Utility scripts
└── ROADMAP.json           # Development roadmap
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OAuth credentials for Google, GitHub, LinkedIn

### Installation

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd src/frontend && npm install && cd ../..
```

### Generate RSA Keys

```bash
npm run generate-keys
```

This creates `keys/private.pem` and `keys/public.pem` for JWT signing.

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://localhost:27017/auth-audit

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_EXPIRY_MINUTES=15

# Coordinator
COORDINATOR_URL=http://localhost:3001
COORDINATOR_API_KEY=your_api_key
```

### Running the Application

```bash
# Backend (Terminal 1)
npm run dev:backend

# Frontend (Terminal 2)
npm run dev:frontend
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## API Endpoints

### Internal APIs

- `GET /login/{provider}` - Initiate OAuth flow (google, github, linkedin)
- `GET /auth/{provider}/callback` - OAuth callback handler
- `GET /silent-refresh` - Silent re-authentication
- `POST /logout` - Logout and clear session
- `GET /.well-known/jwks.json` - Public JWKS endpoint

### MFA Endpoints

- `POST /mfa/setup` - Setup MFA (TOTP/WebAuthn)
- `POST /mfa/verify` - Verify MFA code

## Development

This project follows:
- **Onion Architecture** / Clean Code principles
- **SOLID** / DRY / KISS principles
- **TCR-enhanced TDD** (Test → Commit → Revert)
- **JavaScript only** (no TypeScript)

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Documentation

See `/docs` for detailed documentation:
- `requirements.md` - Full requirements specification
- `Design_And_Architecture-AUTH.md` - Architecture diagrams
- `Implementation-AUTH.md` - Implementation guide
- `Testing_And_Verification-AUTH.md` - Testing strategy
- `Code_Review_And_Deployment-AUTH.md` - **Deployment guide** ⭐

## Deployment

### Quick Start

1. **MongoDB Atlas Setup**
   - Create cluster and database user
   - Configure network access
   - Get connection string

2. **Generate RSA Keys**
   ```bash
   npm run generate-keys
   ```
   Store private key securely (KMS/Secrets Manager)

3. **Update OAuth Redirect URIs**
   - Google: Add production callback URL
   - GitHub: Update authorization callback URL
   - LinkedIn: Add redirect URL

4. **Deploy Backend (Railway)**
   - Connect GitHub repository
   - Set environment variables
   - Deploy

5. **Deploy Frontend (Vercel)**
   - Connect GitHub repository
   - Configure build settings
   - Set environment variables
   - Deploy

### Detailed Deployment Guide

See [`docs/Code_Review_And_Deployment-AUTH.md`](docs/Code_Review_And_Deployment-AUTH.md) for:
- Complete step-by-step instructions
- Environment variable configuration
- Security best practices
- Monitoring setup
- Troubleshooting guide

### Deployment Checklist

Use [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) to ensure all steps are completed.

## Key Features

### Stateless Design
- No session storage (Redis, database)
- No refresh tokens
- No revocation lists
- JWT-only authentication

### Security
- RS256 asymmetric signing
- HttpOnly, Secure, SameSite=Strict cookies
- Rate limiting
- CSRF protection
- PKCE for OAuth flows

### Multi-Tenancy
- organization_id in JWT claims
- Roles array in JWT
- Logical isolation per organization

## License

Proprietary - EduCore AI Platform
