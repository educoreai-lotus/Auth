# Implementation Guide - Auth Microservice

## Phase 1: Planning & Design ✅

### Completed
- [x] Project structure created
- [x] Documentation initialized
- [x] ROADMAP.json created
- [x] Customization.json for decision tracking

## Phase 2: Database Setup

### MongoDB Setup

1. **Install MongoDB** (local or use MongoDB Atlas)

2. **Create Database**
   ```bash
   # MongoDB will create database on first write
   # Connection string: mongodb://localhost:27017/auth-audit
   ```

3. **Run Schema Setup**
   - Indexes are created automatically on connection
   - Collection validation is applied on first write

### Environment Variables

Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/auth-audit
```

## Phase 3: Backend Development

### Step 3.1: Generate RSA Keys

```bash
node scripts/generate-keys.js
```

This creates:
- `keys/private.pem` - JWT signing key (keep secure!)
- `keys/public.pem` - Public key for verification

### Step 3.2: OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:3000/auth/google/callback`
4. Set environment variables:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Set environment variables:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

#### LinkedIn OAuth
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create OAuth app
3. Set redirect URI: `http://localhost:3000/auth/linkedin/callback`
4. Set environment variables:
   ```env
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   ```

### Step 3.3: Install Dependencies

```bash
npm install
```

### Step 3.4: Start Backend

```bash
npm run dev:backend
```

Backend runs on `http://localhost:3000`

## Phase 4: Frontend Development

### Step 4.1: Install Frontend Dependencies

```bash
cd src/frontend
npm install
```

### Step 4.2: Configure Environment

Create `src/frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_COORDINATOR_URL=http://localhost:3001
VITE_APP_URL=http://localhost:5173
```

### Step 4.3: Start Frontend

```bash
npm run dev:frontend
```

Frontend runs on `http://localhost:5173`

## Phase 5: Integration

### Coordinator Integration

The Auth service communicates with Directory via Coordinator using the standardized pattern:

```javascript
POST /api/fill-content-metrics
{
  "requester_service": "auth",
  "payload": {
    "action": "get-user",
    "email": "user@example.com",
    "provider": "google"
  },
  "response": {
    "user_id": "",
    "organization_id": "",
    "roles": []
  }
}
```

### Testing Integration

1. **Mock Coordinator** (for development):
   - Create a simple mock server that returns test user data
   - Or use the actual Coordinator service if available

2. **Test Flow**:
   - Start Auth service
   - Start Coordinator (or mock)
   - Attempt OAuth login
   - Verify JWT contains correct claims

## Phase 6: Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

Target: ≥80% coverage

```bash
npm run test:coverage
```

## Phase 7: Deployment

### Backend Deployment (Railway)

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy

### Frontend Deployment (Vercel)

1. Connect GitHub repository
2. Set build command: `cd src/frontend && npm run build`
3. Set output directory: `src/frontend/dist`
4. Set environment variables
5. Deploy

### Database (MongoDB Atlas)

1. Create MongoDB Atlas cluster
2. Get connection string
3. Update `MONGODB_URI` environment variable
4. Whitelist deployment IPs

## Key Implementation Notes

### OAuth Flow Differences

- **Google**: Full OpenID Connect support
- **GitHub**: OAuth2 only (not OpenID Connect)
- **LinkedIn**: OpenID Connect support

### JWT Token Lifecycle

1. Token generated on successful OAuth callback
2. Token expires in 15 minutes
3. Frontend calls `/silent-refresh` at ~14.5 minutes
4. New token issued, old token naturally expires
5. No manual revocation needed

### Error Scenarios

- **Directory unavailable**: Returns 403, logs error
- **OAuth provider down**: Returns 500, user sees error message
- **Invalid JWT**: Returns 401, user redirected to login

## Next Steps

1. Implement silent refresh fully (prompt=none with OAuth providers)
2. Complete WebAuthn MFA implementation
3. Add AI anomaly detection
4. Set up monitoring and alerting
5. Implement key rotation automation

