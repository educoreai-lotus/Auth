const { Issuer, generators } = require('openid-client');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const auditService = require('../services/auditService');
const coordinatorService = require('../services/coordinatorService');
const jwtService = require('../services/jwtService');

// OAuth client instances (lazy-loaded)
let oauthClients = {};

// Initialize OAuth clients
let initializationPromise = null;

const initializeOAuthClients = async () => {
  try {
    logger.info('[OAuth Init] Starting OAuth clients initialization...', {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
      nodeEnv: process.env.NODE_ENV,
    });
    
    // Google
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        logger.info('[OAuth Init] Discovering Google OpenID Connect issuer...');
        const googleIssuer = await Issuer.discover('https://accounts.google.com');
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/google/callback`;
        logger.info('[OAuth Init] Creating Google OAuth client...', {
          redirectUri,
          clientIdPrefix: process.env.GOOGLE_CLIENT_ID.substring(0, 8) + '...',
        });
        oauthClients.google = new googleIssuer.Client({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uris: [redirectUri],
          response_types: ['code'],
        });
        logger.info('[OAuth Init] Google OAuth client initialized successfully', {
          redirectUri,
        });
      } catch (error) {
        logger.error('[OAuth Init] Failed to initialize Google OAuth client:', {
          error: error.message,
          stack: error.stack,
        });
      }
    } else {
      logger.warn('[OAuth Init] Google OAuth credentials not found in environment variables', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      });
    }

    // GitHub (OAuth2, not OpenID Connect)
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/github/callback`;
      logger.info('[OAuth Init] Initializing GitHub OAuth client...', {
        redirectUri,
        clientIdPrefix: process.env.GITHUB_CLIENT_ID.substring(0, 8) + '...',
      });
      oauthClients.github = {
        type: 'oauth2',
        authorization_endpoint: 'https://github.com/login/oauth/authorize',
        token_endpoint: 'https://github.com/login/oauth/access_token',
        userinfo_endpoint: 'https://api.github.com/user',
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        redirect_uri: redirectUri,
      };
      logger.info('[OAuth Init] GitHub OAuth client initialized successfully', {
        redirectUri,
      });
    } else {
      logger.warn('[OAuth Init] GitHub OAuth credentials not found in environment variables', {
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
      });
    }

    // LinkedIn (OAuth2, not OpenID Connect)
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/linkedin/callback`;
      logger.info('[OAuth Init] Initializing LinkedIn OAuth client...', {
        redirectUri,
        clientIdPrefix: process.env.LINKEDIN_CLIENT_ID.substring(0, 8) + '...',
      });
      oauthClients.linkedin = {
        type: 'oauth2',
        authorization_endpoint: 'https://www.linkedin.com/oauth/v2/authorization',
        token_endpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
        userinfo_endpoint: 'https://api.linkedin.com/v2/userinfo',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      };
      logger.info('[OAuth Init] LinkedIn OAuth client initialized successfully', {
        redirectUri,
      });
    } else {
      logger.warn('[OAuth Init] LinkedIn OAuth credentials not found in environment variables', {
        hasClientId: !!process.env.LINKEDIN_CLIENT_ID,
        hasClientSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
      });
    }

    logger.info('[OAuth Init] OAuth clients initialization complete', {
      initialized: Object.keys(oauthClients),
      totalProviders: Object.keys(oauthClients).length,
    });
  } catch (error) {
    logger.error('[OAuth Init] Failed to initialize OAuth clients:', {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Initialize on module load
initializationPromise = initializeOAuthClients();

const initiateOAuth = async (req, res) => {
  const startTime = Date.now();
  try {
    const { provider } = req.params;
    logger.info('[Login Step 1] OAuth initiation requested', {
      provider,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referer: req.get('referer'),
      timestamp: new Date().toISOString(),
    });

    if (!['google', 'github', 'linkedin'].includes(provider)) {
      logger.warn('[Login Step 1] Invalid provider requested', {
        provider,
        allowedProviders: ['google', 'github', 'linkedin'],
      });
      return res.status(400).json({ error: 'Invalid provider' });
    }

    logger.info('[Login Step 2] Waiting for OAuth client initialization...', { provider });
    // Wait for initialization to complete if still in progress
    if (initializationPromise) {
      await initializationPromise;
    }
    logger.info('[Login Step 2] OAuth client initialization check complete', { provider });

    const client = oauthClients[provider];
    if (!client) {
      logger.error('[Login Step 2] OAuth provider not configured', {
        provider,
        availableProviders: Object.keys(oauthClients),
        hasLinkedInId: !!process.env.LINKEDIN_CLIENT_ID,
        hasLinkedInSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
        hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasGithubId: !!process.env.GITHUB_CLIENT_ID,
        hasGithubSecret: !!process.env.GITHUB_CLIENT_SECRET,
      });
      return res.status(500).json({ 
        error: 'OAuth provider not configured',
        provider,
        hint: 'Check backend logs for initialization errors'
      });
    }
    logger.info('[Login Step 2] OAuth provider client found', { provider });

    // Generate state and code verifier for PKCE
    logger.info('[Login Step 3] Generating PKCE parameters...', { provider });
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
    logger.info('[Login Step 3] PKCE parameters generated', {
      provider,
      statePrefix: state.substring(0, 10) + '...',
      hasCodeVerifier: !!codeVerifier,
      hasCodeChallenge: !!codeChallenge,
    });

    // Store in session (or use signed cookie)
    // Use 'lax' instead of 'strict' for OAuth cookies because:
    // - OAuth providers redirect from external domains
    // - 'strict' blocks cookies on cross-site redirects
    // - 'lax' allows cookies on top-level navigations (OAuth redirects)
    logger.info('[Login Step 4] Setting OAuth state cookie...', {
      provider,
      cookieName: `oauth_${provider}_state`,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.cookie(`oauth_${provider}_state`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to allow OAuth redirects
      maxAge: 600000, // 10 minutes
      path: '/', // Ensure cookie is available for all paths
    });

    logger.info('[Login Step 4] Setting OAuth code verifier cookie...', {
      provider,
      cookieName: `oauth_${provider}_code_verifier`,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.cookie(`oauth_${provider}_code_verifier`, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to allow OAuth redirects
      maxAge: 600000,
      path: '/', // Ensure cookie is available for all paths
    });
    logger.info('[Login Step 4] OAuth cookies set successfully', { provider });

    // Build authorization URL
    logger.info('[Login Step 5] Building authorization URL...', { provider });
    let authUrl;
    
    if (provider === 'github') {
      // GitHub uses standard OAuth2 (not OpenID Connect)
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/github/callback`;
      logger.info('[Login Step 5] Building GitHub authorization URL...', {
        redirectUri,
        clientIdPrefix: process.env.GITHUB_CLIENT_ID?.substring(0, 8) + '...',
      });
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'user:email read:user',
        state,
      });
      authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      logger.info('[Login Step 5] GitHub authorization URL built', {
        redirectUri,
        hasState: !!state,
      });
    } else if (provider === 'linkedin') {
      // LinkedIn uses standard OAuth2 (not OpenID Connect)
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/linkedin/callback`;
      logger.info('[Login Step 5] Building LinkedIn authorization URL...', {
        redirectUri,
        clientIdPrefix: process.env.LINKEDIN_CLIENT_ID?.substring(0, 8) + '...',
      });
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'openid profile email', // LinkedIn supports OpenID Connect scopes but not discovery
        state,
      });
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      logger.info('[Login Step 5] LinkedIn authorization URL built', {
        redirectUri,
        hasState: !!state,
      });
    } else {
      // Google uses OpenID Connect
      logger.info('[Login Step 5] Building Google OpenID Connect authorization URL...', {
        hasClient: !!client,
      });
      authUrl = client.authorizationUrl({
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      logger.info('[Login Step 5] Google authorization URL built', {
        hasState: !!state,
        hasCodeChallenge: !!codeChallenge,
      });
    }

    const duration = Date.now() - startTime;
    logger.info('[Login Step 6] Redirecting to OAuth provider', {
      provider,
      authUrlPrefix: authUrl.substring(0, 80) + '...',
      duration: `${duration}ms`,
      redirectUri: authUrl.includes('redirect_uri=') ? authUrl.match(/redirect_uri=([^&]+)/)?.[1] : 'N/A',
    });
    res.redirect(authUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Login Step ERROR] OAuth initiation failed', {
      provider: req.params.provider,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
};

const handleCallback = async (req, res) => {
  const startTime = Date.now();
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;
    
    // Log comprehensive request details for cookie debugging
    const requestDetails = {
      protocol: req.protocol,
      secure: req.secure,
      host: req.get('host'),
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent'),
      xForwardedProto: req.get('x-forwarded-proto'),
      xForwardedHost: req.get('x-forwarded-host'),
      xForwardedFor: req.get('x-forwarded-for'),
      isHTTPS: req.protocol === 'https' || req.secure || req.get('x-forwarded-proto') === 'https',
      cookies: Object.keys(req.cookies),
      cookieCount: Object.keys(req.cookies).length,
      url: req.url,
      method: req.method,
      ip: req.ip,
    };

    logger.info('[Callback Step 1] OAuth callback received - Full request details', {
      provider,
      hasCode: !!code,
      hasState: !!state,
      hasOAuthError: !!oauthError,
      oauthError,
      ...requestDetails,
      timestamp: new Date().toISOString(),
    });

    if (oauthError) {
      logger.error('[Callback Step 1] OAuth provider returned error', {
        provider,
        oauthError,
        errorDescription: req.query.error_description,
      });
      // Redirect to root (/) and let React Router handle routing to /login
      // This works better with Vercel's routing
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = encodeURIComponent(`OAuth error: ${oauthError}`);
      const redirectUrl = `${frontendUrl}/?error=${errorMessage}`;
      
      // DEBUG: Log redirect URL and env vars
      console.log('=== OAuth Error Redirect ===');
      console.log('Provider:', provider);
      console.log('FRONTEND_URL env var:', process.env.FRONTEND_URL || 'NOT SET (using default)');
      console.log('Frontend URL resolved:', frontendUrl);
      console.log('Full redirect URL:', redirectUrl);
      console.log('===========================');
      
      return res.redirect(redirectUrl);
    }

    if (!code || !state) {
      logger.error('[Callback Step 1] Missing OAuth parameters', {
        provider,
        hasCode: !!code,
        hasState: !!state,
        queryParams: Object.keys(req.query),
      });
      return res.status(400).json({ error: 'Missing OAuth parameters' });
    }

    logger.info('[Callback Step 2] Verifying OAuth state...', {
      provider,
      receivedStatePrefix: state.substring(0, 10) + '...',
    });

    // Verify state
    const storedState = req.cookies[`oauth_${provider}_state`];
    
    logger.info('[Callback Step 2] State cookie retrieved', {
      provider,
      receivedStatePrefix: state.substring(0, 10) + '...',
      storedStatePrefix: storedState ? storedState.substring(0, 10) + '...' : 'missing',
      allCookies: Object.keys(req.cookies),
      cookieNames: Object.keys(req.cookies).filter(c => c.startsWith('oauth_')),
    });
    
    if (!storedState) {
      logger.error('[Callback Step 2] State cookie not found', {
        provider,
        allCookies: Object.keys(req.cookies),
        cookieNames: Object.keys(req.cookies).filter(c => c.startsWith('oauth_')),
      });
      
      // Clear any OAuth cookies that might exist
      res.clearCookie(`oauth_${provider}_state`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie(`oauth_${provider}_code_verifier`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      return res.status(400).json({ 
        error: 'State cookie not found. Please try logging in again.',
        hint: 'This usually happens if cookies are blocked or SameSite is too strict'
      });
    }
    
    if (state !== storedState) {
      logger.error('[Callback Step 2] State mismatch detected', {
        provider,
        receivedState: state,
        storedState: storedState,
        statesMatch: state === storedState,
      });
      
      // Clear OAuth cookies
      res.clearCookie(`oauth_${provider}_state`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie(`oauth_${provider}_code_verifier`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    logger.info('[Callback Step 2] State verification successful', { provider });

    logger.info('[Callback Step 3] Exchanging authorization code for access token...', {
      provider,
      codePrefix: code.substring(0, 10) + '...',
    });

    let userInfo;
    let email;

    if (provider === 'github') {
      // GitHub OAuth2 flow (not OpenID Connect)
      const axios = require('axios');
      
      logger.info('[Callback Step 3] Exchanging GitHub code for access token...', {
        redirectUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/github/callback`,
      });
      
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          state,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      
      logger.info('[Callback Step 3] GitHub token exchange response received', {
        hasAccessToken: !!accessToken,
        tokenType: tokenResponse.data.token_type,
        scope: tokenResponse.data.scope,
      });
      
      if (!accessToken) {
        logger.error('[Callback Step 3] GitHub token exchange failed', {
          response: tokenResponse.data,
        });
        // Clear OAuth cookies
        res.clearCookie(`oauth_${provider}_state`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        res.clearCookie(`oauth_${provider}_code_verifier`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        return res.status(400).json({ error: 'Failed to obtain access token from GitHub' });
      }
      
      logger.info('[Callback Step 4] Fetching GitHub user information...');
      // Get user info
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      logger.info('[Callback Step 4] Fetching GitHub user email...');
      // Get user email (may require user:email scope)
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const primaryEmail = emailResponse.data.find((e) => e.primary) || emailResponse.data[0];
      email = primaryEmail?.email || userResponse.data.email;
      userInfo = { email, ...userResponse.data };
      
      logger.info('[Callback Step 4] GitHub user information retrieved', {
        email,
        userId: userResponse.data.id,
        username: userResponse.data.login,
      });
    } else if (provider === 'linkedin') {
      // LinkedIn OAuth2 flow (supports OpenID Connect scopes but not discovery)
      const axios = require('axios');
      
      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/linkedin/callback`;
      logger.info('[Callback Step 3] Exchanging LinkedIn code for access token...', {
        redirectUri,
      });
      
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
        {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      
      logger.info('[Callback Step 3] LinkedIn token exchange response received', {
        hasAccessToken: !!accessToken,
        tokenType: tokenResponse.data.token_type,
        expiresIn: tokenResponse.data.expires_in,
      });
      
      if (!accessToken) {
        logger.error('[Callback Step 3] LinkedIn token exchange failed', {
          response: tokenResponse.data,
        });
        // Clear OAuth cookies
        res.clearCookie(`oauth_${provider}_state`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        res.clearCookie(`oauth_${provider}_code_verifier`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        return res.status(400).json({ error: 'Failed to obtain access token from LinkedIn' });
      }
      
      logger.info('[Callback Step 4] Fetching LinkedIn user information...');
      // Get user info using OpenID Connect userinfo endpoint
      const userResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      email = userResponse.data.email;
      userInfo = { email, ...userResponse.data };
      
      logger.info('[Callback Step 4] LinkedIn user information retrieved', {
        email,
        sub: userResponse.data.sub,
        name: userResponse.data.name,
      });
    } else {
      // Google uses OpenID Connect
      const codeVerifier = req.cookies[`oauth_${provider}_code_verifier`];
      const client = oauthClients[provider];
      
      logger.info('[Callback Step 3] Exchanging Google code for tokens (OpenID Connect)...', {
        hasCodeVerifier: !!codeVerifier,
        hasClient: !!client,
        redirectUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/${provider}/callback`,
      });
      
      if (!client) {
        logger.error('[Callback Step 3] Google OAuth client not configured');
        return res.status(500).json({ error: 'OAuth provider not configured' });
      }

      // Exchange code for tokens
      const tokenSet = await client.callback(
        `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/${provider}/callback`,
        { code, state },
        { code_verifier: codeVerifier, state }
      );

      logger.info('[Callback Step 3] Google token exchange successful', {
        hasAccessToken: !!tokenSet.access_token,
        hasIdToken: !!tokenSet.id_token,
        tokenType: tokenSet.token_type,
      });

      logger.info('[Callback Step 4] Fetching Google user information...');
      // Get user info from provider
      userInfo = await client.userinfo(tokenSet.access_token);
      email = userInfo.email || userInfo.emailAddress;
      
      logger.info('[Callback Step 4] Google user information retrieved', {
        email,
        sub: userInfo.sub,
        name: userInfo.name,
      });
    }

    if (!email) {
      logger.error('[Callback Step 4] Email not provided by OAuth provider', {
        provider,
        userInfoKeys: userInfo ? Object.keys(userInfo) : 'no userInfo',
      });
      // Clear OAuth cookies
      res.clearCookie(`oauth_${provider}_state`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie(`oauth_${provider}_code_verifier`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return res.status(400).json({ error: 'Email not provided by OAuth provider' });
    }

    logger.info('[Callback Step 5] Querying Directory service via Coordinator...', {
      provider,
      email,
    });

    // Query Directory via Coordinator
    const directoryResponse = await coordinatorService.getUserByEmail(email, provider);
    
    logger.info('[Callback Step 5] Directory service response received', {
      provider,
      email,
      hasResponse: !!directoryResponse,
      hasUserId: !!directoryResponse?.user_id,
      organizationId: directoryResponse?.organization_id,
      roles: directoryResponse?.roles,
    });

    if (!directoryResponse || !directoryResponse.user_id) {
      logger.warn('[Callback Step 5] User not found in Directory service', {
        provider,
        email,
        response: directoryResponse,
      });
      
      // Clear OAuth cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      };
      res.clearCookie(`oauth_${provider}_state`, cookieOptions);
      res.clearCookie(`oauth_${provider}_code_verifier`, cookieOptions);
      
      logger.info('[Callback Step 5] Redirecting to frontend with error (user not provisioned)', {
        provider,
        email,
      });
      
      // Redirect to login page with error message instead of JSON response
      // Redirect to root (/) and let React Router handle routing to /login
      // This works better with Vercel's routing
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = encodeURIComponent('Account not provisioned — contact administrator');
      const redirectUrl = `${frontendUrl}/?error=${errorMessage}`;
      
      // DEBUG: Log redirect URL and env vars
      console.log('=== User Not Provisioned Redirect ===');
      console.log('Provider:', provider);
      console.log('Email:', email);
      console.log('FRONTEND_URL env var:', process.env.FRONTEND_URL || 'NOT SET (using default)');
      console.log('Frontend URL resolved:', frontendUrl);
      console.log('Full redirect URL:', redirectUrl);
      console.log('=====================================');
      
      return res.redirect(redirectUrl);
    }

    logger.info('[Callback Step 6] Generating JWT token...', {
      provider,
      email,
      userId: directoryResponse.user_id,
      organizationId: directoryResponse.organization_id,
      roles: directoryResponse.roles,
    });

    // Generate JWT
    const token = jwtService.generateToken({
      sub: directoryResponse.user_id,
      email,
      organization_id: directoryResponse.organization_id,
      roles: directoryResponse.roles || [],
    });

    logger.info('[Callback Step 6] JWT token generated successfully', {
      provider,
      email,
      userId: directoryResponse.user_id,
      tokenLength: token.length,
    });

    logger.info('[Callback Step 7] Setting access token cookie...', {
      provider,
      email,
      secure: true, // Always true (required for sameSite: 'none')
      sameSite: 'none', // Changed to 'none' to allow cross-site cookies
      maxAge: '15 minutes',
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
    });

    // Set secure cookie
    // Use 'none' with secure:true to allow cross-site cookies
    // Required when backend (Railway) and frontend (Vercel) are on different domains
    // 'none' allows cookies to be sent cross-site, but requires secure:true (HTTPS)
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always true in production (required for sameSite: 'none')
      sameSite: 'none', // Changed to 'none' to allow cross-site cookies (Railway → Vercel)
      maxAge: 15 * 60 * 1000, // 15 minutes
    };

    // Log cookie options before setting
    logger.info('[Callback Step 7] Cookie options:', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
      maxAgeMinutes: cookieOptions.maxAge / 1000 / 60,
    });

    // Log request details for cookie setting
    logger.info('[Callback Step 7] Request details:', {
      protocol: req.protocol,
      secure: req.secure,
      host: req.get('host'),
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent'),
      isHTTPS: req.protocol === 'https' || req.secure,
    });

    // Verify HTTPS requirement for sameSite: 'none'
    const isHTTPS = req.protocol === 'https' || req.secure || req.get('x-forwarded-proto') === 'https';
    if (cookieOptions.sameSite === 'none' && !isHTTPS) {
      logger.error('[Callback Step 7] CRITICAL: sameSite=none requires HTTPS, but request is not secure!', {
        protocol: req.protocol,
        secure: req.secure,
        xForwardedProto: req.get('x-forwarded-proto'),
        isHTTPS,
        cookieWillFail: true,
      });
    }

    logger.info('[Callback Step 7] Setting cookie with options...', {
      cookieName: 'access_token',
      tokenLength: token.length,
      cookieOptions,
      isHTTPS,
      httpsRequired: cookieOptions.sameSite === 'none',
      httpsCheckPassed: cookieOptions.sameSite === 'none' ? isHTTPS : true,
    });

    res.cookie('access_token', token, cookieOptions);

    // Note: Express doesn't expose Set-Cookie headers via res.get() after setting
    // The cookie is set in the response, but we can't read it back directly
    // We'll verify it in the redirect logging step by checking response headers
    logger.info('[Callback Step 7] Cookie set via res.cookie() - will be sent in response headers', {
      provider,
      email,
      cookieName: 'access_token',
      cookieOptions: cookieOptions,
      note: 'Cookie will be included in Set-Cookie response header',
    });

    logger.info('[Callback Step 8] Clearing OAuth state cookies...', {
      provider,
    });

    // Clear OAuth cookies
    const clearCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
    res.clearCookie(`oauth_${provider}_state`, clearCookieOptions);
    if (provider !== 'github' && provider !== 'linkedin') {
      res.clearCookie(`oauth_${provider}_code_verifier`, clearCookieOptions);
    }

    logger.info('[Callback Step 8] OAuth cookies cleared', { provider });

    logger.info('[Callback Step 9] Logging audit event...', {
      provider,
      email,
      userId: directoryResponse.user_id,
    });

    // Log audit event
    await auditService.logLogin({
      user_id: directoryResponse.user_id,
      email,
      organization_id: directoryResponse.organization_id, // Will be mapped to company_id
      provider,
    });

    logger.info('[Callback Step 9] Audit event logged successfully', {
      provider,
      email,
      userId: directoryResponse.user_id,
    });

    const duration = Date.now() - startTime;
    logger.info('[Callback Step 10] Authentication successful, redirecting to frontend', {
      provider,
      email,
      userId: directoryResponse.user_id,
      organizationId: directoryResponse.organization_id,
      duration: `${duration}ms`,
    });

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/success`;
    
    // Extract domains for cross-domain check
    const backendDomain = req.get('host');
    const frontendDomain = new URL(frontendUrl).hostname;
    const isCrossDomain = backendDomain !== frontendDomain;
    
    // Get Set-Cookie headers before redirect
    const setCookieHeaders = res.get('Set-Cookie');
    const cookieHeaderArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : (setCookieHeaders ? [setCookieHeaders] : []);
    
    // DEBUG: Log redirect URL and env vars
    logger.info('[Callback Step 10] Preparing redirect to frontend...', {
      provider,
      email,
      userId: directoryResponse.user_id,
      frontendUrlEnv: process.env.FRONTEND_URL || 'NOT SET (using default)',
      frontendUrlResolved: frontendUrl,
      redirectUrl,
      backendDomain,
      frontendDomain,
      isCrossDomain,
      protocol: req.protocol,
      secure: req.secure,
    });

    // Log cookie status before redirect
    logger.info('[Callback Step 10] Cookie status before redirect:', {
      hasSetCookieHeaders: cookieHeaderArray.length > 0,
      setCookieHeadersCount: cookieHeaderArray.length,
      setCookieHeaders: cookieHeaderArray.length > 0 ? cookieHeaderArray : 'NO COOKIES SET',
      accessTokenCookiePresent: cookieHeaderArray.some(header => header.includes('access_token')),
      cookieDetails: cookieHeaderArray.map(header => {
        const parts = header.split(';');
        return {
          name: parts[0].split('=')[0],
          hasSecure: header.includes('Secure'),
          hasHttpOnly: header.includes('HttpOnly'),
          hasSameSiteNone: header.includes('SameSite=None'),
          fullHeader: header.substring(0, 200), // First 200 chars
        };
      }),
    });
    
    console.log('=== OAuth Success Redirect ===');
    console.log('Provider:', provider);
    console.log('Email:', email);
    console.log('User ID:', directoryResponse.user_id);
    console.log('FRONTEND_URL env var:', process.env.FRONTEND_URL || 'NOT SET (using default)');
    console.log('Frontend URL resolved:', frontendUrl);
    console.log('Full redirect URL:', redirectUrl);
    console.log('Backend domain:', backendDomain);
    console.log('Frontend domain:', frontendDomain);
    console.log('Is cross-domain redirect:', isCrossDomain);
    console.log('Request protocol:', req.protocol);
    console.log('Request secure:', req.secure);
    console.log('Set-Cookie headers count:', cookieHeaderArray.length);
    console.log('Set-Cookie headers:', cookieHeaderArray.length > 0 ? cookieHeaderArray : 'NONE');
    console.log('Access token cookie in headers:', cookieHeaderArray.some(header => header.includes('access_token')));
    console.log('After OAuth success, the backend redirects to:', redirectUrl);
    console.log('=====================================');
    
    res.redirect(redirectUrl);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Callback Step ERROR] OAuth callback failed', {
      provider: req.params.provider,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    
    // Clear OAuth cookies on error
    const provider = req.params.provider;
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
    res.clearCookie(`oauth_${provider}_state`, cookieOptions);
    res.clearCookie(`oauth_${provider}_code_verifier`, cookieOptions);
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const silentRefresh = async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('[Silent Refresh Step 1] Silent refresh request received', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    logger.warn('[Silent Refresh Step 1] Silent refresh not yet implemented', {
      message: 'This feature requires prompt=none with OAuth provider',
    });

    // This endpoint should re-authenticate with the OAuth provider silently
    // For now, we'll return an error indicating the user needs to re-login
    // Full implementation would use prompt=none with the OAuth provider
    const duration = Date.now() - startTime;
    logger.info('[Silent Refresh Step 1] Returning not implemented response', {
      duration: `${duration}ms`,
    });
    res.status(401).json({ error: 'Silent refresh not yet implemented' });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Silent Refresh Step ERROR] Silent refresh failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    res.status(500).json({ error: 'Silent refresh failed' });
  }
};

const logout = async (req, res) => {
  const startTime = Date.now();
  try {
    logger.info('[Logout Step 1] Logout request received', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // Get user info from token if available
    const token = req.cookies?.access_token;
    let userInfo = null;

    logger.info('[Logout Step 2] Checking for access token...', {
      hasToken: !!token,
    });

    if (token) {
      try {
        const decoded = jwt.decode(token);
        userInfo = {
          user_id: decoded.sub,
          email: decoded.email,
          organization_id: decoded.organization_id,
        };
        logger.info('[Logout Step 2] Token decoded successfully', {
          userId: userInfo.user_id,
          email: userInfo.email,
          organizationId: userInfo.organization_id,
        });
      } catch (error) {
        logger.warn('[Logout Step 2] Token decode failed, but continuing with logout', {
          error: error.message,
        });
        // Token invalid, but still clear cookie
      }
    } else {
      logger.info('[Logout Step 2] No access token found in cookies');
    }

    logger.info('[Logout Step 3] Clearing access token cookie...', {
      secure: true, // Always true (required for sameSite: 'none')
      sameSite: 'none',
    });

    // Clear access token cookie
    // Use 'none' with secure:true to match the cookie setting used when creating the cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true, // Always true (required for sameSite: 'none')
      sameSite: 'none', // Changed to 'none' to match cookie creation
    });

    logger.info('[Logout Step 3] Access token cookie cleared');

    // Update logout timestamp in existing login record
    if (userInfo) {
      logger.info('[Logout Step 4] Updating logout timestamp...', {
        userId: userInfo.user_id,
        email: userInfo.email,
      });

      await auditService.updateLogoutTimestamp({
        user_id: userInfo.user_id,
      });

      logger.info('[Logout Step 4] Logout timestamp updated successfully', {
        userId: userInfo.user_id,
        email: userInfo.email,
      });
    } else {
      logger.info('[Logout Step 4] Skipping logout timestamp update (no user info available)');
    }

    const duration = Date.now() - startTime;
    logger.info('[Logout Step 5] Logout completed successfully', {
      hasUserInfo: !!userInfo,
      duration: `${duration}ms`,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[Logout Step ERROR] Logout failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = {
  initiateOAuth,
  handleCallback,
  silentRefresh,
  logout,
};

