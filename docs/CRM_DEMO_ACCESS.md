# CRM demo access and temporary sign-in

The CRM is **login-first**: the `/` route of the CRM build redirects to `/staff/login`. There is
no marketing page behind it, and unknown URLs also return to sign-in.

## Accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | `admin@omnidevelopment.co.uk` | `OmniDemo2026!` |
| Staff | `staff@omnidevelopment.co.uk` | `OmniStaff2026!` |

Both are throwaway review credentials. Rotate or delete them before any real customer data is
entered (see *Rotating a password* below).

## How the accounts are created

1. **First request bootstrap.** `php/api/index.php` calls `bootstrapAdministrator()` on every
   request. When no `owner`/`admin` row exists it creates one from `BOOTSTRAP_ADMIN_*` in
   `php/api/config.local.php` (valid email required, password at least 12 characters,
   `password_hash(..., PASSWORD_BCRYPT)`). The Express server does the same through
   `BOOTSTRAP_ADMIN_*` and `bcryptjs`.
2. **Explicit account creation or reset** (CLI only, never web-reachable):

   ```
   php php/tools/create-user.php --email=admin@omnidevelopment.co.uk --password='OmniDemo2026!' --name='Omni Owner' --role=owner
   php php/tools/create-user.php --email=staff@omnidevelopment.co.uk --password='OmniStaff2026!' --name='Omni Staff' --role=staff
   php php/tools/create-user.php --list
   ```

   Re-running with an existing email resets that account instead of creating a duplicate.
   The tool refuses to run outside the CLI SAPI and is excluded from deployment packages.

## Demo mode

`DEMO_MODE` is what makes the credentials visible on screen:

* `php/api/index.php` returns `demoMode` and `demoAccounts` from `/api/site-settings`.
* `server/server.ts` returns the same shape from `/api/site-settings`.
* `client/src/components/AdminWorkspace.tsx` renders the "Demo access" card on `/staff/login`
  only when `demoMode` is true, and fills the form on click.

Passwords are never compiled into the client bundle: they arrive from the API, and only while
`DEMO_MODE` is enabled.

```php
// php/api/config.local.php
'DEMO_MODE' => 'true',
'DEMO_LOGIN_EMAIL' => 'admin@omnidevelopment.co.uk',
'DEMO_LOGIN_PASSWORD' => 'OmniDemo2026!',
'DEMO_STAFF_EMAIL' => 'staff@omnidevelopment.co.uk',
'DEMO_STAFF_PASSWORD' => 'OmniStaff2026!',
```

Set `'DEMO_MODE' => 'false'` (and blank the four values) to remove the card and stop publishing
the credentials. Keep `STAGING_MODE=true` for the noindex header, the `robots.txt` disallow and
the hidden database status on `/health`.

## Building the login-first package

```
npm run package:crm
```

* Builds Vite with `--mode crm`, which loads `client/.env.crm` (`VITE_CRM_ONLY=true`).
  That file lives in `client/` because that is the Vite project root.
* Writes the package to `deployment/crm-public-html` (the marketing package keeps
  `deployment/php-public-html`, so the two can never overwrite each other).
* Adds `api/config.local.php.TEMPLATE.php` and removes `api/config.local.php` plus `api/tools/`.

`npm run build:php` still produces the marketing site unchanged: with `VITE_CRM_ONLY` unset the
`/` route renders the homepage as before.

## Rotating a password without SQL

```
php php/tools/create-user.php --email=admin@omnidevelopment.co.uk --password='new-long-password' --role=owner
```

Sessions do not need clearing for a password change to matter, but signing out everywhere is
safer after a rotation:

```sql
DELETE FROM staff_sessions;
```

Sessions are stored as SHA-256 hashes in `staff_sessions` and expire after 8 hours
(`omni_staff_session`, HttpOnly, Secure, SameSite).
