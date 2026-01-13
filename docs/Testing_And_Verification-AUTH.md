# Testing and Verification - Auth Microservice

## Test Strategy

### Unit Tests
- **Target Coverage**: ≥80%
- **Framework**: Jest
- **Location**: `tests/backend/`

### Integration Tests
- **OAuth Flows**: Mock OAuth providers
- **Coordinator Integration**: Mock Coordinator responses
- **Database**: Test MongoDB audit logging

### Security Tests
- **JWT Validation**: Test token signing and verification
- **OAuth State**: Test CSRF protection
- **Rate Limiting**: Test brute-force protection
- **Cookie Security**: Verify HttpOnly, Secure, SameSite flags

## Test Categories

### 1. Authentication Tests

#### OAuth Initiation
- ✅ Valid provider redirects correctly
- ✅ Invalid provider returns 400
- ✅ State parameter is set in cookie
- ✅ Code verifier is generated for PKCE

#### OAuth Callback
- ✅ Valid callback processes successfully
- ✅ Invalid state returns 400
- ✅ Missing code returns 400
- ✅ Directory lookup failure returns 403
- ✅ Successful login sets JWT cookie
- ✅ Audit log is created

#### Silent Refresh
- ✅ Returns new JWT before expiry
- ✅ Handles provider errors gracefully
- ✅ Updates audit log

#### Logout
- ✅ Clears access_token cookie
- ✅ Creates logout audit log
- ✅ Returns success message

### 2. JWT Tests

#### Token Generation
- ✅ Token contains required claims
- ✅ Token expires in 15 minutes
- ✅ Token is signed with RS256
- ✅ Token includes organization_id and roles

#### Token Validation
- ✅ Valid token is accepted
- ✅ Expired token is rejected
- ✅ Invalid signature is rejected
- ✅ Missing token returns 401

### 3. MFA Tests

#### TOTP Setup
- ✅ Generates secret
- ✅ Returns QR code
- ✅ Creates audit log
- ✅ Requires authentication

#### TOTP Verification
- ✅ Valid token is accepted
- ✅ Invalid token is rejected
- ✅ Expired token is rejected
- ✅ Creates audit log

### 4. Coordinator Integration Tests

#### User Lookup
- ✅ Successful lookup returns user data
- ✅ User not found returns null
- ✅ Coordinator unavailable handles gracefully
- ✅ Request format is correct

### 5. Audit Logging Tests

#### Login Logging
- ✅ Login event is logged
- ✅ Contains required fields
- ✅ Timestamp is set correctly
- ✅ IP and user agent are captured

#### Logout Logging
- ✅ Logout event is logged
- ✅ Links to most recent login
- ✅ Timestamp is set correctly

### 6. Security Tests

#### Rate Limiting
- ✅ Too many requests are blocked
- ✅ Auth endpoints have stricter limits
- ✅ Successful requests don't count

#### CSRF Protection
- ✅ State parameter prevents CSRF
- ✅ Invalid state is rejected

#### Cookie Security
- ✅ HttpOnly flag is set
- ✅ Secure flag is set in production
- ✅ SameSite=Strict is set
- ✅ Max-Age is 15 minutes

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Data

### Mock OAuth Responses

```javascript
const mockGoogleUserInfo = {
  email: 'test@example.com',
  sub: 'google-user-id',
  name: 'Test User',
};

const mockDirectoryResponse = {
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  roles: ['admin', 'trainer'],
};
```

## Security Audit Checklist

### OWASP Top 10
- [ ] Injection prevention (parameterized queries)
- [ ] Authentication bypass protection
- [ ] Sensitive data exposure prevention
- [ ] XML/JSON external entity protection
- [ ] Broken access control prevention
- [ ] Security misconfiguration checks
- [ ] XSS prevention
- [ ] Insecure deserialization prevention
- [ ] Known vulnerabilities scanning
- [ ] Insufficient logging and monitoring

### Penetration Testing
- [ ] JWT forgery attempts
- [ ] Token replay attacks
- [ ] CSRF attacks
- [ ] XSS on frontend
- [ ] SQL injection (N/A - MongoDB)
- [ ] Rate limiting bypass attempts

## Performance Tests

### Load Testing
- **Target**: 1000 requests/second
- **Tool**: Artillery or k6
- **Scenarios**:
  - Login flow
  - Silent refresh
  - JWT validation
  - JWKS endpoint

### Stress Testing
- **Target**: System handles 10x normal load
- **Focus**: Database connection pooling
- **Monitoring**: Response times, error rates

## Continuous Testing

### Pre-commit Hooks
- Lint checks
- Unit tests
- Security scans

### CI/CD Pipeline
- Run all tests on PR
- Security scanning
- Coverage reports
- Integration tests

## Test Environment Setup

### Required Services
- MongoDB (test database)
- Mock OAuth providers
- Mock Coordinator service

### Environment Variables
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/auth-audit-test
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
```

