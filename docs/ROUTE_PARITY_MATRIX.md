# Route Parity Matrix

Generated: 2026-09-04T18:23:48.122Z

Router: `client/src/App.tsx` line 296. Layouts: **RebuiltLayout** (Stitch-matched Header/Footer + Tailwind) vs **Layout** (legacy generic).

## Status definitions

- **MATCHED** — faithfully translated from Stitch HTML
- **PARTIAL** — some Stitch sections exist but incomplete or content was sanitised
- **STALE** — route exists but displays earlier generic design
- **MISSING** — route/component does not exist
- **NO STITCH REFERENCE** — no matching HTML found

## Route → Component → Stitch source

| Route | Stitch ref | Component | Source | Layout | Stitch file | Status | Missing work |
|---|:-:|---|---|---|---|---|---|
| `/` | Yes | HomePage | `client/src/pages/HomePage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_home\code.html` | MATCHED | Batch 1 — verbatim Stitch translation |
| `/services` | Yes | ServicesPage | `client/src/pages/ServicesPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_services\code.html` | PARTIAL | Earlier batch — needs Stitch recheck |
| `/services/home-extensions` | Yes | HomeExtensionsPage | `client/src/pages/HomeExtensionsPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_home_extensions\code.html` | MATCHED | Batch 1 — verbatim Stitch translation |
| `/services/bathroom-renovations` | Yes | BathroomRenovationsPage | `client/src/pages/BathroomRenovationsPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_bathroom_installation\code.html` | PARTIAL | Content sanitised — needs verbatim recheck |
| `/services/:slug` | No | ServiceDetailPage | `client/src/App.tsx (inline)` | RebuiltLayout | — | STALE | Generic template — uses canonical header now |
| `/projects` | No | ProjectsPage | `client/src/pages/ProjectsPage.tsx` | RebuiltLayout | — | MATCHED | Reconstructed — 6 sections, Stitch card design language, no Stitch listing HTML exists |
| `/projects/:slug` | Yes | ProjectCaseStudyPage | `client/src/pages/ProjectCaseStudyPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_project_case_study\code.html` | PARTIAL | Content sanitised — needs verbatim recheck |
| `/how-it-works` | Yes | HowItWorksPage | `client/src/pages/HowItWorksPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_how_it_works\code.html` | PARTIAL | Content sanitised — needs verbatim recheck |
| `/about` | Yes | AboutPage | `client/src/pages/AboutPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_about_us\code.html` | PARTIAL | Content sanitised — needs verbatim recheck |
| `/reviews` | Yes | ReviewsPage | `client/src/pages/ReviewsPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_client_reviews\code.html` | MATCHED | Reconstructed — 6 sections from code(6).html, awaiting-approval state (no fabricated reviews) |
| `/areas` | Yes | AreasPage | `client/src/pages/AreasPage.tsx` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_areas_we_cover\code.html` | PARTIAL | Content sanitised — needs verbatim recheck |
| `/areas/:slug` | Yes | AreaDetailPage | `client/src/App.tsx (inline)` | Layout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_manchester_location_page\code.html` | STALE | Generic template — Stitch location page exists |
| `/guides` | Yes | GuidesPage | `client/src/App.tsx (inline)` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_guides_advice\code.html` | STALE | Generic template — uses canonical header, needs Stitch reconstruction |
| `/guides/:slug` | Yes | GuideDetailPage | `client/src/App.tsx (inline)` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_guide_article\code.html` | STALE | Generic template + slug mismatch (should be /guides/greater-manchester-home-extension-guide) |
| `/contact` | Yes | ContactPage | `client/src/App.tsx (inline)` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_contact_us\code.html` | STALE | Generic template — uses canonical header, needs Stitch reconstruction |
| `/quote` | Yes | QuotePage | `client/src/App.tsx (inline)` | RebuiltLayout | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_request_a_quote\code.html` | STALE | Generic template — uses canonical header, Stitch quote-wizard exists |
| `/quote/thank-you` | Yes | QuoteThankYouPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform\stitch_omni_developments_digital_platform\omni_developments_manchester_quote_confirmation\code.html` | STALE | Generic template — Stitch confirmation exists |
| `/privacy` | No | PolicyPage | `client/src/App.tsx (inline)` | RebuiltLayout | — | NO STITCH REFERENCE | No Stitch HTML — uses canonical header + shared design system |
| `/cookies` | No | PolicyPage | `client/src/App.tsx (inline)` | RebuiltLayout | — | NO STITCH REFERENCE | No Stitch HTML — uses canonical header + shared design system |
| `/terms` | No | PolicyPage | `client/src/App.tsx (inline)` | RebuiltLayout | — | NO STITCH REFERENCE | No Stitch HTML — uses canonical header + shared design system |
| `/staff/login` | Yes | AdminLoginPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_crm_login\code.html` | STALE | Generic template — Stitch CRM login exists |
| `/staff` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_crm_dashboard\code.html` | STALE | Generic template — Stitch CRM dashboard exists |
| `/staff/leads` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_lead_pipeline\code.html` | STALE | Generic template — Stitch lead pipeline exists |
| `/staff/site-visits` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_site_visit_inspection\code.html` | STALE | Generic template — Stitch site visit exists |
| `/staff/quotes` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_customer_quotation\code.html` | STALE | Generic template — Stitch customer quotation exists |
| `/staff/projects` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (1)\stitch_omni_developments_digital_platform\omni_developments_manchester_project_workspace\code.html` | STALE | Generic template — Stitch project workspace exists |
| `/staff/calendar` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (2)\stitch_omni_developments_digital_platform\omni_developments_manchester_crm_calendar\code.html` | STALE | Generic template — Stitch CRM calendar exists |
| `/staff/tasks` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (2)\stitch_omni_developments_digital_platform\omni_developments_manchester_tasks\code.html` | STALE | Generic template — Stitch tasks exists |
| `/staff/invoices` | Yes | AdminPage | `client/src/App.tsx (inline)` | none | `stitch_omni_developments_digital_platform (2)\stitch_omni_developments_digital_platform\omni_developments_manchester_invoices\code.html` | STALE | Generic template — Stitch invoices exists |
| `/*` | No | NotFoundPage | `client/src/App.tsx (inline)` | RebuiltLayout | — | NO STITCH REFERENCE | 404 — uses canonical header + shared design system |

## Summary

| Status | Count |
|---|---|
| MATCHED | 4 |
| PARTIAL | 6 |
| STALE | 16 |
| NO STITCH REFERENCE | 4 |

**Total routes:** 30 | **With Stitch ref:** 24 | **MATCHED:** 4 | **PARTIAL:** 6 | **STALE:** 16 | **NO STITCH REF:** 4 | **MISSING:** 0

## Critical issues

1. **Guide article slug mismatch**: Route `/guides/:slug` but Stitch H1 maps to `/guides/greater-manchester-home-extension-guide`. Current slug is `planning-your-home-extension`.
2. **Reviews, Guides, Guide Detail, Contact** are inline generic templates in `App.tsx` using legacy `Layout` — have dedicated Stitch HTML.
3. **Quote + Quote Confirmation** are inline generic — Stitch `request_a_quote` + `quote_confirmation` exist.
4. **PARTIAL pages** (About, Areas, Bathrooms, Services, How It Works, Project Case Study) were rebuilt with sanitised content — need verbatim Stitch copy restored.
5. **Staff/CRM routes** all use one generic `AdminPage` — 10 unique Stitch CRM designs exist.
