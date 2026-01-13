# Initial Development Setup - Auth Microservice

## Phase 1: Planning & Design

### Step 1.1 — Define Requirements & Data Models

#### Entities

**audit_logs** (MongoDB Collection)
- `_id`: ObjectId (auto-generated)
- `user_id`: UUID (from Directory)
- `email`: String (verified by IdP)
- `organization_id`: String
- `provider`: String (google | github | linkedin)
- `action`: String (login | logout | mfa_setup | mfa_verify)
- `ip_address`: String (optional)
- `user_agent`: String (optional)
- `timestamp`: Date (UTC)
- `extra`: Object (JSONB for additional metadata)

**No other entities** - Auth service is stateless and stores no user profiles, roles, or passwords.

#### APIs

**Internal APIs (trusted frontend only)**
- `GET /login/{provider}` - Initiate OAuth2/OpenID Connect flow
- `GET /auth/{provider}/callback` - Handle provider callback
- `GET /silent-refresh` - Silent re-authentication (prompt=none)
- `POST /logout` - Clear access_token cookie
- `GET /.well-known/jwks.json` - Public JWKS endpoint

**MFA Endpoints**
- `POST /mfa/setup` - Setup MFA (TOTP/WebAuthn)
- `POST /mfa/verify` - Verify MFA code

### Step 1.2 — Security Considerations

1. **JWT Signing**
   - RS256 (asymmetric) signing
   - Private key stored in Google Cloud KMS / Secret Manager
   - Public key exposed via `/.well-known/jwks.json`
   - Monthly key rotation via Cloud Scheduler

2. **Token Lifetime**
   - Fixed 15 minutes (configurable via `JWT_EXPIRY_MINUTES`)
   - No refresh tokens
   - Session maintained via silent OAuth re-authentication

3. **Rate Limiting**
   - IP-based rate limiting
   - Account lockout after configurable failed attempts
   - Brute-force protection

4. **Secrets Management**
   - All secrets in Vault/KMS
   - Environment-specific secrets
   - No hardcoded credentials

### Step 1.3 — Onboarding Overview

The main registration screen includes:
- Brief platform explanation
- Welcome message
- Core purpose and key features
- Value proposition
- OAuth login buttons (Google, GitHub, LinkedIn)

**No email/password registration** - OAuth-only authentication.

## Next Steps

- [ ] Set up MongoDB connection
- [ ] Create audit_logs collection schema
- [ ] Implement OAuth flows
- [ ] Set up JWT signing infrastructure
- [ ] Create frontend login UI

