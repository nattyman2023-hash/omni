# PHP + MySQL deployment

This is the simplest shared-hosting deployment for the Omni site. The React/Vite frontend is built into static HTML, CSS and JavaScript. PHP serves the existing `/api/*` contract, and MySQL stores enquiries, quotes, staff users and project content.

## Server requirements

- Apache with `mod_rewrite`
- PHP 8.1 or newer
- PHP extensions: PDO MySQL, fileinfo and session
- MySQL 8 or MariaDB 10.4+
- HTTPS before staff login or public launch

## Build the upload package

From the repository root:

```bash
npm ci
npm run build:php
```

Upload the **contents** of `deployment/php-public-html/` to the domain's `public_html` directory. Hidden files must be included, especially `.htaccess`.

## Configure MySQL

1. Create a database and database user in Hostinger.
2. Import `deploy/schema.sql` using phpMyAdmin.
3. In `public_html/api`, copy `config.example.php` to `config.local.php`.
4. Fill in the database credentials and the final HTTPS `APP_URL`.
5. Keep `config.local.php` on the server only. It is excluded from Git and from future generated deployment packages.

The default quote-upload directory is protected by `api/private/.htaccess`. Project images are intentionally public under `uploads/projects`. Both locations must be writable by PHP; permissions such as `750` for directories are preferred when supported by the host.

## Create the first staff account

Using Hostinger SSH or its terminal, run this from `public_html`:

```bash
php scripts/create-admin.php owner@example.com 'use-a-long-unique-password' 'Owner Name'
```

The command stores only a bcrypt password hash. Avoid placing the password in a shared support message or committing it to a file.

## Verify

Open these URLs after upload:

- `/api/health` — should return status `ok` and database `connected`.
- `/projects` — should load the supplied project records.
- `/staff/login` — should accept the account created above.

Submit one test contact enquiry and one test quote with an attachment, then confirm the rows in MySQL. Email notifications remain deliberately disabled; enquiries are safely stored in MySQL for staff follow-up.

If this is a private review deployment, set `STAGING_MODE` to `true` in `config.local.php`. Change it to `false` for launch so search engines can index the site.

## Updating the site

Run `npm run build:php` again and upload the generated files. Preserve the server's existing `api/config.local.php` and uploaded files. The build package never contains either one.
