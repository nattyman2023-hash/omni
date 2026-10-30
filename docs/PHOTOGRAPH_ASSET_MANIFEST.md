# Omni Developments — Photograph Asset Manifest

Generated 2026-10-22 by `scripts/generate-photo-manifest.cjs`.

Every technical value below is measured with `sharp`, not estimated. Descriptive
values are carried forward from the existing repository audit (`PHOTO_MAPPING.md`).
Where no prior catalogue entry exists the row is marked `UNCLASSIFIED`: room and
project type cannot be inferred from pixels alone and has deliberately not been guessed.

## Scan scope

Recursive search from `C:\Users\Natty\Desktop\Anti Grav\Omni`:

```
C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\
C:\Users\Natty\Desktop\Anti Grav\Omni\public\
C:\Users\Natty\Desktop\Anti Grav\Omni\uploads\
C:\Users\Natty\Desktop\Anti Grav\Omni\Generates Map Image\
C:\Users\Natty\Desktop\Anti Grav\Omni\design-reference\
C:\Users\Natty\Desktop\Anti Grav\Omni\Omni Development\
```

The parent folder `C:\Users\Natty\Desktop\Anti Grav\` was also listed. It holds
unrelated client projects (including Safe Nest, which was not touched) and no Omni
photography. `node_modules`, `.git`, `dist`, `dist-server` and `deployment` staging
copies were excluded because they are build duplicates, not source media.

Extensions searched: `.jpg` `.jpeg` `.png` `.webp` `.avif` `.heic` `.tif` `.tiff`.
No `.heic`, `.avif`, `.tif` or `.tiff` files exist anywhere in scope.

## Counts

| Group | Count |
| --- | ---: |
| Files in `Photos\` | 71 |
| Byte-identical duplicates among them | 1 |
| **Unique supplied photographs** | **70** |
| Already represented in production | 14 |
| Newly optimised for production | 56 |
| Coverage-map artwork | 1 |
| Production assets in `public\` (after this optimisation) | 328 |
| Stitch design references (not photography) | 30 |

> **Duplicate finding.** `public/images` holds 26 distinct base filenames but only
> **14 unique source photographs**. Nine groups are byte-identical re-copies of the
> same source under different names — for example `home-extension-hero`,
> `extension-doors`, `project-extension-01` and `services-extension` are all the
> same file. The site therefore looks more varied than the library actually is.

## Supplied photographs

| Full source path | Filename | Format | Dimensions | File size | Probable project | Probable room/type | Before/after candidate | Orientation | Quality | Proposed usage | Production asset |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg | jpeg | 1024×683 | 157 KB | External works | Garden / landscaping | WEAK (nearest 20/63) | Landscape | GOOD (1.83 bpp) | Approved — already published | `public/images/garden-landscaping.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg | jpeg | 1328×747 | 174 KB | External works | Completed facade | NOT A PAIR | Landscape | GOOD (1.44 bpp) | Approved — already published | `public/images/completed-facade.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `project-renovation-01`, `services-renovation`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (11).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (11).jpeg | jpeg | 747×1328 | 201 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.66 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-11.webp` (`-640`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (12).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (12).jpeg | jpeg | 747×1328 | 215 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.77 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-12.webp` (`-640`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (13).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (13).jpeg | jpeg | 1200×1600 | 250 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.07 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-13.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (14).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (14).jpeg | jpeg | 1200×1600 | 385 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.64 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-14.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg | jpeg | 1200×1600 | 336 KB | Extension | Extension doors / opening | WEAK (nearest 20/63) | Portrait | GOOD (1.43 bpp) | Approved — already published | `public/images/home-extension-hero.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `extension-doors`, `project-extension-01`, `services-extension`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (16).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (16).jpeg | jpeg | 1200×1600 | 251 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.07 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-16.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg | jpeg | 1200×1600 | 463 KB | External works | Garden beds | WEAK (nearest 22/63) | Portrait | GOOD (1.98 bpp) | Approved — already published | `public/images/garden-beds.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (18).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (18).jpeg | jpeg | 1200×1600 | 375 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.60 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-18.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg | jpeg | 1200×1600 | 135 KB | Interior detail | Stair / interior | NOT A PAIR | Portrait | ACCEPTABLE (0.58 bpp) | Approved — already published | `public/images/interior-stair.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `services-loft`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (3).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (3).jpeg | jpeg | 1024×683 | 127 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Landscape | GOOD (1.49 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-03.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg | jpeg | 1200×1600 | 260 KB | Interior | Kitchen / interior | NOT A PAIR | Portrait | GOOD (1.11 bpp) | Approved — already published | `public/images/site-interior.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `services-kitchen`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (5).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (5).jpeg | jpeg | 1200×1600 | 380 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.62 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-05.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg | jpeg | 1600×1200 | 379 KB | Company vehicle | Branded Omni van | WEAK (nearest 22/63) | Landscape | GOOD (1.62 bpp) | Approved — already published | `public/images/about-omni-van.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `van-branded`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (7).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (7).jpeg | jpeg | 1328×747 | 202 KB | UNCLASSIFIED — 2026-07-25 11.59.05 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Landscape | GOOD (1.67 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a115905-07.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg | jpeg | 1328×747 | 143 KB | Property exterior | House front | NOT A PAIR | Landscape | GOOD (1.18 bpp) | Approved — already published | `public/images/home-front.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg | jpeg | 1328×747 | 179 KB | External works | Driveway | WEAK (nearest 20/63) | Landscape | GOOD (1.48 bpp) | Approved — already published | `public/images/driveway-finish.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg` | WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg | jpeg | 1024×682 | 62 KB | Finished bathroom detail | Bathroom | WEAK (nearest 22/63) | Landscape | ACCEPTABLE (0.72 bpp) | Approved — already published | `public/images/project-bathroom-01.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `bathroom-hero`, `services-bathroom`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.26 PM (1).jpeg` | WhatsApp Image 2026-07-25 at 12.00.26 PM (1).jpeg | jpeg | 1200×1600 | 443 KB | UNCLASSIFIED — 2026-07-25 12.00.26 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.89 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120026-01.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg` | WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg | jpeg | 1200×1600 | 259 KB | Construction progress | Site in progress | WEAK (nearest 22/63) | Portrait | GOOD (1.11 bpp) | Approved — already published | `public/images/works-site.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg` | WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg | jpeg | 1200×1600 | 290 KB | Construction progress | Timber frame | NOT A PAIR | Portrait | GOOD (1.24 bpp) | Approved — already published | `public/images/timber-frame.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg | jpeg | 1200×1600 | 289 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 18/63) | Portrait | GOOD (1.23 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-01.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (10).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (10).jpeg | jpeg | 1200×1600 | 259 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | POSSIBLE (nearest 10/63 — 2026-07-25 at 12.00.28 PM (9)) | Portrait | GOOD (1.10 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-10.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (11).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (11).jpeg | jpeg | 1200×1600 | 262 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.12 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-11.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (12).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (12).jpeg | jpeg | 1200×1600 | 283 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.21 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-12.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (13).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (13).jpeg | jpeg | 1200×1600 | 300 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.28 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-13.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (14).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (14).jpeg | jpeg | 1200×1600 | 273 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.16 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-14.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (15).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (15).jpeg | jpeg | 1200×1600 | 271 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.16 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-15.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (16).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (16).jpeg | jpeg | 1200×1600 | 304 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.30 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-16.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (17).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (17).jpeg | jpeg | 1200×1600 | 276 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.18 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-17.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg | jpeg | 1600×1200 | 328 KB | Technical detail | Insulation detail | WEAK (nearest 22/63) | Landscape | GOOD (1.40 bpp) | Approved — already published | `public/images/insulation-detail.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `guides-hero`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (19).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (19).jpeg | jpeg | 1200×1600 | 247 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.05 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-19.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (2).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (2).jpeg | jpeg | 1200×1600 | 291 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.24 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-02.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg | jpeg | 1600×1200 | 313 KB | Technical detail | Insulated room | WEAK (nearest 20/63) | Landscape | GOOD (1.34 bpp) | Approved — already published | `public/images/insulation-room.webp` (`-640`, `-960`, + JPEG fallback) (aliases: `services-refurbishment`) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (21).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (21).jpeg | jpeg | 1600×1200 | 262 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Landscape | GOOD (1.12 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-21.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (22).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (22).jpeg | jpeg | 1200×1600 | 264 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.13 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-22.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (23).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (23).jpeg | jpeg | 1600×1200 | 316 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Landscape | GOOD (1.35 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-23.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (24).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (24).jpeg | jpeg | 1200×1600 | 216 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (0.92 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-24.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (25).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (25).jpeg | jpeg | 1200×1600 | 181 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.77 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-25.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (26).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (26).jpeg | jpeg | 1200×1600 | 159 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.68 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-26.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (3).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (3).jpeg | jpeg | 1200×1600 | 311 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.32 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-03.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (4).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (4).jpeg | jpeg | 1200×1600 | 226 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (0.96 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-04.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (5).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (5).jpeg | jpeg | 1200×1600 | 233 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (0.99 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-05.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (6).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (6).jpeg | jpeg | 1200×1600 | 249 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.06 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-06.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (7).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (7).jpeg | jpeg | 1200×1600 | 257 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.10 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-07.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (8).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (8).jpeg | jpeg | 1200×1600 | 297 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.27 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-08.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM (9).jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM (9).jpeg | jpeg | 1200×1600 | 233 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | POSSIBLE (nearest 10/63 — 2026-07-25 at 12.00.28 PM (10)) | Portrait | GOOD (0.99 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-09.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-07-25 at 12.00.28 PM.jpeg` | WhatsApp Image 2026-07-25 at 12.00.28 PM.jpeg | jpeg | 1200×1600 | 252 KB | UNCLASSIFIED — 2026-07-25 12.00.28 PM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.07 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-a120028-00.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (1).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (1).jpeg | jpeg | 1200×1600 | 227 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (0.97 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-01.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (10).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (10).jpeg | jpeg | 1200×1600 | 312 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.33 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-10.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (11).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (11).jpeg | jpeg | 1200×1600 | 312 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 16/63) | Portrait | GOOD (1.33 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-11.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (12).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (12).jpeg | jpeg | 1200×1600 | 296 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.26 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-12.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (13).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (13).jpeg | jpeg | 1200×1600 | 330 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (1.41 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-13.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (14).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (14).jpeg | jpeg | 1200×1600 | 362 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.54 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-14.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (15).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (15).jpeg | jpeg | 1200×1600 | 396 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.69 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-15.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (16).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (16).jpeg | jpeg | 1200×1600 | 427 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.82 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-16.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (17).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (17).jpeg | jpeg | 1200×1600 | 371 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.58 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-17.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (18).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (18).jpeg | jpeg | 1200×1600 | 298 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.27 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-18.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (19).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (19).jpeg | jpeg | 1200×1600 | 319 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 18/63) | Portrait | GOOD (1.36 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-19.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (2).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (2).jpeg | jpeg | 1200×1600 | 161 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.69 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-02.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (3).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (3).jpeg | jpeg | 1200×1600 | 185 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.79 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-03.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (4).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (4).jpeg | jpeg | 1200×1600 | 185 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.79 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-04.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (5).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (5).jpeg | jpeg | 1200×1600 | 173 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | ACCEPTABLE (0.74 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-05.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (6).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (6).jpeg | jpeg | 1200×1600 | 320 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.36 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-06.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (7).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (7).jpeg | jpeg | 1200×1600 | 498 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | NOT A PAIR | Portrait | GOOD (2.12 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-07.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (8).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (8).jpeg | jpeg | 1200×1600 | 333 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.42 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-08.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM (9).jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM (9).jpeg | jpeg | 1200×1600 | 300 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 22/63) | Portrait | GOOD (1.28 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-09.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.15 AM.jpeg` | WhatsApp Image 2026-10-16 at 10.27.15 AM.jpeg | jpeg | 1200×1600 | 376 KB | UNCLASSIFIED — 2026-10-16 10.27.15 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 16/63) | Portrait | GOOD (1.60 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102715-00.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at 10.27.16 AM.jpeg` | WhatsApp Image 2026-10-16 at 10.27.16 AM.jpeg | jpeg | 1200×1600 | 300 KB | UNCLASSIFIED — 2026-10-16 10.27.16 AM batch | UNCLASSIFIED — owner confirmation required | WEAK (nearest 20/63) | Portrait | GOOD (1.28 bpp) | Available — see PHOTO_USAGE_PLAN.md | `public/images/omni-b102716-00.webp` (`-640`, `-960`, + JPEG fallback) |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Photos\WhatsApp Image 2026-10-16 at.jpeg` | WhatsApp Image 2026-10-16 at.jpeg | jpeg | 1200×1600 | 376 KB | UNCLASSIFIED — Unknown batch batch | UNCLASSIFIED — owner confirmation required | DUPLICATE OF 2026-10-16 at 10.27.15 AM | Portrait | GOOD (1.60 bpp) | Not published — duplicate, one copy only | Reuses `omni-b102715-00.webp` |

### EXIF and orientation note

All 71 supplied photographs report `orientation: null` — WhatsApp has
stripped the EXIF orientation tag, so no file needs rotation correction. All are
sRGB with a maximum long edge of 1600px, so no original needs downsizing for the
web; they do need modern-format re-encoding and responsive variants.

## Coverage-map artwork

| Full source path | Filename | Format | Dimensions | File size | Proposed usage | Production asset |
| --- | --- | --- | --- | ---: | --- | --- |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\Generates Map Image\ChatGPT Image Sep 4, 2026, 10_38_30 PM.png` | ChatGPT Image Sep 4, 2026, 10_38_30 PM.png | png | 1448×1086 | 2108 KB | Areas coverage map (illustrative artwork, not a live map service) | `public/images/omni-service-area-map-v2.png` |

## Existing production assets (`public/images`)

| Full source path | Filename | Format | Dimensions | File size |
| --- | --- | --- | --- | ---: |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\about-omni-van-640.webp` | about-omni-van-640.webp | webp | 640×480 | 58 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\about-omni-van-960.webp` | about-omni-van-960.webp | webp | 960×720 | 122 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\about-omni-van.jpeg` | about-omni-van.jpeg | jpeg | 1600×1200 | 379 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\about-omni-van.webp` | about-omni-van.webp | webp | 1600×1200 | 306 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\bathroom-hero-640.webp` | bathroom-hero-640.webp | webp | 640×426 | 12 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\bathroom-hero-960.webp` | bathroom-hero-960.webp | webp | 960×639 | 25 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\bathroom-hero.jpeg` | bathroom-hero.jpeg | jpeg | 1024×682 | 62 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\bathroom-hero.webp` | bathroom-hero.webp | webp | 1024×682 | 31 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\completed-facade-640.webp` | completed-facade-640.webp | webp | 640×360 | 41 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\completed-facade-960.webp` | completed-facade-960.webp | webp | 960×540 | 81 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\completed-facade.jpeg` | completed-facade.jpeg | jpeg | 1328×747 | 174 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\completed-facade.webp` | completed-facade.webp | webp | 1328×747 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\driveway-finish-640.webp` | driveway-finish-640.webp | webp | 640×360 | 31 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\driveway-finish-960.webp` | driveway-finish-960.webp | webp | 960×540 | 75 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\driveway-finish.jpeg` | driveway-finish.jpeg | jpeg | 1328×747 | 179 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\driveway-finish.webp` | driveway-finish.webp | webp | 1328×747 | 154 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\extension-doors-640.webp` | extension-doors-640.webp | webp | 640×853 | 79 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\extension-doors-960.webp` | extension-doors-960.webp | webp | 960×1280 | 173 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\extension-doors.jpeg` | extension-doors.jpeg | jpeg | 1200×1600 | 336 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\extension-doors.webp` | extension-doors.webp | webp | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-beds-640.webp` | garden-beds-640.webp | webp | 640×853 | 114 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-beds-960.webp` | garden-beds-960.webp | webp | 960×1280 | 273 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-beds.jpeg` | garden-beds.jpeg | jpeg | 1200×1600 | 463 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-beds.webp` | garden-beds.webp | webp | 1200×1600 | 433 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-landscaping-640.webp` | garden-landscaping-640.webp | webp | 640×427 | 56 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-landscaping-960.webp` | garden-landscaping-960.webp | webp | 960×640 | 112 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-landscaping.jpeg` | garden-landscaping.jpeg | jpeg | 1024×683 | 157 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\garden-landscaping.webp` | garden-landscaping.webp | webp | 1024×683 | 130 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\guides-hero-640.webp` | guides-hero-640.webp | webp | 640×480 | 51 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\guides-hero-960.webp` | guides-hero-960.webp | webp | 960×720 | 108 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\guides-hero.jpeg` | guides-hero.jpeg | jpeg | 1600×1200 | 328 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\guides-hero.webp` | guides-hero.webp | webp | 1600×1200 | 250 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-extension-hero-640.webp` | home-extension-hero-640.webp | webp | 640×853 | 79 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-extension-hero-960.webp` | home-extension-hero-960.webp | webp | 960×1280 | 173 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-extension-hero.jpeg` | home-extension-hero.jpeg | jpeg | 1200×1600 | 336 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-extension-hero.webp` | home-extension-hero.webp | webp | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-front-640.webp` | home-front-640.webp | webp | 640×360 | 24 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-front-960.webp` | home-front-960.webp | webp | 960×540 | 53 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-front.jpeg` | home-front.jpeg | jpeg | 1328×747 | 143 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\home-front.webp` | home-front.webp | webp | 1328×747 | 102 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-detail-640.webp` | insulation-detail-640.webp | webp | 640×480 | 51 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-detail-960.webp` | insulation-detail-960.webp | webp | 960×720 | 108 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-detail.jpeg` | insulation-detail.jpeg | jpeg | 1600×1200 | 328 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-detail.webp` | insulation-detail.webp | webp | 1600×1200 | 250 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-room-640.webp` | insulation-room-640.webp | webp | 640×480 | 46 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-room-960.webp` | insulation-room-960.webp | webp | 960×720 | 99 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-room.jpeg` | insulation-room.jpeg | jpeg | 1600×1200 | 313 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\insulation-room.webp` | insulation-room.webp | webp | 1600×1200 | 238 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\interior-stair-640.webp` | interior-stair-640.webp | webp | 640×853 | 26 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\interior-stair-960.webp` | interior-stair-960.webp | webp | 960×1280 | 47 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\interior-stair.jpeg` | interior-stair.jpeg | jpeg | 1200×1600 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\interior-stair.webp` | interior-stair.webp | webp | 1200×1600 | 67 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-03-640.webp` | omni-a115905-03-640.webp | webp | 640×427 | 55 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-03-960.webp` | omni-a115905-03-960.webp | webp | 960×640 | 105 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-03.jpeg` | omni-a115905-03.jpeg | jpeg | 1024×683 | 128 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-03.webp` | omni-a115905-03.webp | webp | 1024×683 | 116 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-05-640.webp` | omni-a115905-05-640.webp | webp | 640×853 | 124 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-05-960.webp` | omni-a115905-05-960.webp | webp | 960×1280 | 248 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-05.jpeg` | omni-a115905-05.jpeg | jpeg | 1200×1600 | 376 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-05.webp` | omni-a115905-05.webp | webp | 1200×1600 | 351 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-07-640.webp` | omni-a115905-07-640.webp | webp | 640×360 | 51 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-07-960.webp` | omni-a115905-07-960.webp | webp | 960×540 | 111 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-07.jpeg` | omni-a115905-07.jpeg | jpeg | 1328×747 | 203 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-07.webp` | omni-a115905-07.webp | webp | 1328×747 | 198 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-11-640.webp` | omni-a115905-11-640.webp | webp | 640×1138 | 152 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-11.jpeg` | omni-a115905-11.jpeg | jpeg | 747×1328 | 203 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-11.webp` | omni-a115905-11.webp | webp | 747×1328 | 203 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-12-640.webp` | omni-a115905-12-640.webp | webp | 640×1138 | 178 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-12.jpeg` | omni-a115905-12.jpeg | jpeg | 747×1328 | 215 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-12.webp` | omni-a115905-12.webp | webp | 747×1328 | 232 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-13-640.webp` | omni-a115905-13-640.webp | webp | 640×853 | 67 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-13-960.webp` | omni-a115905-13-960.webp | webp | 960×1280 | 139 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-13.jpeg` | omni-a115905-13.jpeg | jpeg | 1200×1600 | 244 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-13.webp` | omni-a115905-13.webp | webp | 1200×1600 | 206 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-14-640.webp` | omni-a115905-14-640.webp | webp | 640×853 | 124 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-14-960.webp` | omni-a115905-14-960.webp | webp | 960×1280 | 254 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-14.jpeg` | omni-a115905-14.jpeg | jpeg | 1200×1600 | 381 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-14.webp` | omni-a115905-14.webp | webp | 1200×1600 | 358 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-16-640.webp` | omni-a115905-16-640.webp | webp | 640×853 | 73 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-16-960.webp` | omni-a115905-16-960.webp | webp | 960×1280 | 139 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-16.jpeg` | omni-a115905-16.jpeg | jpeg | 1200×1600 | 248 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-16.webp` | omni-a115905-16.webp | webp | 1200×1600 | 200 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-18-640.webp` | omni-a115905-18-640.webp | webp | 640×853 | 117 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-18-960.webp` | omni-a115905-18-960.webp | webp | 960×1280 | 263 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-18.jpeg` | omni-a115905-18.jpeg | jpeg | 1200×1600 | 374 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a115905-18.webp` | omni-a115905-18.webp | webp | 1200×1600 | 377 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120026-01-640.webp` | omni-a120026-01-640.webp | webp | 640×853 | 143 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120026-01-960.webp` | omni-a120026-01-960.webp | webp | 960×1280 | 286 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120026-01.jpeg` | omni-a120026-01.jpeg | jpeg | 1200×1600 | 435 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120026-01.webp` | omni-a120026-01.webp | webp | 1200×1600 | 412 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-00-640.webp` | omni-a120028-00-640.webp | webp | 640×853 | 69 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-00-960.webp` | omni-a120028-00-960.webp | webp | 960×1280 | 128 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-00.jpeg` | omni-a120028-00.jpeg | jpeg | 1200×1600 | 250 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-00.webp` | omni-a120028-00.webp | webp | 1200×1600 | 181 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-01-640.webp` | omni-a120028-01-640.webp | webp | 640×853 | 94 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-01-960.webp` | omni-a120028-01-960.webp | webp | 960×1280 | 176 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-01.jpeg` | omni-a120028-01.jpeg | jpeg | 1200×1600 | 289 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-01.webp` | omni-a120028-01.webp | webp | 1200×1600 | 236 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-02-640.webp` | omni-a120028-02-640.webp | webp | 640×853 | 88 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-02-960.webp` | omni-a120028-02-960.webp | webp | 960×1280 | 177 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-02.jpeg` | omni-a120028-02.jpeg | jpeg | 1200×1600 | 294 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-02.webp` | omni-a120028-02.webp | webp | 1200×1600 | 244 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-03-640.webp` | omni-a120028-03-640.webp | webp | 640×853 | 102 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-03-960.webp` | omni-a120028-03-960.webp | webp | 960×1280 | 195 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-03.jpeg` | omni-a120028-03.jpeg | jpeg | 1200×1600 | 312 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-03.webp` | omni-a120028-03.webp | webp | 1200×1600 | 270 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-04-640.webp` | omni-a120028-04-640.webp | webp | 640×853 | 67 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-04-960.webp` | omni-a120028-04-960.webp | webp | 960×1280 | 124 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-04.jpeg` | omni-a120028-04.jpeg | jpeg | 1200×1600 | 226 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-04.webp` | omni-a120028-04.webp | webp | 1200×1600 | 169 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-05-640.webp` | omni-a120028-05-640.webp | webp | 640×853 | 69 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-05-960.webp` | omni-a120028-05-960.webp | webp | 960×1280 | 129 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-05.jpeg` | omni-a120028-05.jpeg | jpeg | 1200×1600 | 234 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-05.webp` | omni-a120028-05.webp | webp | 1200×1600 | 179 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-06-640.webp` | omni-a120028-06-640.webp | webp | 640×853 | 74 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-06-960.webp` | omni-a120028-06-960.webp | webp | 960×1280 | 142 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-06.jpeg` | omni-a120028-06.jpeg | jpeg | 1200×1600 | 251 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-06.webp` | omni-a120028-06.webp | webp | 1200×1600 | 198 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-07-640.webp` | omni-a120028-07-640.webp | webp | 640×853 | 72 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-07-960.webp` | omni-a120028-07-960.webp | webp | 960×1280 | 138 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-07.jpeg` | omni-a120028-07.jpeg | jpeg | 1200×1600 | 256 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-07.webp` | omni-a120028-07.webp | webp | 1200×1600 | 196 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-08-640.webp` | omni-a120028-08-640.webp | webp | 640×853 | 79 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-08-960.webp` | omni-a120028-08-960.webp | webp | 960×1280 | 155 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-08.jpeg` | omni-a120028-08.jpeg | jpeg | 1200×1600 | 295 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-08.webp` | omni-a120028-08.webp | webp | 1200×1600 | 220 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-09-640.webp` | omni-a120028-09-640.webp | webp | 640×853 | 55 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-09-960.webp` | omni-a120028-09-960.webp | webp | 960×1280 | 104 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-09.jpeg` | omni-a120028-09.jpeg | jpeg | 1200×1600 | 228 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-09.webp` | omni-a120028-09.webp | webp | 1200×1600 | 150 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-10-640.webp` | omni-a120028-10-640.webp | webp | 640×853 | 64 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-10-960.webp` | omni-a120028-10-960.webp | webp | 960×1280 | 120 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-10.jpeg` | omni-a120028-10.jpeg | jpeg | 1200×1600 | 255 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-10.webp` | omni-a120028-10.webp | webp | 1200×1600 | 175 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-11-640.webp` | omni-a120028-11-640.webp | webp | 640×853 | 74 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-11-960.webp` | omni-a120028-11-960.webp | webp | 960×1280 | 152 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-11.jpeg` | omni-a120028-11.jpeg | jpeg | 1200×1600 | 257 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-11.webp` | omni-a120028-11.webp | webp | 1200×1600 | 224 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-12-640.webp` | omni-a120028-12-640.webp | webp | 640×853 | 83 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-12-960.webp` | omni-a120028-12-960.webp | webp | 960×1280 | 162 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-12.jpeg` | omni-a120028-12.jpeg | jpeg | 1200×1600 | 279 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-12.webp` | omni-a120028-12.webp | webp | 1200×1600 | 233 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-13-640.webp` | omni-a120028-13-640.webp | webp | 640×853 | 91 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-13-960.webp` | omni-a120028-13-960.webp | webp | 960×1280 | 182 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-13.jpeg` | omni-a120028-13.jpeg | jpeg | 1200×1600 | 297 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-13.webp` | omni-a120028-13.webp | webp | 1200×1600 | 266 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-14-640.webp` | omni-a120028-14-640.webp | webp | 640×853 | 77 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-14-960.webp` | omni-a120028-14-960.webp | webp | 960×1280 | 160 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-14.jpeg` | omni-a120028-14.jpeg | jpeg | 1200×1600 | 269 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-14.webp` | omni-a120028-14.webp | webp | 1200×1600 | 234 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-15-640.webp` | omni-a120028-15-640.webp | webp | 640×853 | 76 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-15-960.webp` | omni-a120028-15-960.webp | webp | 960×1280 | 144 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-15.jpeg` | omni-a120028-15.jpeg | jpeg | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-15.webp` | omni-a120028-15.webp | webp | 1200×1600 | 206 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-16-640.webp` | omni-a120028-16-640.webp | webp | 640×853 | 88 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-16-960.webp` | omni-a120028-16-960.webp | webp | 960×1280 | 167 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-16.jpeg` | omni-a120028-16.jpeg | jpeg | 1200×1600 | 302 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-16.webp` | omni-a120028-16.webp | webp | 1200×1600 | 239 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-17-640.webp` | omni-a120028-17-640.webp | webp | 640×853 | 80 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-17-960.webp` | omni-a120028-17-960.webp | webp | 960×1280 | 146 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-17.jpeg` | omni-a120028-17.jpeg | jpeg | 1200×1600 | 273 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-17.webp` | omni-a120028-17.webp | webp | 1200×1600 | 207 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-19-640.webp` | omni-a120028-19-640.webp | webp | 640×853 | 73 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-19-960.webp` | omni-a120028-19-960.webp | webp | 960×1280 | 133 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-19.jpeg` | omni-a120028-19.jpeg | jpeg | 1200×1600 | 248 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-19.webp` | omni-a120028-19.webp | webp | 1200×1600 | 184 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-21-640.webp` | omni-a120028-21-640.webp | webp | 640×480 | 45 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-21-960.webp` | omni-a120028-21-960.webp | webp | 960×720 | 95 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-21.jpeg` | omni-a120028-21.jpeg | jpeg | 1600×1200 | 263 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-21.webp` | omni-a120028-21.webp | webp | 1600×1200 | 219 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-22-640.webp` | omni-a120028-22-640.webp | webp | 640×853 | 75 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-22-960.webp` | omni-a120028-22-960.webp | webp | 960×1280 | 153 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-22.jpeg` | omni-a120028-22.jpeg | jpeg | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-22.webp` | omni-a120028-22.webp | webp | 1200×1600 | 215 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-23-640.webp` | omni-a120028-23-640.webp | webp | 640×480 | 52 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-23-960.webp` | omni-a120028-23-960.webp | webp | 960×720 | 118 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-23.jpeg` | omni-a120028-23.jpeg | jpeg | 1600×1200 | 321 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-23.webp` | omni-a120028-23.webp | webp | 1600×1200 | 288 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-24-640.webp` | omni-a120028-24-640.webp | webp | 640×853 | 53 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-24-960.webp` | omni-a120028-24-960.webp | webp | 960×1280 | 102 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-24.jpeg` | omni-a120028-24.jpeg | jpeg | 1200×1600 | 216 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-24.webp` | omni-a120028-24.webp | webp | 1200×1600 | 147 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-25-640.webp` | omni-a120028-25-640.webp | webp | 640×853 | 45 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-25-960.webp` | omni-a120028-25-960.webp | webp | 960×1280 | 87 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-25.jpeg` | omni-a120028-25.jpeg | jpeg | 1200×1600 | 180 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-25.webp` | omni-a120028-25.webp | webp | 1200×1600 | 125 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-26-640.webp` | omni-a120028-26-640.webp | webp | 640×853 | 37 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-26-960.webp` | omni-a120028-26-960.webp | webp | 960×1280 | 69 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-26.jpeg` | omni-a120028-26.jpeg | jpeg | 1200×1600 | 157 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-a120028-26.webp` | omni-a120028-26.webp | webp | 1200×1600 | 101 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-00-640.webp` | omni-b102715-00-640.webp | webp | 640×853 | 102 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-00-960.webp` | omni-b102715-00-960.webp | webp | 960×1280 | 227 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-00.jpeg` | omni-b102715-00.jpeg | jpeg | 1200×1600 | 370 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-00.webp` | omni-b102715-00.webp | webp | 1200×1600 | 351 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-01-640.webp` | omni-b102715-01-640.webp | webp | 640×853 | 62 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-01-960.webp` | omni-b102715-01-960.webp | webp | 960×1280 | 127 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-01.jpeg` | omni-b102715-01.jpeg | jpeg | 1200×1600 | 225 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-01.webp` | omni-b102715-01.webp | webp | 1200×1600 | 188 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-02-640.webp` | omni-b102715-02-640.webp | webp | 640×853 | 36 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-02-960.webp` | omni-b102715-02-960.webp | webp | 960×1280 | 69 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-02.jpeg` | omni-b102715-02.jpeg | jpeg | 1200×1600 | 160 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-02.webp` | omni-b102715-02.webp | webp | 1200×1600 | 101 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-03-640.webp` | omni-b102715-03-640.webp | webp | 640×853 | 45 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-03-960.webp` | omni-b102715-03-960.webp | webp | 960×1280 | 87 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-03.jpeg` | omni-b102715-03.jpeg | jpeg | 1200×1600 | 184 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-03.webp` | omni-b102715-03.webp | webp | 1200×1600 | 128 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-04-640.webp` | omni-b102715-04-640.webp | webp | 640×853 | 42 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-04-960.webp` | omni-b102715-04-960.webp | webp | 960×1280 | 83 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-04.jpeg` | omni-b102715-04.jpeg | jpeg | 1200×1600 | 182 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-04.webp` | omni-b102715-04.webp | webp | 1200×1600 | 122 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-05-640.webp` | omni-b102715-05-640.webp | webp | 640×853 | 40 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-05-960.webp` | omni-b102715-05-960.webp | webp | 960×1280 | 74 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-05.jpeg` | omni-b102715-05.jpeg | jpeg | 1200×1600 | 173 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-05.webp` | omni-b102715-05.webp | webp | 1200×1600 | 108 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-06-640.webp` | omni-b102715-06-640.webp | webp | 640×853 | 98 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-06-960.webp` | omni-b102715-06-960.webp | webp | 960×1280 | 194 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-06.jpeg` | omni-b102715-06.jpeg | jpeg | 1200×1600 | 319 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-06.webp` | omni-b102715-06.webp | webp | 1200×1600 | 272 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-07-640.webp` | omni-b102715-07-640.webp | webp | 640×853 | 164 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-07-960.webp` | omni-b102715-07-960.webp | webp | 960×1280 | 356 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-07.jpeg` | omni-b102715-07.jpeg | jpeg | 1200×1600 | 487 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-07.webp` | omni-b102715-07.webp | webp | 1200×1600 | 521 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-08-640.webp` | omni-b102715-08-640.webp | webp | 640×853 | 94 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-08-960.webp` | omni-b102715-08-960.webp | webp | 960×1280 | 205 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-08.jpeg` | omni-b102715-08.jpeg | jpeg | 1200×1600 | 329 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-08.webp` | omni-b102715-08.webp | webp | 1200×1600 | 310 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-09-640.webp` | omni-b102715-09-640.webp | webp | 640×853 | 87 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-09-960.webp` | omni-b102715-09-960.webp | webp | 960×1280 | 170 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-09.jpeg` | omni-b102715-09.jpeg | jpeg | 1200×1600 | 300 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-09.webp` | omni-b102715-09.webp | webp | 1200×1600 | 233 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-10-640.webp` | omni-b102715-10-640.webp | webp | 640×853 | 87 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-10-960.webp` | omni-b102715-10-960.webp | webp | 960×1280 | 172 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-10.jpeg` | omni-b102715-10.jpeg | jpeg | 1200×1600 | 313 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-10.webp` | omni-b102715-10.webp | webp | 1200×1600 | 245 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-11-640.webp` | omni-b102715-11-640.webp | webp | 640×853 | 91 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-11-960.webp` | omni-b102715-11-960.webp | webp | 960×1280 | 178 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-11.jpeg` | omni-b102715-11.jpeg | jpeg | 1200×1600 | 310 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-11.webp` | omni-b102715-11.webp | webp | 1200×1600 | 251 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-12-640.webp` | omni-b102715-12-640.webp | webp | 640×853 | 86 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-12-960.webp` | omni-b102715-12-960.webp | webp | 960×1280 | 175 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-12.jpeg` | omni-b102715-12.jpeg | jpeg | 1200×1600 | 294 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-12.webp` | omni-b102715-12.webp | webp | 1200×1600 | 260 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-13-640.webp` | omni-b102715-13-640.webp | webp | 640×853 | 93 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-13-960.webp` | omni-b102715-13-960.webp | webp | 960×1280 | 199 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-13.jpeg` | omni-b102715-13.jpeg | jpeg | 1200×1600 | 328 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-13.webp` | omni-b102715-13.webp | webp | 1200×1600 | 301 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-14-640.webp` | omni-b102715-14-640.webp | webp | 640×853 | 106 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-14-960.webp` | omni-b102715-14-960.webp | webp | 960×1280 | 229 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-14.jpeg` | omni-b102715-14.jpeg | jpeg | 1200×1600 | 357 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-14.webp` | omni-b102715-14.webp | webp | 1200×1600 | 341 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-15-640.webp` | omni-b102715-15-640.webp | webp | 640×853 | 128 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-15-960.webp` | omni-b102715-15-960.webp | webp | 960×1280 | 264 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-15.jpeg` | omni-b102715-15.jpeg | jpeg | 1200×1600 | 391 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-15.webp` | omni-b102715-15.webp | webp | 1200×1600 | 380 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-16-640.webp` | omni-b102715-16-640.webp | webp | 640×853 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-16-960.webp` | omni-b102715-16-960.webp | webp | 960×1280 | 292 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-16.jpeg` | omni-b102715-16.jpeg | jpeg | 1200×1600 | 418 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-16.webp` | omni-b102715-16.webp | webp | 1200×1600 | 436 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-17-640.webp` | omni-b102715-17-640.webp | webp | 640×853 | 113 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-17-960.webp` | omni-b102715-17-960.webp | webp | 960×1280 | 240 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-17.jpeg` | omni-b102715-17.jpeg | jpeg | 1200×1600 | 370 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-17.webp` | omni-b102715-17.webp | webp | 1200×1600 | 349 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-18-640.webp` | omni-b102715-18-640.webp | webp | 640×853 | 87 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-18-960.webp` | omni-b102715-18-960.webp | webp | 960×1280 | 185 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-18.jpeg` | omni-b102715-18.jpeg | jpeg | 1200×1600 | 293 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-18.webp` | omni-b102715-18.webp | webp | 1200×1600 | 280 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-19-640.webp` | omni-b102715-19-640.webp | webp | 640×853 | 93 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-19-960.webp` | omni-b102715-19-960.webp | webp | 960×1280 | 193 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-19.jpeg` | omni-b102715-19.jpeg | jpeg | 1200×1600 | 315 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102715-19.webp` | omni-b102715-19.webp | webp | 1200×1600 | 286 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102716-00-640.webp` | omni-b102716-00-640.webp | webp | 640×853 | 88 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102716-00-960.webp` | omni-b102716-00-960.webp | webp | 960×1280 | 186 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102716-00.jpeg` | omni-b102716-00.jpeg | jpeg | 1200×1600 | 297 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-b102716-00.webp` | omni-b102716-00.webp | webp | 1200×1600 | 273 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-coverage-map.png` | omni-coverage-map.png | png | 1448×1086 | 567 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\omni-service-area-map-v2.png` | omni-service-area-map-v2.png | png | 1448×1086 | 567 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-bathroom-01-640.webp` | project-bathroom-01-640.webp | webp | 640×426 | 12 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-bathroom-01-960.webp` | project-bathroom-01-960.webp | webp | 960×639 | 25 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-bathroom-01.jpeg` | project-bathroom-01.jpeg | jpeg | 1024×682 | 62 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-bathroom-01.webp` | project-bathroom-01.webp | webp | 1024×682 | 31 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-extension-01-640.webp` | project-extension-01-640.webp | webp | 640×853 | 79 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-extension-01-960.webp` | project-extension-01-960.webp | webp | 960×1280 | 173 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-extension-01.jpeg` | project-extension-01.jpeg | jpeg | 1200×1600 | 336 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-extension-01.webp` | project-extension-01.webp | webp | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-renovation-01-640.webp` | project-renovation-01-640.webp | webp | 640×360 | 41 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-renovation-01-960.webp` | project-renovation-01-960.webp | webp | 960×540 | 81 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-renovation-01.jpeg` | project-renovation-01.jpeg | jpeg | 1328×747 | 174 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\project-renovation-01.webp` | project-renovation-01.webp | webp | 1328×747 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-bathroom-640.webp` | services-bathroom-640.webp | webp | 640×426 | 12 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-bathroom-960.webp` | services-bathroom-960.webp | webp | 960×639 | 25 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-bathroom.jpeg` | services-bathroom.jpeg | jpeg | 1024×682 | 62 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-bathroom.webp` | services-bathroom.webp | webp | 1024×682 | 31 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-extension-640.webp` | services-extension-640.webp | webp | 640×853 | 79 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-extension-960.webp` | services-extension-960.webp | webp | 960×1280 | 173 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-extension.jpeg` | services-extension.jpeg | jpeg | 1200×1600 | 336 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-extension.webp` | services-extension.webp | webp | 1200×1600 | 267 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-kitchen-640.webp` | services-kitchen-640.webp | webp | 640×853 | 52 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-kitchen-960.webp` | services-kitchen-960.webp | webp | 960×1280 | 104 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-kitchen.jpeg` | services-kitchen.jpeg | jpeg | 1200×1600 | 260 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-kitchen.webp` | services-kitchen.webp | webp | 1200×1600 | 160 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-loft-640.webp` | services-loft-640.webp | webp | 640×853 | 26 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-loft-960.webp` | services-loft-960.webp | webp | 960×1280 | 47 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-loft.jpeg` | services-loft.jpeg | jpeg | 1200×1600 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-loft.webp` | services-loft.webp | webp | 1200×1600 | 67 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-refurbishment-640.webp` | services-refurbishment-640.webp | webp | 640×480 | 46 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-refurbishment-960.webp` | services-refurbishment-960.webp | webp | 960×720 | 99 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-refurbishment.jpeg` | services-refurbishment.jpeg | jpeg | 1600×1200 | 313 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-refurbishment.webp` | services-refurbishment.webp | webp | 1600×1200 | 238 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-renovation-640.webp` | services-renovation-640.webp | webp | 640×360 | 41 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-renovation-960.webp` | services-renovation-960.webp | webp | 960×540 | 81 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-renovation.jpeg` | services-renovation.jpeg | jpeg | 1328×747 | 174 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\services-renovation.webp` | services-renovation.webp | webp | 1328×747 | 135 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\site-interior-640.webp` | site-interior-640.webp | webp | 640×853 | 52 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\site-interior-960.webp` | site-interior-960.webp | webp | 960×1280 | 104 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\site-interior.jpeg` | site-interior.jpeg | jpeg | 1200×1600 | 260 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\site-interior.webp` | site-interior.webp | webp | 1200×1600 | 160 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\timber-frame-640.webp` | timber-frame-640.webp | webp | 640×853 | 63 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\timber-frame-960.webp` | timber-frame-960.webp | webp | 960×1280 | 126 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\timber-frame.jpeg` | timber-frame.jpeg | jpeg | 1200×1600 | 290 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\timber-frame.webp` | timber-frame.webp | webp | 1200×1600 | 189 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\van-branded-640.webp` | van-branded-640.webp | webp | 640×480 | 58 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\van-branded-960.webp` | van-branded-960.webp | webp | 960×720 | 122 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\van-branded.jpeg` | van-branded.jpeg | jpeg | 1600×1200 | 379 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\van-branded.webp` | van-branded.webp | webp | 1600×1200 | 306 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\works-site-640.webp` | works-site-640.webp | webp | 640×853 | 51 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\works-site-960.webp` | works-site-960.webp | webp | 960×1280 | 110 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\works-site.jpeg` | works-site.jpeg | jpeg | 1200×1600 | 259 KB |
| `C:\Users\Natty\Desktop\Anti Grav\Omni\public\images\works-site.webp` | works-site.webp | webp | 1200×1600 | 173 KB |

## Stitch design references (excluded from public use)

30 PNG screen captures under `design-reference\`. These are design
reference exports, not project photography, and must never be published as imagery.

## Originals modified

**NONE.** No supplied photograph was moved, renamed, resized, re-encoded or deleted.
All optimisation writes new files into `public/images` and leaves `Photos` untouched.
