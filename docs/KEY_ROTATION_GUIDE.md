# Key Rotation Guide

This document explains how to use the automatic key rotation system for JWT keys stored in GitHub Secrets.

## Overview

The key management system supports:
- **Production**: Multiple keys stored in GitHub Secrets (environment variables)
- **Development**: Local key files (`keys/private.pem`, `keys/public.pem`)
- **Automatic Rotation**: Monthly key rotation via GitHub Actions
- **Backward Compatibility**: Old tokens remain valid during rotation window (15 minutes)

## Architecture

### Key Manager (`keyManager.js`)
- Loads all available keys on startup
- Manages active key ID (`JWT_ACTIVE_KID`)
- Provides key lookup by `kid`
- Supports both production (env vars) and development (local files)

### Key Rotation Service (`keyRotationService.js`)
- Adds new keys from environment variables
- Switches active key after rotation
- Purges expired keys after grace period
- Refreshes JWKS cache automatically

### JWT Service (`jwtService.js`)
- Signs tokens with active private key
- Includes `kid` in JWT header for proper validation

### JWKS Controller (`jwksController.js`)
- Returns all public keys in JWKS format
- Updates dynamically when keys are rotated
- Supports multiple active keys simultaneously

### JWT Validation (`validateJWT.js`)
- Validates tokens using `kid` from header
- Falls back to trying all keys (backward compatibility)
- Ensures old tokens remain valid during rotation

## GitHub Secrets Setup

### Initial Setup

Store your keys in GitHub Secrets with the following naming convention:

```
JWT_PRIVATE_KEY_1=<private key content>
JWT_PUBLIC_KEY_1=<public key content>
JWT_KEY_ID_1=auth-key-2025-01

JWT_PRIVATE_KEY_2=<private key content>
JWT_PUBLIC_KEY_2=<public key content>
JWT_KEY_ID_2=auth-key-2024-12

JWT_ACTIVE_KID=auth-key-2025-01
```

### Key Naming Convention

- **Private Keys**: `JWT_PRIVATE_KEY_1`, `JWT_PRIVATE_KEY_2`, `JWT_PRIVATE_KEY_3`, ...
- **Public Keys**: `JWT_PUBLIC_KEY_1`, `JWT_PUBLIC_KEY_2`, `JWT_PUBLIC_KEY_3`, ...
- **Key IDs**: `JWT_KEY_ID_1`, `JWT_KEY_ID_2`, `JWT_KEY_ID_3`, ... (optional, defaults to `auth-key-{index}`)
- **Active Key**: `JWT_ACTIVE_KID` (must match one of the key IDs)

### Key Format

Keys should be in PEM format:

```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

```
-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

## Railway Environment Variables

Add the following to Railway:

1. **All key pairs** (as many as you need):
   ```
   JWT_PRIVATE_KEY_1=...
   JWT_PUBLIC_KEY_1=...
   JWT_KEY_ID_1=auth-key-2025-01
   
   JWT_PRIVATE_KEY_2=...
   JWT_PUBLIC_KEY_2=...
   JWT_KEY_ID_2=auth-key-2024-12
   ```

2. **Active key ID**:
   ```
   JWT_ACTIVE_KID=auth-key-2025-01
   ```

3. **JWT Configuration** (existing):
   ```
   JWT_EXPIRY_MINUTES=15
   JWT_ISSUER=auth-microservice
   JWT_AUDIENCE=educore-ai
   ```

4. **Other required variables** (existing):
   ```
   NODE_ENV=production
   MONGODB_URI=...
   BACKEND_URL=...
   FRONTEND_URL=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   COORDINATOR_URL=...
   ```

## Monthly Key Rotation Process

### Step 1: Generate New Key Pair

Generate a new RSA key pair:

```bash
# Generate private key
openssl genpkey -algorithm RSA -out new_private.pem -pkcs8 -pkeyopt rsa_keygen_bits:2048

# Generate public key
openssl rsa -pubout -in new_private.pem -out new_public.pem
```

### Step 2: Add to GitHub Secrets

Add the new key pair to GitHub Secrets:

```
JWT_PRIVATE_KEY_NEW=<new private key content>
JWT_PUBLIC_KEY_NEW=<new public key content>
JWT_NEW_KID=auth-key-2025-02
```

### Step 3: Trigger Rotation (GitHub Actions)

Create a GitHub Actions workflow (`.github/workflows/rotate-keys.yml`):

