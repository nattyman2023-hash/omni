import type { Server } from 'node:http';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const managedKeys = [
  'NODE_ENV', 'STAGING_MODE', 'OUTBOUND_MESSAGES_ENABLED',
  'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD',
] as const;
const originalEnvironment = Object.fromEntries(managedKeys.map(key => [key, process.env[key]]));

let server: Server;
let baseUrl: string;

describe('production database requirement', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.STAGING_MODE = 'true';
    process.env.OUTBOUND_MESSAGES_ENABLED = 'false';
    for (const key of ['DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD']) delete process.env[key];

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

  it('reports degraded health without exposing database diagnostics in staging', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body).not.toHaveProperty('database');
  });

  it('refuses contact submissions honestly instead of using memory', async () => {
    const response = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 1 QA',
        email: 'phase1-contact@example.invalid',
        phone: '07000000000',
        message: 'Database-unavailable production behaviour verification.',
        preferredContact: 'Email',
        source: 'phase-1-test',
        website: '',
        consent: true,
      }),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "We couldn't send your enquiry, please call or email us." });
  });

  it('refuses quote submissions before writing files', async () => {
    const form = new FormData();
    Object.entries({
      projectType: 'Home Extension',
      propertyType: 'Semi-detached',
      postcode: 'M20 1AA',
      description: 'Database-unavailable quote behaviour verification.',
      stage: 'Exploring options',
      budget: '',
      start: 'ASAP',
      contactName: 'Phase 1 QA',
      email: 'phase1-quote@example.invalid',
      phone: '07000000000',
      preferredContact: 'Email',
      consent: 'true',
    }).forEach(([key, value]) => form.append(key, value));

    const response = await fetch(`${baseUrl}/api/quote`, { method: 'POST', body: form });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "We couldn't send your enquiry, please call or email us." });
  });
});
