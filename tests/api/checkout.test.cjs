const request = require('supertest');
const { app } = require('../../functions/lib/index');

describe('POST /checkout', () => {
  test('returns 400 when payload is missing', async () => {
    const res = await request(app).post('/checkout').send({});
    expect(res.status).toBe(400);
  });
});
