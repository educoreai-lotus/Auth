# Auth Microservice - Requirements Document

This document contains the complete requirements specification for the Auth Microservice.

> **Note**: This is a reference document. For the full detailed requirements, see the main requirements file provided at project initialization.

## Core Requirements Summary

### Authentication
- **OAuth-only**: Google, GitHub, LinkedIn (no username/password)
- **Stateless JWT**: 15-minute RS256-signed tokens
- **No refresh tokens**: Session maintained via silent OAuth re-authentication
- **Multi-factor authentication**: TOTP, optional SMS, WebAuthn

### Architecture
- **Stateless design**: No session storage, no Redis, no revocation lists
- **Multi-tenant**: organization_id and roles[] in JWT claims
- **Coordinator integration**: All inter-service communication via Coordinator
- **Audit logging**: MongoDB collection for compliance (append-only)

### Security
- RS256 asymmetric signing (private key in KMS)
- HttpOnly, Secure, SameSite=Strict cookies
- Rate limiting and brute-force protection
- DDoS protection, SQL injection prevention, prompt injection defense

### Technology Stack
- **Backend**: Node.js + Express
- **Frontend**: React (JSX only, no TypeScript)
- **Database**: MongoDB (audit logs only)
- **Styling**: Tailwind CSS (100% from design-config.local.json)

## API Endpoints

### Internal APIs
- `GET /login/{provider}` - Initiate OAuth flow
- `GET /auth/{provider}/callback` - OAuth callback
- `GET /silent-refresh` - Silent re-authentication
- `POST /logout` - Logout
- `GET /.well-known/jwks.json` - Public JWKS

### MFA Endpoints
- `POST /mfa/setup` - Setup MFA
- `POST /mfa/verify` - Verify MFA

## Communication Pattern

All external service calls (e.g., Directory) go through Coordinator:

```json
POST /api/fill-content-metrics
{
  "requester_service": "auth",
  "payload": {
    "action": "get-user",
    "email": "...",
    "provider": "google | github | linkedin"
  },
  "response": {
    "organization_id": "",
    "roles": []
  }
}
```

## Development Principles

- **Onion Architecture** / Clean Code / SOLID / DRY / KISS
- **TCR-enhanced TDD**: Test → Commit → Revert
- **JavaScript only**: No TypeScript files
- **Customization logging**: All decisions in customization.json

## Phases

1. Planning & Design
2. Database Setup (MongoDB)
3. Backend Development
4. Frontend Development
5. Integration
6. Testing & Security
7. Deployment & Monitoring

For complete details, refer to the main requirements document.

