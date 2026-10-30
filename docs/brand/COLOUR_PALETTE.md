# Omni colour palette

The logo is monochrome, so the brand colour comes from the site: **navy** and **amber**.
This palette extends both into families. Every colour below comes from one of them.
Tokens exist as Tailwind colours (`brand-*` in `tailwind.config.cjs`) and CSS custom
properties (`--brand-*` at the top of `client/src/styles.css`).

| Token | Hex | Role |
| --- | --- | --- |
| `brand-midnight` | `#0A1322` | Deepest base: footer bottom, top bar start, hero start |
| `brand-navy` | `#13233D` | Primary dark surface, CTAs, active states (also `surface-slate`) |
| `brand-harbour` | `#24406A` | Gradient partner to navy, hover state for dark buttons |
| `brand-steel` | `#4F6F96` | Cool accent, soft background glows, the second metric tone |
| `brand-mist` | `#E9F0F7` | Cool light section band (coverage areas) |
| `brand-gold` | `#FBBF24` | Light end of the warm gradient, hover highlights on dark |
| `brand-amber` | `#F59E0B` | Signature accent: primary buttons, underlines, rules |
| `brand-copper` | `#C2620A` | Deep end of the warm gradient. Icons and decoration only |
| `brand-amber-text` | `#8A4B00` | Amber-family **text** on light backgrounds (passes WCAG AA) |
| `brand-sand` | `#FAF6EE` | Warm light section band, nav hover backgrounds |
| `brand-sand-deep` | `#F1E8D8` | Borders and pressed states on sand |

## Accent tones

Two more accents sit beside navy and amber: **brick**, which picks up the brickwork in
the project photography, and **teal**, a cool complement to amber. Sky reuses the
existing `blue-deep`. Each tone is a CSS class (`tone-amber`, `tone-teal`, `tone-brick`,
`tone-steel`, `tone-sky` in `client/src/styles.css`) that sets these variables:
`--tone` (fills), `--tone-ink` (AA text on white), `--tone-tint` (soft background),
`--tone-on` (text on the fill), `--tone-light` (text on navy) and `--tone-glow`.
Helpers: `tone-text`, `tone-text-light`, `tone-fill`, `tone-soft`, `tone-bar`, `tone-icon`.

| Tone | Fill | Ink on white | Where |
| --- | --- | --- | --- |
| Teal | `#0F766E` | `#0F766E` | Extensions, Services, Areas |
| Brick | `#B5452B` | `#9C3A22` | Renovations, Kitchens, Projects, About, case studies |
| Steel | `#4F6F96` | `#24406A` | Lofts, How It Works |
| Sky | `#0369A1` | `#075985` | Bathrooms |
| Amber | `#F59E0B` | `#8A4B00` | Refurbishments, Reviews, all primary CTAs |

- **Page signature**: `page-accent tone-x` on a page's root recolours that page's
  `text-secondary` accents and `bg-amber-subtle` chips to the page's tone.
- **Hero glow**: `page-hero tone-x` on a dark section gives it the page's coloured glow.
- **Amber stays the action colour**: every quote and primary call to action remains
  amber on every page.

## Rules

- **Warm rule**: `--brand-warm-rule` (gold → amber → copper) is the signature hairline. It
  appears under the header, at the top of the mega menu, the footer and the dark bands.
- **Contrast**: copper (`#C2620A`) only reaches about 4.2:1 on white, so don't use it for
  body text. Use `brand-amber-text` for that. Amber and gold are for dark backgrounds,
  fills and decoration.
- **No pure black** for buttons or surfaces. Use navy, or a navy → harbour gradient.
- **Section rhythm**: alternate white, cool (`surface-ground` / `brand-mist`) and warm
  (`brand-sand`) light bands between the navy bands, so no two neighbouring sections match.