```yaml
name: Rotate JWT Keys

on:
  schedule:
    # Run on the 1st day of every month at 00:00 UTC
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  rotate-keys:
    runs-on: ubuntu-latest
    steps:
      - name: Rotate keys in Railway
        env:
          JWT_PRIVATE_KEY_NEW: ${{ secrets.JWT_PRIVATE_KEY_NEW }}
          JWT_PUBLIC_KEY_NEW: ${{ secrets.JWT_PUBLIC_KEY_NEW }}
          JWT_NEW_KID: ${{ secrets.JWT_NEW_KID }}
        run: |
          # Call Railway API or use Railway CLI to update environment variables
          # Then call the rotation endpoint
          curl -X POST https://your-railway-app.railway.app/key-rotation/rotate \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_API_TOKEN }}" \
            -H "Content-Type: application/json"
```

**Note**: The actual implementation depends on how you want to update Railway environment variables. You may need to:
1. Update Railway secrets via Railway API/CLI
2. Call the rotation endpoint
3. Update `JWT_ACTIVE_KID` in Railway

### Step 4: Purge Old Keys (After Grace Period)

After 15 minutes (JWT expiry time) + buffer, purge old keys:

```yaml
- name: Purge expired keys
  run: |
    curl -X POST https://your-railway-app.railway.app/key-rotation/purge \
      -H "Authorization: Bearer ${{ secrets.RAILWAY_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d '{"minAgeMinutes": 60}'
```

## API Endpoints

### POST `/key-rotation/rotate`
Rotate to a new key from environment variables.

**Required Environment Variables**:
- `JWT_PRIVATE_KEY_NEW`: New private key
- `JWT_PUBLIC_KEY_NEW`: New public key
- `JWT_NEW_KID`: New key ID (optional, defaults to timestamp-based)

**Response**:
```json
{
  "success": true,
  "oldActiveKid": "auth-key-2025-01",
  "newActiveKid": "auth-key-2025-02",
  "totalKeys": 2
}
```

**Security Note**: This endpoint should be secured in production (e.g., require admin token or secret header).

### POST `/key-rotation/purge`
Purge expired keys.

**Request Body** (optional):
```json
{
  "kidsToPurge": ["auth-key-2024-12"],
  "minAgeMinutes": 60
}
```

**Response**:
```json
{
  "success": true,
  "purged": ["auth-key-2024-12"],
  "activeKid": "auth-key-2025-01",
  "remainingKeys": ["auth-key-2025-01"]
}
```

### GET `/key-rotation/status`
Get current key rotation status.

**Response**:
```json
{
  "activeKid": "auth-key-2025-01",
  "availableKids": ["auth-key-2025-01", "auth-key-2024-12"],
  "keyCount": 2,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Development Mode

In development (`NODE_ENV !== 'production'`), the system uses local files:

- `keys/private.pem`: Private key
- `keys/public.pem`: Public key
- `JWT_KEY_ID`: Key ID (defaults to `auth-key-1`)

Generate keys locally:
```bash
npm run generate-keys
```

## Backward Compatibility

The system ensures backward compatibility during key rotation:

1. **Old tokens remain valid**: Tokens signed with old keys are validated using the old public key
2. **JWKS includes all keys**: The JWKS endpoint returns all public keys, allowing other services to validate tokens signed with any active key
3. **Grace period**: Old keys are kept active for at least 15 minutes (JWT expiry time) after rotation

## Monitoring

Monitor key rotation status:

```bash
curl https://your-railway-app.railway.app/key-rotation/status
```

Check JWKS endpoint:

```bash
curl https://your-railway-app.railway.app/.well-known/jwks.json
```

## Troubleshooting

### No keys loaded
- **Production**: Check that `JWT_PRIVATE_KEY_1` and `JWT_PUBLIC_KEY_1` are set in Railway
- **Development**: Ensure `keys/private.pem` and `keys/public.pem` exist

### Active key not found
- Ensure `JWT_ACTIVE_KID` matches one of the loaded key IDs
- Check that the key ID exists in the key store

### Token validation fails
- Check that the token's `kid` matches an available key
- Verify that old keys are still in the key store during rotation window
- Check JWKS endpoint to see all available keys

### Rotation fails
- Ensure `JWT_PRIVATE_KEY_NEW` and `JWT_PUBLIC_KEY_NEW` are valid PEM keys
- Verify keys are properly formatted (include headers/footers)
- Check logs for specific error messages

## Security Considerations

1. **Secure Key Rotation Endpoint**: Add authentication/authorization to `/key-rotation/*` endpoints in production
2. **Key Storage**: Never commit keys to Git; use GitHub Secrets or Railway Secrets
3. **Key Rotation Frequency**: Rotate keys monthly as per requirements
4. **Key Purging**: Purge old keys after grace period to minimize attack surface
5. **Monitoring**: Monitor key rotation status and JWKS endpoint regularly

## Next Steps

1. Set up GitHub Secrets with initial key pairs
2. Configure Railway environment variables
3. Create GitHub Actions workflow for monthly rotation
4. Test rotation process in staging environment
5. Monitor key rotation status in production

