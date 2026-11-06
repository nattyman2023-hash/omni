# PHP + MySQL deployment (Hostinger shared hosting)

This is how the temporary Hostinger review site runs. The live response headers
(`X-Powered-By: PHP/8.3`, `/api/health` → `omni-development-site-php`) confirm that
the site is served by this PHP package, not the Node.js application. The React/Vite
frontend is built into static files, PHP serves the `/api/*` contract, and MySQL
stores enquiries, quotes, staff users, staff sessions and project content.

Node-only settings such as `NODE_ENV`, `PORT` and `SESSION_SECRET` have no effect
on this deployment.

## Server requirements

- Apache/LiteSpeed with `mod_rewrite` (Hostinger default)
- PHP 8.1 or newer (Hostinger currently runs 8.3)
- PHP extensions: PDO MySQL and fileinfo
- MySQL 8 or MariaDB 10.4+
- HTTPS enabled before anyone signs in

## Build the upload package

From the repository root:

```bash
npm ci
npm run build:php
```

Upload the **contents** of `deployment/php-public-html/` to the site's `public_html`
directory. Include hidden files, especially `.htaccess` and `api/.htaccess`.
The package never contains `api/config.local.php` or uploaded files, so an update
upload does not overwrite them.

## 1. Create and import the database

1. In hPanel → **Databases → MySQL Databases**, create a database and a user, and
   grant the user all privileges on that database.
2. Open **phpMyAdmin** for that database, choose **Import**, select
   `deploy/schema.sql` from this repository and run it.
   - The import is repeatable: every table uses `CREATE TABLE IF NOT EXISTS` and
     seed rows are guarded, so importing it again is safe.
   - It creates 22 tables, including `users`, `staff_sessions`,
     `activity_audit_records`, `contact_enquiries`, `quote_requests`,
     `quote_request_files`, `projects` and the `crm_*` tables, with 11 foreign keys.
   - Check the database name shown in phpMyAdmin before importing. Never import into
     the live Omni database.

Command-line alternative where SSH is available (Node 20+ on the host):

```bash
DATABASE_HOST=... DATABASE_PORT=3306 DATABASE_NAME=... DATABASE_USER=... DATABASE_PASSWORD=... npm run db:migrate
```

`db:migrate` takes a lock, applies only migrations not yet recorded in
`schema_migrations`, closes its connection, and prints no credentials.

## 2. Configure the site

On Hostinger shared hosting, PHP does **not** read variables entered for a Node.js
application. Put the settings in `public_html/api/config.local.php`:

1. In **File Manager**, copy `public_html/api/config.example.php` to
   `public_html/api/config.local.php`.
2. Fill in the values:

```php
'APP_URL' => 'https://<current-site-domain>', // the site's own HTTPS origin, no trailing slash
'DATABASE_HOST' => 'localhost',          // Hostinger MySQL host is normally localhost
'DATABASE_PORT' => '3306',
'DATABASE_NAME' => 'u123456789_omni',    // exactly as shown in hPanel
'DATABASE_USER' => 'u123456789_omni',
'DATABASE_PASSWORD' => '...',
'COOKIE_SECURE' => 'true',
'TRUST_PROXY' => '1',
'STAGING_MODE' => 'true',                 // temporary review: noindex
'BOOTSTRAP_ADMIN_NAME' => 'Owner name',
'BOOTSTRAP_ADMIN_EMAIL' => 'owner@...',
'BOOTSTRAP_ADMIN_PASSWORD' => 'a long unique password (12+ characters)',
'RECAPTCHA_SITE_KEY' => '6Lcl5BMuAAAAANdOrxtd9fTWj3vb28Zdm6tD98ah',
'RECAPTCHA_SECRET_KEY' => '...',          // from the reCAPTCHA admin console; never commit
```

With both reCAPTCHA keys set, the contact and quote forms show Google's
"I'm not a robot" tickbox and the API rejects submissions without a valid token.
Leave either key empty to switch the check off. The key is registered for
`omnidevelopment.co.uk` (subdomains included); add any temporary review domain
under the key's **Domains** list in the reCAPTCHA admin console, or the widget
shows "Invalid domain for site key".

`APP_URL` is only used for `robots.txt` and `sitemap.xml`. The application never
hard-codes a domain; the browser always calls same-origin `/api/...` paths.

`config.local.php` is ignored by Git, excluded from every generated package and
blocked from direct download because it is PHP.

## 3. Verify the database connection

Open `https://<site>/health` (or `/api/health`):

| Response | Meaning |
| --- | --- |
| `200` `{"status":"ok","database":"connected"}` | Ready. |
| `503` `"database":"not-configured"` | `config.local.php` is missing or has an empty database value. |
| `503` `"database":"unavailable"` | Wrong host, name, user or password, or `deploy/schema.sql` has not been imported. |

With `STAGING_MODE` set to `true`, the `database` field is deliberately omitted, so set
it to `false` temporarily while diagnosing. Database passwords are never logged or returned.

## 4. Sign in for the first time

Open `/staff/login` and sign in with the bootstrap email and password.

- The first sign-in creates an `owner` account **only if no owner or admin exists**,
  stores a bcrypt hash, and never logs or returns the password.
- Later sign-ins never overwrite or recreate that account, even if the bootstrap
  values change.
- **After the first successful sign-in, delete the `BOOTSTRAP_ADMIN_PASSWORD` line
  from `config.local.php`.**
- The legacy `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` settings are not used by the PHP
  deployment and are not needed.

Sign-in messages:

| Situation | Message shown |
| --- | --- |
| Wrong email or password (identical for unknown emails) | Email or password is incorrect. |
| Database unreachable or schema missing | The staff system is temporarily unavailable. Please contact the administrator. |
| No database settings, or no administrator and no bootstrap values | Staff access has not been configured. |
| More than 10 attempts in 15 minutes from one address | Too many sign-in attempts. Please wait and try again. |
| Anything else | We couldn't sign you in. Please try again. |

## Session security

- Random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` when
  `COOKIE_SECURE` is `true`; 8-hour expiry.
- Only a SHA-256 hash of the token is stored, in `staff_sessions` (MySQL). No PHP
  file sessions are used.
- Each sign-in issues a new token and removes the user's previous sessions.
- Sign-out deletes the server-side session and clears the cookie, even if the session
  has already expired.
- Every `/api/admin/*` endpoint checks the session server-side. Staff pages redirect
  to `/staff/login` when there is no valid session, and `/staff/login` redirects to
  `/staff` when there is one.
- Successful sign-ins, failed sign-ins, bootstrap and sign-out are written to
  `activity_audit_records` with hashed email and IP only, never passwords.
- `TRUST_PROXY=1` makes rate limiting use the client address supplied by Hostinger's
  proxy instead of the proxy's own address.

## Smoke test after upload

1. `/health` returns `status: ok`, `database: connected`.
2. `/api/admin/summary` returns `401` before signing in.
3. Sign in at `/staff/login`; refresh `/staff`, `/staff/leads`, `/staff/quotes`,
   `/staff/projects`, `/staff/calendar`, `/staff/tasks` and `/staff/invoices` directly.
4. Submit one contact enquiry and one quote with a small JPG; both appear under
   **Leads** and **Quotes**.
5. Sign out; `/staff` returns to the sign-in page.
6. Remove `BOOTSTRAP_ADMIN_PASSWORD` from `config.local.php`.

Email notifications remain deliberately disabled; enquiries are stored in MySQL for
staff follow-up.

## Updating the site

Run `npm run build:php` again and upload the generated files. Keep the server's
`api/config.local.php`, `api/private/uploads/` and `uploads/projects/`.
