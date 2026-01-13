# Deployment Checklist - Auth Microservice

Use this checklist to ensure all steps are completed before and during deployment.

## Pre-Deployment

### Environment Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with proper permissions
- [ ] Network access configured (IP whitelist)
- [ ] Connection string obtained and tested
- [ ] RSA keys generated (`npm run generate-keys`)
- [ ] Private key stored securely (KMS/Secrets Manager)
- [ ] Public key accessible for JWKS endpoint

### OAuth Configuration
- [ ] Google OAuth app created
- [ ] Google redirect URI updated for production
- [ ] GitHub OAuth app created
- [ ] GitHub redirect URI updated for production
- [ ] LinkedIn OAuth app created
- [ ] LinkedIn redirect URI updated for production
- [ ] All OAuth credentials obtained

### Code Preparation
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables documented
- [ ] `.env.example` files created
- [ ] No secrets committed to repository
- [ ] Dockerfile tested locally
- [ ] Health check endpoint working

## Backend Deployment (Railway)

### Initial Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] New project created in Railway
- [ ] Service configured

### Configuration
- [ ] Root directory set (if needed)
- [ ] Build command: `npm install`
- [ ] Start command: `npm run start:backend`
- [ ] Health check path: `/health`

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (or Railway assigned port)
- [ ] `BACKEND_URL` set to Railway deployment URL
- [ ] `FRONTEND_URL` set to Vercel deployment URL
- [ ] `MONGODB_URI` set to Atlas connection string
- [ ] `GOOGLE_CLIENT_ID` set
- [ ] `GOOGLE_CLIENT_SECRET` set
- [ ] `GITHUB_CLIENT_ID` set
- [ ] `GITHUB_CLIENT_SECRET` set
- [ ] `LINKEDIN_CLIENT_ID` set
- [ ] `LINKEDIN_CLIENT_SECRET` set
- [ ] `COORDINATOR_URL` set
- [ ] `COORDINATOR_API_KEY` set (if required)
- [ ] `JWT_PRIVATE_KEY_PATH` set (or key loaded from KMS)
- [ ] `JWT_PUBLIC_KEY_PATH` set
- [ ] `LOG_LEVEL=info`

### Deployment
- [ ] Initial deployment triggered
- [ ] Build logs checked for errors
- [ ] Deployment successful
- [ ] Health check passing
- [ ] Deployment URL obtained

### Post-Deployment Verification
- [ ] Health endpoint accessible: `GET /health`
- [ ] JWKS endpoint accessible: `GET /.well-known/jwks.json`
- [ ] OAuth initiation working: `GET /login/google`
- [ ] OAuth callback working: `GET /auth/google/callback`
- [ ] Logs showing no errors
- [ ] Database connection successful

## Frontend Deployment (Vercel)

### Initial Setup
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project imported

### Configuration
- [ ] Framework: Vite
- [ ] Root Directory: `src/frontend`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `cd src/frontend && npm install`

### Environment Variables
- [ ] `VITE_BACKEND_URL` set to Railway backend URL
- [ ] `VITE_COORDINATOR_URL` set
- [ ] `VITE_APP_URL` set to Vercel frontend URL

### Deployment
- [ ] Initial deployment triggered
- [ ] Build logs checked for errors
- [ ] Deployment successful
- [ ] Deployment URL obtained

### Post-Deployment Verification
- [ ] Frontend loads correctly
- [ ] OAuth buttons visible
- [ ] No console errors
- [ ] API calls working
- [ ] Theme toggle working
- [ ] Responsive design working

## Integration Testing

### OAuth Flow Testing
- [ ] Google OAuth flow works end-to-end
- [ ] GitHub OAuth flow works end-to-end
- [ ] LinkedIn OAuth flow works end-to-end
- [ ] Error handling works (invalid state, etc.)
- [ ] Error messages display correctly
- [ ] JWT token set in cookie after successful auth

### Coordinator Integration
- [ ] User lookup via Coordinator works
- [ ] Error handling when Coordinator unavailable
- [ ] Proper error messages for unprovisioned users

### Security Testing
- [ ] HTTPS enforced
- [ ] Cookies have HttpOnly, Secure flags
- [ ] CORS properly configured
- [ ] Rate limiting working
- [ ] Security headers present (Helmet)

## Monitoring Setup

### Logging
- [ ] Logs accessible in Railway dashboard
- [ ] Log level appropriate for production
- [ ] Error logs captured
- [ ] Audit logs writing to MongoDB

### Monitoring Tools
- [ ] Uptime monitoring configured
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring configured
- [ ] Alert thresholds set

### Database Monitoring
- [ ] MongoDB Atlas monitoring enabled
- [ ] Connection pool monitoring
- [ ] Query performance monitoring
- [ ] Storage usage alerts configured

## Documentation

- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Runbook created for common issues
- [ ] Incident response procedures documented
- [ ] Team notified of deployment

## Rollback Plan

- [ ] Previous deployment version identified
- [ ] Rollback procedure tested
- [ ] Rollback triggers defined
- [ ] Team trained on rollback process

## Post-Deployment

### First 24 Hours
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database connections
- [ ] Verify OAuth flows
- [ ] Review user feedback
- [ ] Check logs for anomalies

### First Week
- [ ] Performance metrics reviewed
- [ ] Error patterns analyzed
- [ ] User authentication success rate
- [ ] Database performance
- [ ] Cost optimization opportunities

## Sign-Off

- [ ] All checklist items completed
- [ ] Deployment approved by team lead
- [ ] Production access verified
- [ ] Documentation updated
- [ ] Team notified of successful deployment

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________

