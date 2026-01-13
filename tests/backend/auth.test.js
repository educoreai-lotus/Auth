const request = require('supertest');
const app = require('../../src/backend/app');

describe('Auth Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('auth-microservice');
    });
  });

  describe('GET /login/:provider', () => {
    it('should redirect for valid provider', async () => {
      const response = await request(app).get('/login/google');
      expect([302, 307]).toContain(response.status);
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app).get('/login/invalid');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /.well-known/jwks.json', () => {
    it('should return JWKS', async () => {
      const response = await request(app).get('/.well-known/jwks.json');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('keys');
      expect(Array.isArray(response.body.keys)).toBe(true);
    });
  });

  describe('POST /logout', () => {
    it('should clear cookie and return success', async () => {
      const response = await request(app)
        .post('/logout')
        .set('Cookie', 'access_token=test-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});

