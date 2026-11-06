<?php

/**
 * Live settings: copy this file to omni-crm-config.php ONE LEVEL ABOVE public_html (next to it,
 * not inside it) and fill in the values. Hostinger deploys replace everything inside public_html,
 * so a settings file kept there would be deleted on the next deploy; the file above it never is.
 *
 * Precedence for every key: environment variable > ../omni-crm-config.php > api/config.local.php
 * > built-in defaults. api/config.local.php still works for local development. Neither file may
 * ever be committed (both are in .gitignore).
 */
return [
    // The site's own HTTPS origin (no trailing slash). Used only for robots.txt and sitemap.xml.
    'APP_URL' => 'https://example.com',
    'DATABASE_HOST' => 'localhost',
    'DATABASE_PORT' => '3306',
    'DATABASE_NAME' => '',
    'DATABASE_USER' => '',
    'DATABASE_PASSWORD' => '',
    // One-time bootstrap values. Remove BOOTSTRAP_ADMIN_PASSWORD after login succeeds.
    'BOOTSTRAP_ADMIN_NAME' => 'Omni Administrator',
    'BOOTSTRAP_ADMIN_EMAIL' => '',
    'BOOTSTRAP_ADMIN_PASSWORD' => '',
    'COOKIE_SECURE' => 'true',
    // Hostinger serves the site through one proxy hop; used for per-client sign-in rate limiting.
    'TRUST_PROXY' => '1',
    'STAGING_MODE' => 'false',
    // Demo profile: shows the sign-in accounts below on /staff/login so a reviewer can get in.
    // Set to 'false' (and clear the values) before the CRM is used for real work.
    'DEMO_MODE' => 'false',
    'DEMO_LOGIN_EMAIL' => 'admin@omnidevelopment.co.uk',
    'DEMO_LOGIN_PASSWORD' => 'OmniDemo2026!',
    'DEMO_STAFF_EMAIL' => 'staff@omnidevelopment.co.uk',
    'DEMO_STAFF_PASSWORD' => 'OmniStaff2026!',
    'PUBLIC_PHONE' => '07928 149 731',
    'PUBLIC_EMAIL' => 'admin@omnidevelopment.co.uk',
    'PUBLIC_WHATSAPP' => 'https://wa.me/447928149731',
    // Optional absolute paths. Defaults are safe for a standard public_html install.
    'UPLOAD_DIR' => '',
    'PROJECT_UPLOAD_DIR' => '',
    // Shared secret for the WordPress "Omni CRM Connector" plugin (at least 32 characters,
    // e.g. `openssl rand -hex 32`). Enter the same value in WordPress under Settings > Omni CRM.
    'CRM_WEBHOOK_SECRET' => '',

    // ---- Email, e-signature and follow-ups (CRM sales) -------------------------------------
    // RECOMMENDED: leave every mail key below empty and configure Zoho from the CRM itself
    // (Settings → Email). A non-empty value here OVERRIDES what is saved in the CRM, so only fill
    // a key in to pin it. Passwords saved in the CRM are stored encrypted (AES-256-GCM).
    //
    // omnidevelopment.co.uk uses Zoho Mail, UK data centre. The built-in defaults already are:
    //   SMTP smtppro.zoho.uk, port 465, 'ssl'  (or port 587 with 'tls')
    //   IMAP imappro.zoho.uk, port 993, mailbox INBOX
    // Use an app-specific password (accounts.zoho.uk → Security → App passwords) and enable IMAP
    // access in Zoho Mail (Settings → Mail Accounts → IMAP). Zoho only sends as the signed-in
    // mailbox or its verified aliases, so EMAIL_FROM must be that mailbox or an alias of it.
    //
    // Master switch: 'true' sends; 'false' saves emails as "queued" and never sends them.
    'OUTBOUND_MESSAGES_ENABLED' => '',
    // SMTP_SECURE is 'ssl' (implicit TLS, port 465), 'tls' (STARTTLS, port 587) or 'none' (testing only).
    'SMTP_HOST' => '',            // default smtppro.zoho.uk
    'SMTP_PORT' => '',            // default 465
    'SMTP_SECURE' => '',          // default ssl
    'SMTP_USER' => '',            // e.g. admin@omnidevelopment.co.uk (also the envelope sender)
    'SMTP_PASSWORD' => '',        // Zoho app-specific password; never logged or returned by the API
    'EMAIL_FROM' => '',           // e.g. admin@omnidevelopment.co.uk (defaults to SMTP_USER)
    'EMAIL_FROM_NAME' => '',      // default Omni Developments
    'EMAIL_REPLY_TO' => '',
    // Inbox sync (needs the PHP imap extension). Replies are matched to leads by sender address.
    'IMAP_HOST' => '',            // default imappro.zoho.uk
    'IMAP_PORT' => '',            // default 993
    'IMAP_USER' => '',            // e.g. admin@omnidevelopment.co.uk
    'IMAP_PASSWORD' => '',        // same app-specific password
    'IMAP_MAILBOX' => '',         // default INBOX
    // Origin used in customer signing links (no trailing slash). Defaults to APP_URL.
    'SIGNING_BASE_URL' => '',
    // At least 32 random characters enables GET /api/cron/crm?key=... for a Hostinger cron job
    // (follow-ups + inbox sync). Shorter or empty disables the endpoint (it answers 404).
    'CRM_CRON_SECRET' => '',
];
