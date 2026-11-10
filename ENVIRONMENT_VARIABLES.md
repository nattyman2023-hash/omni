# Environment variables

The repository contains names only in `.env.example`. Values below are required or optional depending on the deployment mode.

**Hostinger temporary site (PHP):** the live site runs the PHP package, which reads these values from `public_html/api/config.local.php` (or real server environment variables). Variables entered for a Node.js application are not visible to it. See `DEPLOYMENT_PHP.md`. Rows marked *Node only* do not apply to the PHP deployment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | production (Node only) | Enables production cookie and caching behaviour and forbids in-memory fallbacks. |
| `PORT` | Hostinger-provided (Node only) | Express listen port. |
| `APP_URL` | production | Canonical URL used in sitemap output. |
| `TRUST_PROXY` | behind Hostinger's proxy: `1` | Number of trusted proxy hops. Used for per-client sign-in rate limiting and audit IP hashes (PHP and Node). |
| `COOKIE_SECURE` | production | Set `true` when HTTPS is active. |
| `STAGING_MODE` | temporary review only | Set `true` to add noindex response protection and the staff-only review marker. |
| `OUTBOUND_MESSAGES_ENABLED` | temporary review only | Keep `false` until an approved outbound provider is configured. |
| `DATABASE_HOST` | production | MySQL hostname. |
| `DATABASE_PORT` | production | MySQL port, normally 3306. |
| `DATABASE_NAME` | production | MySQL database name. |
| `DATABASE_USER` | production | MySQL user. |
| `DATABASE_PASSWORD` | production | MySQL password. |
| `TEST_DATABASE_HOST` | MySQL verification only | Disposable test database hostname; never the live Omni database. |
| `TEST_DATABASE_PORT` | MySQL verification only | Disposable test database port; defaults to 3306. |
| `TEST_DATABASE_NAME` | MySQL verification only | Must clearly contain test, QA or sandbox and must not contain prod/production/live. |
| `TEST_DATABASE_USER` | MySQL verification only | Dedicated test database user. |
| `TEST_DATABASE_PASSWORD` | MySQL verification only | Dedicated test database password. |
| `SESSION_SECRET` | Node deployment only | Additional secret material for Node deployments. Staff session tokens are stored as SHA-256 hashes in MySQL. |
| `BOOTSTRAP_ADMIN_EMAIL` | one-time setup only | Database administrator email used only when no owner/admin exists. |
| `BOOTSTRAP_ADMIN_PASSWORD` | one-time setup only | Plaintext bootstrap input (minimum 12 characters) held only on the server; remove it after the first successful sign-in. Changing it later never alters an existing administrator. |
| `BOOTSTRAP_ADMIN_NAME` | optional | Display name for the one-time bootstrap administrator. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` | local development only | Node development fallback used only when no MySQL is configured. Ignored in production and by the PHP deployment; not needed once bootstrap authentication is used. |
| `EMAIL_PROVIDER` | when notifications enabled | Provider name for the email service layer. |
| `EMAIL_API_KEY` | when notifications enabled | Provider secret; never expose to Vite. |
| `EMAIL_FROM` | when notifications enabled | Approved sender address. |
| `ADMIN_NOTIFICATION_EMAIL` | when notifications enabled | Notification destination. |
| `PROJECT_UPLOAD_DIR` | optional | Local storage directory for staff-uploaded project images; defaults to `uploads/public/projects`. |
| `CRM_WEBHOOK_SECRET` | when the WordPress connector is used | Shared HMAC secret (32+ characters, e.g. `openssl rand -hex 32`) that the WordPress "Omni CRM Connector" plugin signs lead webhooks with. Enter the same value in WordPress under Settings → Omni CRM. Without it the webhook answers 503. |
| `DEEPSEEK_API_KEY` | optional CRM analyst | Server-pinned DeepSeek secret. Leave unset to save an encrypted key from CRM Settings instead. Never expose it to Vite. |
| `DEEPSEEK_MODEL` | optional CRM analyst | DeepSeek model name; defaults to `deepseek-chat`. |
| `PUBLIC_PHONE` | optional | Configurable public phone number. |
| `PUBLIC_EMAIL` | optional | Configurable public email. |
| `PUBLIC_WHATSAPP` | optional | Configurable `https://wa.me/` link. |
| `UPLOAD_DIR` | recommended | Persistent private upload directory. |
| `UPLOAD_MAX_FILE_SIZE` | optional | Deployment-level upload policy; the current application limit is 8 MB per file. |

When database variables are absent locally, the Node development server may use
in-memory preview records. In production there is no fallback for users, sessions,
leads, quotes or projects: `/api/health` returns HTTP 503 and forms return the honest storage-unavailable error. In
`STAGING_MODE=true`, health responses intentionally omit database details and
`robots.txt` disallows all crawlers.
