# Production Setup Guide: Key Management System

This guide walks you through setting up the key management system with automatic monthly key rotation in production, from scratch.

## Prerequisites

- Access to Railway dashboard
- Access to GitHub repository (for GitHub Secrets, if using)
- Ability to generate RSA key pairs
- Basic understanding of environment variables

---

## Step 1: Generate Your First Key Pair

### 1.1 Generate RSA Key Pair

On your local machine, run:

```bash
# Generate private key (2048-bit RSA)
openssl genpkey -algorithm RSA -out private.pem -pkcs8 -pkeyopt rsa_keygen_bits:2048

# Generate public key from private key
openssl rsa -pubout -in private.pem -out public.pem
```

This creates two files:
- `private.pem` - Your private key (keep this secret!)
- `public.pem` - Your public key (can be shared)

### 1.2 Verify Key Format

Open `private.pem` and verify it looks like this:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines of base64-encoded data)
...
-----END PRIVATE KEY-----
```

Open `public.pem` and verify it looks like this:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
(many lines of base64-encoded data)
...
-----END PUBLIC KEY-----
```

**Important**: The keys must include the `-----BEGIN` and `-----END` lines.

---

## Step 2: Add Keys to Railway Environment Variables

### 2.1 Access Railway Dashboard

1. Go to [Railway.app](https://railway.app)
2. Select your project
3. Click on your backend service
4. Go to the **Variables** tab

### 2.2 Add First Key Pair

Add these environment variables (click **+ New Variable** for each):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `JWT_PRIVATE_KEY_1` | Copy entire content of `private.pem` | Include `-----BEGIN` and `-----END` lines |
| `JWT_PUBLIC_KEY_1` | Copy entire content of `public.pem` | Include `-----BEGIN` and `-----END` lines |
| `JWT_KEY_ID_1` | `auth-key-2024-12` | **The actual key identifier (kid)** - Use format: `auth-key-YYYY-MM` (e.g., `auth-key-2024-12` for December 2024) |
| `JWT_ACTIVE_KID` | `auth-key-2024-12` | Must match the VALUE of `JWT_KEY_ID_1` |

**Important Explanation:**
- The **"1"** in `JWT_KEY_ID_1` is an **INDEX** (first key pair), not related to the month
- The **VALUE** of `JWT_KEY_ID_1` should be the actual month/year: `auth-key-2024-12` (for December 2024)
- When you add a second key next month, it becomes `JWT_KEY_ID_2` with value `auth-key-2025-01`
- The number allows multiple keys to coexist in environment variables

**How to copy key content:**

1. Open `private.pem` in a text editor
2. Select **ALL** text (including `-----BEGIN` and `-----END` lines)
3. Copy it
4. Paste into Railway's `JWT_PRIVATE_KEY_1` field
5. Repeat for `public.pem` → `JWT_PUBLIC_KEY_1`

**⚠️ Important**: 
- Copy the **entire** key, including headers and footers
- Do NOT add extra spaces or line breaks
- The key should be on multiple lines (that's normal)

### 2.3 Add Other Required Environment Variables

Make sure these are also set in Railway:

| Variable Name | Example Value | Required |
|--------------|---------------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | Yes (Railway may set this automatically) |
| `JWT_EXPIRY_MINUTES` | `15` | Yes |
| `JWT_ISSUER` | `auth-microservice` | Yes |
| `JWT_AUDIENCE` | `educore-ai` | Yes |
| `MONGODB_URI` | `mongodb+srv://...` | Yes |
| `BACKEND_URL` | `https://your-app.railway.app` | Yes |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Yes |
| `GOOGLE_CLIENT_ID` | `...` | Yes (if using Google OAuth) |
| `GOOGLE_CLIENT_SECRET` | `...` | Yes (if using Google OAuth) |
| `GITHUB_CLIENT_ID` | `...` | Yes (if using GitHub OAuth) |
| `GITHUB_CLIENT_SECRET` | `...` | Yes (if using GitHub OAuth) |
| `LINKEDIN_CLIENT_ID` | `...` | Yes (if using LinkedIn OAuth) |
| `LINKEDIN_CLIENT_SECRET` | `...` | Yes (if using LinkedIn OAuth) |
| `COORDINATOR_URL` | `https://coordinator-service...` | Yes |

### 2.4 Save and Deploy

1. Click **Save** or **Deploy** in Railway
2. Wait for the deployment to complete
3. Check the deployment logs for any errors

---

## Step 3: Verify Backend Key Loading

### 3.1 Check Deployment Logs

In Railway, go to your service → **Deployments** → Click on the latest deployment → **View Logs**

Look for these log messages:

```
[INFO] Initializing Key Manager...
[INFO] Loading keys from environment variables (production mode)
[INFO] Loaded key from env: auth-key-2024-12
[INFO] Loaded 1 key(s) from environment variables
[INFO] Active key ID set to: auth-key-2024-12
```

**✅ Success indicators:**
- "Loading keys from environment variables (production mode)"
- "Loaded key from env: auth-key-2024-12" (or your actual key ID)
- "Active key ID set to: auth-key-2024-12" (or your actual key ID)

**❌ Error indicators:**
- "No keys found in environment variables"
- "No active key ID available"
- "Private key not found"

### 3.2 Test Health Endpoint

```bash
curl https://your-railway-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "auth-microservice",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Step 4: Verify JWKS Endpoint

### 4.1 Check JWKS Returns All Public Keys

```bash
curl https://your-railway-app.railway.app/.well-known/jwks.json
```

**Expected response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "auth-key-2025-01",
      "alg": "RS256",
      "n": "0vx7...",
      "e": "AQAB"
    }
  ]
}
```

**✅ Success indicators:**
- Response contains a `keys` array
- At least one key object with `kid: "auth-key-2025-01"`
- Key has `kty: "RSA"`, `use: "sig"`, `alg: "RS256"`

**❌ Error indicators:**
- `{"keys": []}` (empty array)
- Error message
- Missing `kid` field

### 4.2 Verify Key Count

The `keys` array should contain **one key** for now (your first key). Later, after rotation, it will contain multiple keys.

---

## Step 5: Verify JWT Token Signing

### 5.1 Test OAuth Login Flow

1. Go to your frontend login page
2. Click "Sign in with Google" (or any OAuth provider)
3. Complete the OAuth flow
4. Check your browser's cookies for `access_token`

### 5.2 Decode JWT Token

Use [jwt.io](https://jwt.io) or a command-line tool:

```bash
# If you have the token in a cookie, extract it and decode:
echo "YOUR_JWT_TOKEN" | cut -d. -f1 | base64 -d
```

**Expected JWT header:**

```json
{
  "alg": "RS256",
  "kid": "auth-key-2025-01",
  "typ": "JWT"
}
```

**✅ Success indicators:**
- Header contains `"kid": "auth-key-2025-01"`
- Algorithm is `"RS256"`
- Token can be verified using the public key from JWKS

**❌ Error indicators:**
- Missing `kid` in header
- Wrong algorithm
- Token verification fails

### 5.3 Verify Token Payload

The decoded token should contain:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "organization_id": "org-id",
  "roles": ["role1", "role2"],
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "auth-microservice",
  "aud": "educore-ai"
}
```

---

## Step 6: Check Key Rotation Status Endpoint

### 6.1 Get Current Status

```bash
curl https://your-railway-app.railway.app/key-rotation/status
```

**Expected response:**

```json
{
  "activeKid": "auth-key-2025-01",
  "availableKids": ["auth-key-2025-01"],
  "keyCount": 1,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**✅ Success indicators:**
- `activeKid` matches your `JWT_ACTIVE_KID`
- `availableKids` contains your key ID
- `keyCount` is 1 (will increase after rotation)

---

## Step 7: Monthly Key Rotation Process

### 7.1 Generate New Key Pair (Month 2)

At the beginning of each month, generate a new key pair:

```bash
# Generate new private key
openssl genpkey -algorithm RSA -out private_new.pem -pkcs8 -pkeyopt rsa_keygen_bits:2048

# Generate new public key
openssl rsa -pubout -in private_new.pem -out public_new.pem
```

### 7.2 Add New Key to Railway

Add the new key as a **second** key pair (don't remove the old one yet):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `JWT_PRIVATE_KEY_2` | Copy entire content of `private_new.pem` | New key |
| `JWT_PUBLIC_KEY_2` | Copy entire content of `public_new.pem` | New key |
| `JWT_KEY_ID_2` | `auth-key-2025-02` | New month's ID |

**Important**: Keep `JWT_PRIVATE_KEY_1` and `JWT_PUBLIC_KEY_1` - don't delete them yet!

### 7.3 Rotate to New Key (Manual Method)

#### Option A: Using Railway Environment Variables

1. In Railway, add these **temporary** variables:
   - `JWT_PRIVATE_KEY_NEW` = content of `private_new.pem`
   - `JWT_PUBLIC_KEY_NEW` = content of `public_new.pem`
   - `JWT_NEW_KID` = `auth-key-2025-02`

2. Call the rotation endpoint:

```bash
curl -X POST https://your-railway-app.railway.app/key-rotation/rotate \
  -H "Content-Type: application/json"
```

**Expected response:**

```json
{
  "success": true,
  "message": "Key rotation completed successfully",
  "oldActiveKid": "auth-key-2025-01",
  "newActiveKid": "auth-key-2025-02",
  "totalKeys": 2
}
```

3. Update `JWT_ACTIVE_KID` in Railway to `auth-key-2025-02`

4. Remove the temporary variables (`JWT_PRIVATE_KEY_NEW`, `JWT_PUBLIC_KEY_NEW`, `JWT_NEW_KID`)

#### Option B: Using GitHub Actions (Automated)

See **Step 8** for automated rotation setup.

### 7.4 Verify Rotation

1. **Check status endpoint:**

```bash
curl https://your-railway-app.railway.app/key-rotation/status
```

Should show:
```json
{
  "activeKid": "auth-key-2025-02",
  "availableKids": ["auth-key-2025-01", "auth-key-2025-02"],
  "keyCount": 2
}
```

2. **Check JWKS endpoint:**

```bash
curl https://your-railway-app.railway.app/.well-known/jwks.json
```

Should show **both keys**:
```json
{
  "keys": [
    {
      "kid": "auth-key-2025-01",
      ...
    },
    {
      "kid": "auth-key-2025-02",
      ...
    }
  ]
}
```

3. **Test new token signing:**

- Log in again
- Decode the new token
- Verify it has `"kid": "auth-key-2025-02"` in the header

4. **Test old token still works:**

- Use an old token (signed with `auth-key-2025-01`)
- It should still validate successfully (backward compatibility)

### 7.5 Grace Period (15 Minutes)

**Important**: After rotation, wait at least **15 minutes** before purging old keys. This ensures:

- All tokens signed with the old key expire naturally (JWT lifetime is 15 minutes)
- No active sessions are broken
- Smooth transition without user impact

### 7.6 Purge Old Keys (After Grace Period)

After 15+ minutes, remove the old key:

```bash
curl -X POST https://your-railway-app.railway.app/key-rotation/purge \
  -H "Content-Type: application/json" \
  -d '{"minAgeMinutes": 60}'
```

**Expected response:**

```json
{
  "success": true,
  "message": "Key purge completed successfully",
  "purged": ["auth-key-2025-01"],
  "activeKid": "auth-key-2025-02",
  "remainingKeys": ["auth-key-2025-02"]
}
```

**Then remove from Railway:**
- Delete `JWT_PRIVATE_KEY_1`
- Delete `JWT_PUBLIC_KEY_1`
- Delete `JWT_KEY_ID_1`

**⚠️ Warning**: Only purge keys that are **not** the active key. The system prevents purging the active key.

---

## Step 8: Automated Monthly Rotation (GitHub Actions)

### 8.1 Create GitHub Actions Workflow

Create `.github/workflows/rotate-keys.yml`:

```yaml
name: Rotate JWT Keys Monthly

on:
  schedule:
    # Run on the 1st day of every month at 00:00 UTC
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  rotate-keys:
    runs-on: ubuntu-latest
    steps:
      - name: Generate new key pair
        id: generate-keys
        run: |
          # Generate private key
          openssl genpkey -algorithm RSA -out private_new.pem -pkcs8 -pkeyopt rsa_keygen_bits:2048
          
          # Generate public key
          openssl rsa -pubout -in private_new.pem -out public_new.pem
          
          # Get current month for kid
          KID="auth-key-$(date +%Y-%m)"
          
          # Output keys (base64 encoded for GitHub Secrets)
          echo "private_key<<EOF" >> $GITHUB_OUTPUT
          cat private_new.pem >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          
          echo "public_key<<EOF" >> $GITHUB_OUTPUT
          cat public_new.pem >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          
          echo "kid=$KID" >> $GITHUB_OUTPUT

      - name: Update Railway environment variables
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          PRIVATE_KEY: ${{ steps.generate-keys.outputs.private_key }}
          PUBLIC_KEY: ${{ steps.generate-keys.outputs.public_key }}
          NEW_KID: ${{ steps.generate-keys.outputs.kid }}
        run: |
          # Install Railway CLI
          npm install -g @railway/cli
          
          # Login to Railway
          railway login --token $RAILWAY_TOKEN
          
          # Add new key pair (determine next index)
          # This is a simplified example - you'll need to determine the next index
          NEXT_INDEX=2  # You may need to calculate this dynamically
          
          railway variables set JWT_PRIVATE_KEY_${NEXT_INDEX}="$PRIVATE_KEY"
          railway variables set JWT_PUBLIC_KEY_${NEXT_INDEX}="$PUBLIC_KEY"
          railway variables set JWT_KEY_ID_${NEXT_INDEX}="$NEW_KID"
          
          # Set temporary rotation variables
          railway variables set JWT_PRIVATE_KEY_NEW="$PRIVATE_KEY"
          railway variables set JWT_PUBLIC_KEY_NEW="$PUBLIC_KEY"
          railway variables set JWT_NEW_KID="$NEW_KID"

      - name: Trigger key rotation
        run: |
          curl -X POST https://your-railway-app.railway.app/key-rotation/rotate \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.ROTATION_SECRET }}"
          
          # Wait a moment for rotation to complete
          sleep 5
          
          # Update active kid
          railway variables set JWT_ACTIVE_KID="$NEW_KID"
          
          # Remove temporary variables
          railway variables unset JWT_PRIVATE_KEY_NEW
          railway variables unset JWT_PUBLIC_KEY_NEW
          railway variables unset JWT_NEW_KID

      - name: Purge old keys (after grace period)
        run: |
          # Wait 15 minutes + buffer (20 minutes total)
          sleep 1200
          
          curl -X POST https://your-railway-app.railway.app/key-rotation/purge \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.ROTATION_SECRET }}" \
            -d '{"minAgeMinutes": 60}'
```

### 8.2 Add GitHub Secrets

In your GitHub repository → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `RAILWAY_TOKEN` | Your Railway API token | Get from Railway → Account → Tokens |
| `ROTATION_SECRET` | A secure random string | Used to authenticate rotation requests |

**Note**: You'll need to secure the `/key-rotation/*` endpoints first (see **Step 9**).

### 8.3 Test Workflow

1. Go to **Actions** tab in GitHub
2. Click **Rotate JWT Keys Monthly**
3. Click **Run workflow** → **Run workflow**
4. Monitor the workflow execution

---

## Step 9: Secure Key Rotation Endpoints (Recommended)

### 9.1 Add Authentication Middleware

The `/key-rotation/*` endpoints should be secured. Create a middleware:

**`src/backend/middlewares/authenticateRotation.js`:**

```javascript
const logger = require('../utils/logger');

const authenticateRotation = (req, res, next) => {
  const rotationSecret = process.env.ROTATION_SECRET;
  
  if (!rotationSecret) {
    logger.warn('ROTATION_SECRET not set - rotation endpoints are unprotected');
    return next(); // Allow in development
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  if (token !== rotationSecret) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
};

module.exports = authenticateRotation;
```

### 9.2 Update Key Rotation Routes

**`src/backend/routes/keyRotation.js`:**

```javascript
const authenticateRotation = require('../middlewares/authenticateRotation');

// Apply to all routes
router.use(authenticateRotation);

// ... rest of routes
```

### 9.3 Add Secret to Railway

Add `ROTATION_SECRET` to Railway environment variables:

```
ROTATION_SECRET=your-secure-random-string-here
```

---

## Step 10: Testing Checklist

### 10.1 Initial Setup Verification

- [ ] Keys loaded successfully (check logs)
- [ ] JWKS endpoint returns public key
- [ ] JWT tokens include `kid` in header
- [ ] Tokens can be verified with public key
- [ ] Status endpoint shows correct active key

### 10.2 Rotation Verification

- [ ] New key added successfully
- [ ] Active key switched to new key
- [ ] JWKS contains both old and new keys
- [ ] New tokens signed with new key
- [ ] Old tokens still validate (backward compatibility)
- [ ] Old keys purged after grace period

### 10.3 Production Readiness

- [ ] All environment variables set correctly
- [ ] Key rotation endpoints secured
- [ ] GitHub Actions workflow configured (if using)
- [ ] Monitoring/alerting set up
- [ ] Documentation updated

---

## Manual vs Automated Tasks

### Manual Tasks (You Must Do)

1. **Initial Setup**: Add first key pair to Railway
2. **Monthly Rotation** (if not using GitHub Actions):
   - Generate new key pair
   - Add to Railway
   - Trigger rotation
   - Update `JWT_ACTIVE_KID`
   - Purge old keys after grace period
3. **Monitoring**: Check rotation status regularly
4. **Troubleshooting**: Fix any issues that arise

### Automated Tasks (System/GitHub Actions Does)

1. **Key Loading**: Backend automatically loads all keys on startup
2. **JWKS Generation**: JWKS updates automatically when keys change
3. **Token Signing**: Always uses active key automatically
4. **Token Validation**: Tries all keys automatically (backward compatibility)
5. **Monthly Rotation** (if using GitHub Actions):
   - Generate new keys
   - Add to Railway
   - Trigger rotation
   - Update active kid
   - Purge old keys

---

## Troubleshooting

### Problem: "No keys found in environment variables"

**Solution:**
- Verify keys are in Railway (check Variables tab)
- Ensure keys include `-----BEGIN` and `-----END` lines
- Check for extra spaces or line breaks
- Verify variable names: `JWT_PRIVATE_KEY_1`, `JWT_PUBLIC_KEY_1`

### Problem: "Active key ID not found"

**Solution:**
- Verify `JWT_ACTIVE_KID` matches one of your `JWT_KEY_ID_*` values
- Check that the key ID exists in the key store

### Problem: JWKS returns empty array

**Solution:**
- Check that public keys are valid PEM format
- Verify keys loaded successfully (check logs)
- Restart the backend service

### Problem: Token validation fails

**Solution:**
- Verify token's `kid` matches an available key
- Check that old keys are still in the store during rotation
- Verify JWKS endpoint returns all keys

### Problem: Rotation fails

**Solution:**
- Verify `JWT_PRIVATE_KEY_NEW` and `JWT_PUBLIC_KEY_NEW` are valid PEM keys
- Check keys are properly formatted (include headers/footers)
- Review logs for specific error messages

---

## Summary

1. **Generate** your first key pair
2. **Add** keys to Railway environment variables
3. **Verify** keys load correctly (check logs)
4. **Test** JWKS endpoint returns public keys
5. **Test** JWT tokens include `kid` in header
6. **Rotate** keys monthly (manual or automated)
7. **Purge** old keys after grace period (15+ minutes)
8. **Secure** rotation endpoints (recommended)
9. **Monitor** rotation status regularly

The system handles key loading, JWKS generation, token signing, and validation automatically. You only need to add keys and trigger rotation monthly.

---

## Next Steps

- Set up monitoring/alerting for key rotation
- Document your key rotation schedule
- Test rotation process in staging before production
- Set up backup/recovery procedures for keys
- Review security best practices regularly

