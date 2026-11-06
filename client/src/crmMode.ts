/**
 * Build-time deployment profile.
 *
 * The marketing website and the staff CRM share one codebase. The CRM subdomain
 * build (`npm run package:crm`, configured by `.env.crm`) sets VITE_CRM_ONLY=true
 * so the app opens on the staff sign-in screen instead of the marketing homepage,
 * and unknown URLs return to sign-in rather than the public 404 page.
 */
export const CRM_ONLY = String(import.meta.env.VITE_CRM_ONLY ?? '').trim().toLowerCase() === 'true';

/** Where anonymous visitors land when the CRM profile is active. */
export const STAFF_LOGIN_PATH = '/staff/login';
