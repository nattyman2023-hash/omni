import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('PHP shared-hosting deployment', () => {
  it('keeps the frontend API contract in the PHP router', () => {
    const router = fs.readFileSync(path.join(root, 'php', 'api', 'index.php'), 'utf8');
    const routes = [
      '/health',
      '/site-settings',
      '/projects',
      '/contact',
      '/quote',
      '/admin/login',
      '/admin/logout',
      '/admin/session',
      '/admin/summary',
      '/admin/projects',
      '/admin/project-images',
      '/admin/leads',
      '/admin/quotes',
      '/admin/site-visits',
      '/admin/calendar',
      '/admin/tasks',
      '/admin/invoices',
    ];
    routes.forEach((route) => expect(router).toContain(`'${route}'`));
  });

  it('ships rewrite and private-upload protection without credentials', () => {
    const rootRewrite = fs.readFileSync(path.join(root, 'php', '.htaccess'), 'utf8');
    const privateRewrite = fs.readFileSync(path.join(root, 'php', 'api', 'private', '.htaccess'), 'utf8');
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

    expect(rootRewrite).toContain('api/index.php');
    expect(rootRewrite).toContain('RewriteRule ^ index.html');
    expect(rootRewrite).toContain('RewriteRule ^health$ api/index.php?resource=health');
    expect(privateRewrite).toContain('Require all denied');
    expect(ignore).toContain('php/api/config.local.php');
    expect(fs.existsSync(path.join(root, 'php', 'api', 'config.local.php'))).toBe(false);
  });

  it('reads live settings from outside the web root so deploys cannot delete them', () => {
    const router = fs.readFileSync(path.join(root, 'php', 'api', 'index.php'), 'utf8');
    const example = fs.readFileSync(path.join(root, 'php', 'api', 'config.example.php'), 'utf8');
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    expect(router).toContain("dirname(__DIR__, 2) . '/omni-crm-config.php'");
    // Environment first, then the file outside public_html, then api/config.local.php.
    expect(router).toMatch(/\[configFileOutsideWebRoot\(\), __DIR__ \. '\/config\.local\.php'\]/);
    expect(router.indexOf('getenv($key)')).toBeLessThan(router.indexOf('foreach ($sources as $source)'));
    expect(example).toContain('omni-crm-config.php');
    for (const key of ['OUTBOUND_MESSAGES_ENABLED', 'SMTP_HOST', 'SMTP_SECURE', 'IMAP_HOST', 'SIGNING_BASE_URL', 'CRM_CRON_SECRET']) {
      expect(example).toContain(`'${key}'`);
      expect(router).toContain(`'${key}'`);
    }
    expect(ignore).toContain('omni-crm-config.php');
  });

  it('ships the auto-applied migrations into the web-denied private folder', () => {
    const build = fs.readFileSync(path.join(root, 'scripts', 'build-php-deployment.cjs'), 'utf8');
    const sales = fs.readFileSync(path.join(root, 'php', 'api', 'crm_sales.php'), 'utf8');
    expect(build).toContain("path.join(output, 'api', 'private', 'migrations')");
    expect(sales).toContain("__DIR__ . '/private/migrations'");
    expect(fs.existsSync(path.join(root, 'database', 'migrations', '005_crm_sales.sql'))).toBe(true);
  });

  it('uses persistent database sessions and context-specific login errors', () => {
    const router = fs.readFileSync(path.join(root, 'php', 'api', 'index.php'), 'utf8');
    const migration = fs.readFileSync(path.join(root, 'database', 'migrations', '003_staff_sessions_and_crm.sql'), 'utf8');

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS staff_sessions');
    expect(router).toContain("hash('sha256', $token)");
    expect(router).toContain('Email or password is incorrect.');
    expect(router).toContain('Staff access has not been configured.');
    expect(router).toContain('The staff system is temporarily unavailable. Please contact the administrator.');
    expect(router).not.toContain('session_start()');
  });
});
