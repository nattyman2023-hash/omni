import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

describe('CRM subdomain profile', () => {
  it('builds a login-first bundle through its own env profile and output folder', () => {
    const env = read('client', '.env.crm');
    const manifest = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const packager = read('scripts', 'build-php-deployment.cjs');

    expect(env).toContain('VITE_CRM_ONLY=true');
    expect(manifest.scripts['package:crm']).toContain('vite build --mode crm');
    expect(manifest.scripts['package:crm']).toContain('build-php-deployment.cjs --crm');
    expect(packager).toContain("process.argv.includes('--crm')");
    expect(packager).toContain("'crm-public-html'");
    expect(packager).toContain('config.local.php.TEMPLATE.php');
    expect(packager).toContain("path.join(output, 'tools')");
    // The marketing package must keep its own folder so the two can never overwrite each other.
    expect(packager).toContain("'php-public-html'");
  });

  it('sends anonymous visitors to the staff login screen instead of the marketing homepage', () => {
    const app = read('client', 'src', 'App.tsx');
    const mode = read('client', 'src', 'crmMode.ts');

    expect(mode).toContain('VITE_CRM_ONLY');
    expect(mode).toContain("export const CRM_ONLY");
    expect(app).toContain("import { CRM_ONLY, STAFF_LOGIN_PATH } from './crmMode';");
    expect(app).toContain('<Route path="/" element={CRM_ONLY ? <Navigate to={STAFF_LOGIN_PATH} replace /> : <RebuiltLayout><HomePage /></RebuiltLayout>} />');
    expect(app).toContain('<Route path="*" element={CRM_ONLY ? <Navigate to={STAFF_LOGIN_PATH} replace /> : <RebuiltLayout><NotFound /></RebuiltLayout>} />');
  });

  it('only advertises the demo sign-in accounts when demo mode is enabled', () => {
    const router = read('php', 'api', 'index.php');
    const express = read('server', 'server.ts');
    const config = read('php', 'api', 'config.example.php');
    const login = read('client', 'src', 'components', 'AdminWorkspace.tsx');

    expect(router).toContain("'demoMode' => flag('DEMO_MODE')");
    expect(router).toContain("'demoAccounts' => flag('DEMO_MODE') ? demoAccounts() : []");
    expect(router).toContain("'DEMO_LOGIN_PASSWORD'");
    expect(express).toContain('process.env.DEMO_MODE');
    expect(express).toContain('demoMode, demoAccounts');
    expect(config).toContain("'DEMO_MODE' => 'false'");
    expect(login).toContain('demoAccounts.length > 0');
    expect(login).toContain('/api/site-settings');
    // Passwords must never be baked into the client bundle as literals.
    expect(login).not.toContain('OmniDemo2026!');
    expect(login).not.toContain('OmniStaff2026!');
  });
});
