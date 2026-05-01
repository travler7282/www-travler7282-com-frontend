import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './index';

describe('sdrx backend', () => {
  it('returns healthy status', async () => {
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns current SDR status', async () => {
    const response = await request(app).get('/api/sdr/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('frequencyHz');
    expect(response.body).toHaveProperty('mode');
  });

  it('rejects invalid tune payloads', async () => {
    const response = await request(app).post('/api/sdr/tune').send({ frequencyHz: 1 });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('frequencyHz');
  });
});