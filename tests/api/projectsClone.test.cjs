const request = require('supertest');
const { app } = require('../../functions/lib/index');

describe('POST /projects/clone', () => {
  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/projects/clone').send({});
    expect(res.status).toBe(400);
  });
});
