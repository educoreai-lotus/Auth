# Design and Architecture - Auth Microservice

## Architecture Overview

The Auth Microservice follows a **stateless, microservices architecture** pattern with clear separation of concerns.

## System Architecture

```
┌─────────────┐
│   Frontend  │ (React)
│  (Port 5173)│
└──────┬──────┘
       │
       │ OAuth Redirects
       │ JWT Cookies
       │
┌──────▼─────────────────────────────────────┐
│         Auth Microservice                  │
│         (Port 3000)                        │
│                                           │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ OAuth Flow  │  │  JWT Service     │   │
│  │ Controller  │  │  (RS256)         │   │
│  └──────────────┘  └──────────────────┘   │
│                                            │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ Coordinator  │  │  Audit Service  │   │
│  │  Service     │  │  (MongoDB)       │   │
│  └──────────────┘  └──────────────────┘   │
└──────┬─────────────────────────────────────┘
       │
       │ /api/fill-content-metrics
       │
┌──────▼──────────┐
│   Coordinator   │
│   Microservice  │
└──────┬──────────┘
       │
       │ Routes to Directory
       │
┌──────▼──────────┐
│   Directory     │
│   Microservice  │
└─────────────────┘
```

## Component Architecture

### Backend Layers (Onion Architecture)

```
┌─────────────────────────────────────┐
│         Routes Layer                │
│  (Express route handlers)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Controllers Layer               │
│  (Business logic orchestration)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Services Layer                │
│  (JWT, OAuth, Audit, Coordinator)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Database Layer                 │
│  (MongoDB - Audit logs only)       │
└─────────────────────────────────────┘
```

## Data Flow

### Authentication Flow

```
1. User clicks "Login with Google"
   ↓
2. Frontend → GET /login/google
   ↓
3. Auth redirects to Google OAuth
   ↓
4. User authenticates with Google
   ↓
5. Google redirects to /auth/google/callback?code=...
   ↓
6. Auth exchanges code for ID token
   ↓
7. Auth extracts email from ID token
   ↓
8. Auth → Coordinator → Directory (get-user)
   ↓
9. Directory returns {user_id, organization_id, roles[]}
   ↓
10. Auth generates JWT (RS256, 15 min)
   ↓
11. Auth sets HttpOnly cookie: access_token=JWT
   ↓
12. Redirect to frontend /auth/success
```

### Silent Refresh Flow

```
1. Frontend detects token expiry approaching (~14.5 min)
   ↓
2. Frontend → GET /silent-refresh (with provider cookies)
   ↓
3. Auth re-authenticates with OAuth provider (prompt=none)
   ↓
4. Auth gets fresh ID token
   ↓
5. Auth → Coordinator → Directory (get-user)
   ↓
6. Auth generates new JWT
   ↓
7. Auth sets new access_token cookie
   ↓
8. Frontend continues with fresh token
```

## Database Schema

### MongoDB Collection: `audit_logs`

```javascript
{
  _id: ObjectId,
  user_id: String (UUID),
  email: String,
  organization_id: String,
  provider: String | null, // 'google' | 'github' | 'linkedin'
  action: String, // 'login' | 'logout' | 'mfa_setup' | 'mfa_verify'
  ip_address: String | null,
  user_agent: String | null,
  timestamp: Date (UTC),
  extra: Object // Additional metadata
}
```

**Indexes:**
- `{ user_id: 1, timestamp: -1 }` - Fast user history queries
- `{ email: 1 }` - Email lookups
- `{ organization_id: 1, timestamp: -1 }` - Org-level audit queries
- `{ timestamp: -1 }` - Time-based queries

## Security Architecture

### JWT Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "organization_id": "org-uuid",
  "roles": ["admin", "trainer"],
  "iat": 1234567890,
  "exp": 1234568790,
  "iss": "auth-microservice",
  "aud": "educore-ai"
}
```

### Key Management

- **Private Key**: Stored in Google Cloud KMS / Secret Manager
- **Public Key**: Exposed via `/.well-known/jwks.json`
- **Rotation**: Monthly automated rotation via Cloud Scheduler
- **Algorithm**: RS256 (asymmetric)

### Cookie Security

```
access_token=JWT
HttpOnly=true
Secure=true (production)
SameSite=Strict
Max-Age=900 (15 minutes)
```

## Multi-Tenancy

- **Isolation**: Logical isolation via `organization_id` in JWT
- **Enforcement**: Each microservice validates `organization_id` from JWT
- **RBAC**: Roles array in JWT, validated per-request by each service

## Stateless Design

- **No Session Storage**: No Redis, no database sessions
- **No Refresh Tokens**: Session maintained via silent OAuth re-auth
- **No Revocation List**: Tokens expire naturally (15 min)
- **No JTI**: No token ID tracking needed

## Error Handling

- **Directory Unavailable**: Safe fallback, queue requests, log errors
- **OAuth Provider Down**: Clear error message, optional retry
- **JWT Verification Fails**: Logged, token marked invalid

## Scalability

- **Horizontal Scaling**: Stateless design enables unlimited scaling
- **No Shared State**: Each instance is independent
- **Cached JWKS**: 24-hour cache on public keys
- **Rate Limiting**: Per-IP and per-user limits

