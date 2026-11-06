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
    'PUBLIC_PHONE' => '07928 149 731',
    'PUBLIC_EMAIL' => 'admin@omnidevelopment.co.uk',
    'PUBLIC_WHATSAPP' => 'https://wa.me/447928149731',
    // Optional absolute paths. Defaults are safe for a standard public_html install.
    'UPLOAD_DIR' => '',
    'PROJECT_UPLOAD_DIR' => '',
    // Google reCAPTCHA v2 tickbox on the contact and quote forms. Enforced only when both keys are set.
    // The site key is public; the secret key must only ever live in config.local.php on the server.
    'RECAPTCHA_SITE_KEY' => '6Lcl5BMuAAAAANdOrxtd9fTWj3vb28Zdm6tD98ah',
    'RECAPTCHA_SECRET_KEY' => '',
];
