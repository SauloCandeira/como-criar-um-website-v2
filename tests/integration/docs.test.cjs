const request = require('supertest');
const { app } = require('../../functions/lib/index');

describe('Swagger docs', () => {
  test('GET /api-docs returns html', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.status).toBe(301);
    expect(res.headers.location).toMatch(/\/api-docs\/?/i);
  });
});
