import type { Server } from 'node:http';
import net from 'node:net';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const managedKeys = [
  'NODE_ENV', 'STAGING_MODE', 'TRUST_PROXY', 'COOKIE_SECURE',
  'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD',
  'BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD',
] as const;
const originalEnvironment = Object.fromEntries(managedKeys.map(key => [key, process.env[key]]));

let server: Server;
let baseUrl: string;

async function closedPort() {
  return await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') return reject(new Error('No port.'));
      probe.close(() => resolve(address.port));
    });
  });
}

const signIn = (forwardedFor: string) => fetch(`${baseUrl}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor },
  body: JSON.stringify({ email: 'owner@example.invalid', password: 'not-the-password-123' }),
});

describe('staff authentication with an unreachable production database', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.STAGING_MODE = 'false';
    process.env.TRUST_PROXY = '1';
    process.env.DATABASE_HOST = '127.0.0.1';
    process.env.DATABASE_PORT = String(await closedPort());
    process.env.DATABASE_NAME = 'omni_unreachable_test';
    process.env.DATABASE_USER = 'nobody';
    process.env.DATABASE_PASSWORD = 'unreachable-secret-value';
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;

    vi.resetModules();
    const app = (await import('./server.js')).default as unknown as Express;
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port.');
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const key of managedKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reports the staff system as unavailable without leaking connection details', async () => {
    const response = await signIn('203.0.113.10');
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ message: 'The staff system is temporarily unavailable. Please contact the administrator.' });
    expect(JSON.stringify(body)).not.toContain('unreachable-secret-value');

    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(503);
    expect(await health.json()).toMatchObject({ status: 'degraded', database: 'unavailable' });
  });

  it('rate limits sign-in per client address when TRUST_PROXY is a hop count', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) expect((await signIn('203.0.113.20')).status).not.toBe(429);
    const blocked = await signIn('203.0.113.20');
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ message: 'Too many sign-in attempts. Please wait and try again.' });
    expect((await signIn('203.0.113.21')).status).toBe(503);
  });

  it('keeps staff routes closed and lets a browser sign out without a live session', async () => {
    expect((await fetch(`${baseUrl}/api/admin/session`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/admin/leads`)).status).toBe(401);
    const logout = await fetch(`${baseUrl}/api/admin/logout`, { method: 'POST', headers: { Cookie: `omni_staff_session=${'b'.repeat(64)}` } });
    expect(logout.status).toBe(204);
    expect(String(logout.headers.get('set-cookie'))).toMatch(/omni_staff_session=;/);
  });
});
