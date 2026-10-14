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
      '/admin/summary',
      '/admin/projects',
      '/admin/project-images',
    ];
    routes.forEach((route) => expect(router).toContain(`'${route}'`));
  });

  it('ships rewrite and private-upload protection without credentials', () => {
    const rootRewrite = fs.readFileSync(path.join(root, 'php', '.htaccess'), 'utf8');
    const privateRewrite = fs.readFileSync(path.join(root, 'php', 'api', 'private', '.htaccess'), 'utf8');
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

    expect(rootRewrite).toContain('api/index.php');
    expect(rootRewrite).toContain('RewriteRule ^ index.html');
    expect(privateRewrite).toContain('Require all denied');
    expect(ignore).toContain('php/api/config.local.php');
    expect(fs.existsSync(path.join(root, 'php', 'api', 'config.local.php'))).toBe(false);
  });
});
