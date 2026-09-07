# Content inventory

## Screens and routes

| Supplied screen | Implementation route |
| --- | --- |
| Home | `/` |
| Services | `/services` |
| Home extensions service | `/services/home-extensions` |
| About us | `/about` |
| Client reviews | `/reviews` |
| Areas we cover | `/areas` and `/areas/:slug` |
| Guides & advice | `/guides` and `/guides/:slug` |
| Contact us | `/contact` |
| How it works | `/how-it-works` |
| Project case study | `/projects` and `/projects/:slug` |
| Request a quote / quote builder | `/quote` |
| Quote confirmation | `/quote/thank-you` |
| CRM login | `/staff/login` |
| CRM screens | `/staff`, `/staff/leads`, `/staff/site-visits`, `/staff/quotes`, `/staff/projects`, `/staff/calendar`, `/staff/tasks`, `/staff/invoices` |

The duplicate Stitch export trees were treated as references to the same approved screens. No supplied Stitch file was deleted or modified.

## Reusable implementation

`SiteHeader`, `SiteFooter`, `PageHero`, `SectionHeading`, `TrustBar`, `ServiceCard`, `ProjectCard`, `ProcessTimeline`, `Accordion`, `FinalCTA`, `ContactForm`, `QuoteWizard` and `AdminShell` are shared components. Service, project, area and guide content lives in `client/src/data/content.ts` and mirrors the future database entities.

## Missing factual content

See `REAL_CONTENT_REQUIRED.md` for the exact owner inputs still needed before production launch.
