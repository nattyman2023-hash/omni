<?php

/**
 * Copy this file to config.local.php on the server and fill in the values.
 * config.local.php is ignored by Git and must never be committed.
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
];
