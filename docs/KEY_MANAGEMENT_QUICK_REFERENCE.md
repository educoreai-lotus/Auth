# Key Management Quick Reference

## Quick Commands

### Check Key Status
```bash
curl https://your-railway-app.railway.app/key-rotation/status
```

### View JWKS (All Public Keys)
```bash
curl https://your-railway-app.railway.app/.well-known/jwks.json
```

### Rotate to New Key
```bash
curl -X POST https://your-railway-app.railway.app/key-rotation/rotate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ROTATION_SECRET"
```

### Purge Old Keys
```bash
curl -X POST https://your-railway-app.railway.app/key-rotation/purge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ROTATION_SECRET" \
  -d '{"minAgeMinutes": 60}'
```

## Generate New Key Pair

```bash
# Generate private key
openssl genpkey -algorithm RSA -out private.pem -pkcs8 -pkeyopt rsa_keygen_bits:2048

# Generate public key
openssl rsa -pubout -in private.pem -out public.pem
```

## Railway Environment Variables

### Initial Setup (First Key)
```
JWT_PRIVATE_KEY_1=<private key content>
JWT_PUBLIC_KEY_1=<public key content>
JWT_KEY_ID_1=auth-key-2024-12    # The "1" is an INDEX, the VALUE is the actual month/year
JWT_ACTIVE_KID=auth-key-2024-12  # Must match JWT_KEY_ID_1 value
```

**Note**: The number "1" in `JWT_KEY_ID_1` is just an index (first key pair). The VALUE should be the actual month/year (e.g., `auth-key-2024-12` for December 2024).

### Adding Second Key (Rotation)
```
JWT_PRIVATE_KEY_2=<new private key>
JWT_PUBLIC_KEY_2=<new public key>
JWT_KEY_ID_2=auth-key-2025-01    # Second key pair (index 2), but value is January 2025
```

### Temporary Variables (For Rotation)
```
JWT_PRIVATE_KEY_NEW=<new private key>
JWT_PUBLIC_KEY_NEW=<new public key>
JWT_NEW_KID=auth-key-2025-02
```

**After rotation, update:**
```
JWT_ACTIVE_KID=auth-key-2025-02
```

**Then remove temporary variables:**
- `JWT_PRIVATE_KEY_NEW`
- `JWT_PUBLIC_KEY_NEW`
- `JWT_NEW_KID`

## Monthly Rotation Checklist

- [ ] Generate new key pair
- [ ] Add `JWT_PRIVATE_KEY_N`, `JWT_PUBLIC_KEY_N`, `JWT_KEY_ID_N` to Railway
- [ ] Set temporary variables (`JWT_PRIVATE_KEY_NEW`, etc.)
- [ ] Call `/key-rotation/rotate` endpoint
- [ ] Update `JWT_ACTIVE_KID` to new key ID
- [ ] Remove temporary variables
- [ ] Verify JWKS contains both keys
- [ ] Wait 15+ minutes (grace period)
- [ ] Call `/key-rotation/purge` endpoint
- [ ] Remove old key variables from Railway

## Verification Steps

### 1. Check Keys Loaded
Look for in logs:
```
[INFO] Loaded key from env: auth-key-2025-01
[INFO] Active key ID set to: auth-key-2025-01
```

### 2. Check JWKS
```bash
curl https://your-app.railway.app/.well-known/jwks.json
```
Should return array with your public key(s).

### 3. Check Token Header
Decode JWT token at [jwt.io](https://jwt.io) - header should contain:
```json
{
  "alg": "RS256",
  "kid": "auth-key-2025-01"
}
```

### 4. Check Status
```bash
curl https://your-app.railway.app/key-rotation/status
```
Should show active key and all available keys.

## Key Naming Convention

- Format: `auth-key-YYYY-MM`
- Examples:
  - `auth-key-2025-01` (January 2025)
  - `auth-key-2025-02` (February 2025)
  - `auth-key-2025-03` (March 2025)

## Important Notes

- **Grace Period**: Wait 15+ minutes after rotation before purging old keys
- **Never Delete Active Key**: System prevents this automatically
- **Key Format**: Must include `-----BEGIN` and `-----END` lines
- **Multiple Keys**: System supports unlimited keys (JWT_PRIVATE_KEY_1, _2, _3, ...)
- **Backward Compatibility**: Old tokens remain valid during rotation window

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No keys found" | Check Railway variables, verify key format |
| "Active key not found" | Verify `JWT_ACTIVE_KID` matches a `JWT_KEY_ID_*` |
| JWKS empty | Check public keys are valid, restart service |
| Token validation fails | Verify `kid` in token matches available key |
| Rotation fails | Check temporary variables are set correctly |

## Production vs Development

### Production (`NODE_ENV=production`)
- Reads from environment variables: `JWT_PRIVATE_KEY_1`, `JWT_PUBLIC_KEY_1`, etc.
- Supports multiple keys simultaneously
- Keys stored in Railway Secrets

### Development (`NODE_ENV !== 'production'`)
- Reads from local files: `keys/private.pem`, `keys/public.pem`
- Single key pair
- Generate with: `npm run generate-keys`

