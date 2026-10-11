# Environment variables

The repository contains names only in `.env.example`. Values below are required or optional depending on the deployment mode.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | production | Enables production cookie and caching behaviour. |
| `PORT` | Hostinger-provided | Express listen port. |
| `APP_URL` | production | Canonical URL used in sitemap output. |
| `TRUST_PROXY` | when behind Hostinger proxy | Express proxy trust setting; Hostinger handover uses `1`. |
| `COOKIE_SECURE` | production | Set `true` when HTTPS is active. |
| `STAGING_MODE` | temporary review only | Set `true` to add noindex response protection and the staff-only review marker. |
| `OUTBOUND_MESSAGES_ENABLED` | temporary review only | Keep `false` until an approved outbound provider is configured. |
| `DATABASE_HOST` | production | MySQL hostname. |
| `DATABASE_PORT` | production | MySQL port, normally 3306. |
| `DATABASE_NAME` | production | MySQL database name. |
| `DATABASE_USER` | production | MySQL user. |
| `DATABASE_PASSWORD` | production | MySQL password. |
| `SESSION_SECRET` | configure now | Reserved for the planned persistent session adapter; the current temporary build still uses process-memory sessions. |
| `BOOTSTRAP_ADMIN_EMAIL` | one-time setup only | Database administrator email used only when no owner/admin exists. |
| `BOOTSTRAP_ADMIN_PASSWORD` | one-time setup only | Plaintext bootstrap input held only in Hostinger environment settings; remove after first login. |
| `BOOTSTRAP_ADMIN_NAME` | optional | Display name for the one-time bootstrap administrator. |
| `EMAIL_PROVIDER` | when notifications enabled | Provider name for the email service layer. |
| `EMAIL_API_KEY` | when notifications enabled | Provider secret; never expose to Vite. |
| `EMAIL_FROM` | when notifications enabled | Approved sender address. |
| `ADMIN_NOTIFICATION_EMAIL` | when notifications enabled | Notification destination. |
| `ADMIN_EMAIL` | before staff login | Staff login email. |
| `ADMIN_PASSWORD_HASH` | before staff login | Bcrypt password hash, never plaintext. |
| `PROJECT_UPLOAD_DIR` | optional | Local storage directory for staff-uploaded project images; defaults to `uploads/public/projects`. |
| `PUBLIC_PHONE` | optional | Configurable public phone number. |
| `PUBLIC_EMAIL` | optional | Configurable public email. |
| `PUBLIC_WHATSAPP` | optional | Configurable `https://wa.me/` link. |
| `UPLOAD_DIR` | recommended | Persistent private upload directory. |
| `UPLOAD_MAX_FILE_SIZE` | optional | Deployment-level upload policy; the current application limit is 8 MB per file. |

When the database variables are absent locally, `/api/health` reports `not-configured` and contact/quote submissions use a local in-memory fallback for development verification. Do not use that mode for production. In `STAGING_MODE=true`, health responses intentionally omit database state and `robots.txt` disallows all crawlers.
