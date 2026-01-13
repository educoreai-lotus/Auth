const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiter = require('./middlewares/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const mfaRoutes = require('./routes/mfa');
const jwksRoutes = require('./routes/jwks');
const keyRotationRoutes = require('./routes/keyRotation');
const coordinatorRoutes = require('./routes/coordinator');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy configuration
// Required when deployed behind a reverse proxy (Railway, Vercel, load balancers)
// This allows Express to correctly identify the client IP from X-Forwarded-For header
// Setting to 1 means trust the first proxy (Railway's proxy)
// Without this, express-rate-limit and req.ip will fail with ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-microservice', timestamp: new Date().toISOString() });
});

// API routes
app.use('/login', authRoutes);
app.use('/auth', authRoutes);
app.use('/silent-refresh', authRoutes);
app.use('/logout', authRoutes);
app.use('/mfa', mfaRoutes);
app.use('/.well-known', jwksRoutes);
// Key rotation routes (TODO: Add authentication/authorization in production)
app.use('/key-rotation', keyRotationRoutes);
// Coordinator API endpoint
app.use('/api', coordinatorRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auth microservice running on port ${PORT}`);
});

module.exports = app;

