const request = require('supertest');
const { app } = require('../../functions/lib/index');

describe('GET /projects/:id/files', () => {
  test('returns 400 for invalid projectId', async () => {
    const res = await request(app).get('/projects/invalid-id/files').query({ userId: 'user@test.com' });
    expect(res.status).toBe(400);
  });
});
