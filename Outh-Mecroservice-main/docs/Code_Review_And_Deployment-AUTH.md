# Code Review & Deployment Guide - Auth Microservice

## Phase 7: Deployment & Monitoring

This guide covers the complete deployment process for the Auth Microservice.

## Pre-Deployment Checklist

### ✅ Code Review Items
- [ ] All environment variables documented
- [ ] Secrets management configured
- [ ] Health check endpoint working
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers (Helmet) enabled
- [ ] Logging configured for production
- [ ] Database connection tested
- [ ] OAuth redirect URIs updated for production

### ✅ Security Checklist
- [ ] RSA keys generated and stored securely (KMS/Secrets Manager)
- [ ] Private keys NOT committed to repository
- [ ] Environment variables secured
- [ ] HTTPS enabled in production
- [ ] Cookie security settings verified (HttpOnly, Secure, SameSite)
- [ ] Rate limiting thresholds set appropriately
- [ ] CORS origins restricted to production domains

## Environment Variables

### Backend Environment Variables

Create a `.env` file or configure in your deployment platform:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auth-audit?retryWrites=true&w=majority

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Coordinator Service
COORDINATOR_URL=https://your-coordinator-service.com
COORDINATOR_API_KEY=your_coordinator_api_key

# JWT Keys (Use KMS or Secrets Manager in production)
# Private key should be loaded from secure storage, not environment variable
JWT_PRIVATE_KEY_PATH=/path/to/private.pem
JWT_PUBLIC_KEY_PATH=/path/to/public.pem

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables

Create `src/frontend/.env.production`:

```env
VITE_BACKEND_URL=https://your-backend-domain.com
VITE_COORDINATOR_URL=https://your-coordinator-service.com
VITE_APP_URL=https://your-frontend-domain.com
```

## Deployment Steps

### Step 1: MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new account or sign in

2. **Create Cluster**
   - Click "Build a Database"
   - Choose free tier (M0) or paid tier based on needs
   - Select cloud provider and region
   - Name your cluster (e.g., "educore-auth")

3. **Configure Database Access**
   - Go to "Database Access"
   - Create database user with read/write permissions
   - Save username and password securely

4. **Configure Network Access**
   - Go to "Network Access"
   - Add IP addresses:
     - Railway deployment IPs (or 0.0.0.0/0 for development)
     - Your local development IP
   - For production, use specific IPs only

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database password
   - Update `MONGODB_URI` in environment variables

### Step 2: Generate RSA Keys for Production

**⚠️ IMPORTANT: Never commit private keys to repository**

1. **Generate Keys Locally**
   ```bash
   npm run generate-keys
   ```
   This creates:
   - `keys/private.pem` - Keep this SECRET
   - `keys/public.pem` - Can be public

2. **Store Keys Securely**
   - **Option A: Use Cloud KMS (Recommended)**
     - AWS KMS, Google Cloud KMS, or Azure Key Vault
     - Store private key in KMS
     - Load key at runtime from KMS
   
   - **Option B: Use Secrets Manager**
     - Railway Secrets, Vercel Environment Variables (encrypted)
     - Store private key as environment variable (encrypted)
   
   - **Option C: Use Encrypted Environment Variables**
     - Base64 encode the private key
     - Store in encrypted environment variable
     - Decode at runtime

3. **Update JWT Service**
   - Modify `src/backend/services/jwtService.js` to load key from KMS/secrets
   - Or use environment variable if using encrypted storage

### Step 3: Update OAuth Redirect URIs

**Before deployment, update OAuth app settings:**

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-backend-domain.com/auth/google/callback`
5. Save changes

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Edit your OAuth App
3. Update Authorization callback URL: `https://your-backend-domain.com/auth/github/callback`
4. Save changes

#### LinkedIn OAuth
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Edit your app
3. Add redirect URL: `https://your-backend-domain.com/auth/linkedin/callback`
4. Save changes

### Step 4: Backend Deployment (Railway)

