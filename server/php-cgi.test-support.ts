import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { availablePort, type DbConfig } from './mysql.test-support';

/*
 * Runs php/api/index.php through php-cgi, one process per request as on shared hosting.
 * Requires PHP_CGI_BINARY (php-cgi 8.1+ with pdo_mysql and fileinfo); PHP_INI_FILE is optional
 * (passed as both -c and PHPRC).
 */

export const phpApiScript = path.resolve('php', 'api', 'index.php');

export function requiredPhpCgi() {
  const binary = process.env.PHP_CGI_BINARY;
  if (!binary) throw new Error('PHP API verification requires PHP_CGI_BINARY (path to php-cgi). No test was skipped.');
  return binary;
}

export type PhpServer = { baseUrl: string; close: () => Promise<void> };

export async function startPhp(settings: Record<string, string>): Promise<PhpServer> {
  const binary = requiredPhpCgi();
  const phpIni = process.env.PHP_INI_FILE;
  const script = phpApiScript;
  const port = await availablePort();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url || '/', 'http://local');
      const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        ...settings,
        // php-cgi ignores command-line switches such as -c once it sees CGI variables, so the ini
        // file must also be passed through PHPRC or extensions like pdo_mysql are not loaded.
        ...(phpIni ? { PHPRC: phpIni } : {}),
        GATEWAY_INTERFACE: 'CGI/1.1', SERVER_PROTOCOL: 'HTTP/1.1', REDIRECT_STATUS: '200',
        REQUEST_METHOD: req.method || 'GET', SCRIPT_FILENAME: script, SCRIPT_NAME: '/api/index.php',
        REQUEST_URI: req.url || '/', QUERY_STRING: url.pathname === '/health' ? 'resource=health' : url.search.slice(1),
        CONTENT_LENGTH: String(body.length), CONTENT_TYPE: String(req.headers['content-type'] || ''),
        REMOTE_ADDR: '127.0.0.1', SERVER_NAME: '127.0.0.1', SERVER_PORT: String(port),
      };
      for (const [key, value] of Object.entries(req.headers)) env[`HTTP_${key.toUpperCase().replace(/-/g, '_')}`] = Array.isArray(value) ? value.join(', ') : String(value);
      const child = spawn(binary, phpIni ? ['-c', phpIni] : [], { env, cwd: path.dirname(script) });
      const output: Buffer[] = [];
      child.stdout.on('data', chunk => output.push(chunk as Buffer));
      // PHP_CGI_STDERR=1 echoes PHP's error log (php-cgi writes it to stderr) while debugging tests.
      if (process.env.PHP_CGI_STDERR === '1') child.stderr.on('data', chunk => process.stderr.write(chunk));
      child.on('close', () => {
        const raw = Buffer.concat(output);
        let split = raw.indexOf('\r\n\r\n');
        let separator = 4;
        if (split < 0) { split = raw.indexOf('\n\n'); separator = 2; }
        const head = split < 0 ? '' : raw.subarray(0, split).toString();
        let status = 200;
        const headers: Record<string, string | string[]> = {};
        for (const line of head.split(/\r?\n/)) {
          const index = line.indexOf(':');
          if (index < 0) continue;
          const name = line.slice(0, index).trim();
          const value = line.slice(index + 1).trim();
          if (name.toLowerCase() === 'status') status = parseInt(value, 10);
          else if (name.toLowerCase() === 'set-cookie') headers['set-cookie'] = [...((headers['set-cookie'] as string[]) || []), value];
          else headers[name] = value;
        }
        res.writeHead(status, headers);
        res.end(split < 0 ? raw : raw.subarray(split + separator));
      });
      child.stdin.end(body);
    });
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise(resolve => server.close(() => resolve())) };
}

export const databaseSettings = (config: DbConfig) => ({
  DATABASE_HOST: config.host, DATABASE_PORT: String(config.port), DATABASE_NAME: config.database,
  DATABASE_USER: config.user, DATABASE_PASSWORD: config.password,
});

// The PHP rate limiter keeps its buckets in the system temp directory for 15 minutes, across test runs.
// Every request therefore gets a random client address so neither tests nor repeated runs share a bucket.
export const clientAddress = () => `10.${[...crypto.randomBytes(3)].join('.')}`;

export async function login(baseUrl: string, email: string, password: string, address = clientAddress()) {
  return await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': address },
    body: JSON.stringify({ email, password }),
  });
}

export const sessionCookie = (response: Response) => String(response.headers.get('set-cookie') || '').split(';', 1)[0];