1. **Create Railway Account**
   - Go to [Railway](https://railway.app/)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway will auto-detect Node.js
   - Set root directory: `/` (or leave default)
   - Set start command: `npm run start:backend`

4. **Set Environment Variables**
   - Go to "Variables" tab
   - Add all backend environment variables (see above)
   - **Important**: Store private key securely (use Railway Secrets)

5. **Configure Build Settings**
   - Build command: `npm install`
   - Start command: `npm run start:backend`
   - Health check path: `/health`

6. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Or click "Deploy" manually
   - Wait for deployment to complete

7. **Get Deployment URL**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Update `BACKEND_URL` environment variable with this URL
   - Update OAuth redirect URIs with this URL

### Step 5: Frontend Deployment (Vercel)

1. **Create Vercel Account**
   - Go to [Vercel](https://vercel.com/)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Build Settings**
   - Framework Preset: Vite
   - Root Directory: `src/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**
   - Go to "Settings" → "Environment Variables"
   - Add all frontend environment variables (see above)
   - Set for "Production", "Preview", and "Development"

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Vercel provides URL like: `https://your-app.vercel.app`

6. **Update Backend CORS**
   - Update `FRONTEND_URL` in backend environment variables
   - Restart backend service

### Step 6: Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://your-backend-domain.com/health
   ```
   Should return: `{"status":"ok","service":"auth-microservice",...}`

2. **JWKS Endpoint**
   ```bash
   curl https://your-backend-domain.com/.well-known/jwks.json
   ```
   Should return public key in JWKS format

3. **Test OAuth Flow**
   - Visit frontend URL
   - Click on OAuth provider button
   - Verify redirect to provider
   - Complete authentication
   - Verify redirect back to frontend
   - Check JWT token in cookies

4. **Test Error Handling**
   - Try invalid OAuth state
   - Verify error messages display correctly
   - Check logs for proper error logging

5. **Database Connection**
   - Check MongoDB Atlas logs
   - Verify audit logs are being written
   - Check connection status in backend logs

## Monitoring & Logging

### Logging Configuration

The application uses Winston for logging. Configure log levels:

- **Development**: `LOG_LEVEL=debug`
- **Production**: `LOG_LEVEL=info` or `LOG_LEVEL=warn`

### Monitoring Endpoints

1. **Health Check**: `GET /health`
   - Returns service status
   - Use for load balancer health checks

2. **Metrics** (to be implemented):
   - Request count
   - Error rate
   - Response time
   - OAuth success/failure rates

### Recommended Monitoring Tools

1. **Application Monitoring**
   - Railway built-in metrics
   - Vercel Analytics
   - Sentry for error tracking
   - LogRocket for session replay

2. **Database Monitoring**
   - MongoDB Atlas monitoring dashboard
   - Set up alerts for:
     - High connection count
     - Slow queries
     - Storage usage

3. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - Monitor `/health` endpoint

## Security Best Practices

### 1. Key Management
- ✅ Never commit private keys to repository
- ✅ Use KMS or encrypted secrets storage
- ✅ Rotate keys periodically
- ✅ Use different keys for staging/production

### 2. Environment Variables
- ✅ Use encrypted environment variables
- ✅ Never log sensitive values
- ✅ Use different values for each environment
- ✅ Rotate secrets regularly

### 3. HTTPS
- ✅ Always use HTTPS in production
- ✅ Enable HSTS headers
- ✅ Use valid SSL certificates
- ✅ Railway and Vercel provide HTTPS by default

### 4. Cookie Security
- ✅ HttpOnly: true (prevents XSS)
- ✅ Secure: true (HTTPS only)
- ✅ SameSite: 'strict' or 'lax' (CSRF protection)
- ✅ Set appropriate maxAge

### 5. Rate Limiting
- ✅ Configure appropriate limits per endpoint
- ✅ Use different limits for authenticated/unauthenticated
- ✅ Monitor for abuse
- ✅ Implement IP-based blocking if needed

## Troubleshooting

### Common Issues

1. **OAuth Redirect URI Mismatch**
   - Error: "redirect_uri_mismatch"
   - Solution: Verify redirect URI in OAuth app settings matches exactly

2. **Database Connection Failed**
   - Error: "MongoServerError: Authentication failed"
   - Solution: Check MongoDB URI, username, password, and network access

3. **CORS Errors**
   - Error: "Access to fetch blocked by CORS policy"
   - Solution: Verify FRONTEND_URL in backend matches actual frontend domain

4. **JWT Key Loading Failed**
   - Error: "Error loading private key"
   - Solution: Verify key path, permissions, and key format

5. **Environment Variables Not Loading**
   - Error: "undefined" values
   - Solution: Verify environment variables are set in deployment platform

## Rollback Procedure

### Railway Rollback
1. Go to Railway dashboard
2. Navigate to "Deployments"
3. Find previous successful deployment
4. Click "Redeploy"

### Vercel Rollback
1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Find previous successful deployment
4. Click "..." → "Promote to Production"

## Next Steps

After successful deployment:

1. ✅ Set up monitoring alerts
2. ✅ Configure log aggregation
3. ✅ Set up error tracking (Sentry)
4. ✅ Create runbook for common issues
5. ✅ Schedule regular security audits
6. ✅ Plan for key rotation
7. ✅ Document incident response procedures

## Support & Resources

- Railway Documentation: https://docs.railway.app/
- Vercel Documentation: https://vercel.com/docs
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/
- OAuth Provider Docs:
  - Google: https://developers.google.com/identity/protocols/oauth2
  - GitHub: https://docs.github.com/en/apps/oauth-apps
  - LinkedIn: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication

