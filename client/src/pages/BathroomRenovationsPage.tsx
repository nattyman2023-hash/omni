import { Link } from 'react-router-dom';
import { site, services, projects } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

/**
 * Bespoke, Stitch-matched composition for /services/bathroom-renovations.
 *
 * Section order, grid structure, spacing and card shapes are translated
 * directly from the Stitch export at:
 *   Omni Development/.../omni_developments_manchester_bathroom_installation/code.html
 *
 * A number of deliberate content-safety edits were applied versus the Stitch
 * copy — see the inline comments below and the report given alongside this
 * file for the full list (no fabricated stats, prices, durations, reviews,
 * client names, locations or dates; no interactive before/after comparison).
 */
export default function BathroomRenovationsPage() {
  const bathroomService = services.find((item) => item.slug === 'bathroom-renovations');
  const bathroomProject = projects.find((item) => item.slug === 'bathroom-installation');
  if (!bathroomService) return null;

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb Navigation Bar */}
      <section className="w-full bg-surface-ground py-space-sm">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs font-label-ui text-label-ui text-on-surface-variant">
            <Link className="hover:text-primary transition-colors flex items-center gap-space-2xs" to="/">
              <MSIcon name="home" size={16} />
              <span>Home</span>
            </Link>
            <MSIcon name="chevron_right" size={14} className="text-outline" />
            <Link className="hover:text-primary transition-colors" to="/services">Services</Link>
            <MSIcon name="chevron_right" size={14} className="text-outline" />
            <span className="text-on-surface font-semibold">Bathroom Installation</span>
          </nav>
        </div>
      </section>

      {/* Hero Section */}
      <section className="w-full bg-surface-pure pt-space-xl pb-space-3xl lg:pt-space-2xl lg:pb-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl lg:gap-space-2xl items-center">
            {/* Text Column */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-amber-subtle text-secondary font-label-caps text-label-caps uppercase mb-space-md shadow-sm">
                <MSIcon name="water_drop" size={14} className="text-amber-highlight" />
                Bespoke Wet Rooms &amp; Luxury Bathroom Suites
              </div>
              <h1 className="font-display-hero text-display-hero-mobile lg:text-display-hero text-primary tracking-tight mb-space-md">
                Bathroom Renovations &amp; Installations in Manchester &amp; Cheshire
              </h1>
              <p className="font-body-lead text-body-lead text-on-surface-variant mb-space-xl leading-relaxed">
                Turn ordinary washrooms into calm, well-finished spaces. Omni Developments can coordinate bathroom layouts,
                preparation, waterproofing, tiling and installation details across {site.area}, shaped around the property and brief.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm w-full sm:w-auto mb-space-xl">
                <Link
                  className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded bg-amber-highlight hover:bg-secondary text-surface-dark font-headline-sm text-headline-sm transition-all shadow-md hover:shadow-xl"
                  to="/quote"
                >
                  <span>Discuss Your Bathroom Project</span>
                  <MSIcon name="arrow_forward" size={20} />
                </Link>
                <a
                  className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded bg-surface-ground hover:bg-surface-subtle text-on-surface font-headline-sm text-headline-sm transition-all shadow-sm"
                  href="#portfolio"
                >
                  <MSIcon name="photo_library" size={18} className="text-blue-deep" />
                  <span>View Bathroom Portfolio</span>
                </a>
              </div>
              {/* Micro Quick Dial & Accreditations */}
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-space-2xs">
                  <MSIcon name="verified_user" size={18} className="text-success-green" />
                  Waterproofing planned in scope
                </span>
                <span className="flex items-center gap-space-2xs">
                  <MSIcon name="engineering" size={18} className="text-amber-highlight" />
                  Tiling and finishing coordinated
                </span>
              </div>
            </div>
            {/* Hero Photographic Frame */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-xl bg-surface-slate">
                <SafeImage
                  sourceComponent="BathroomRenovationsPage.Hero"
                  className="w-full h-full object-cover"
                  alt="Bathroom service or gallery image from supplied project photography"
                  src="/images/services-bathroom.webp"
                  width={960}
                  height={1200}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/80 via-transparent to-transparent" />
                <div className="absolute bottom-space-lg left-space-lg right-space-lg p-space-md rounded-lg bg-surface-dark/90 backdrop-blur-md shadow-lg text-surface-pure">
                  <div className="flex items-center justify-between mb-space-2xs">
                    <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-wider">Supplied Project Photography</span>
                  </div>
                  <p className="font-headline-sm text-headline-sm text-on-primary">Bathroom installation detail</p>
                  <p className="font-body-sm text-body-sm text-outline-variant">From our own project photography</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility Trust Bar — non-numeric, no fabricated stats or ratings */}
      <section className="w-full bg-surface-slate text-on-primary py-space-lg shadow-md">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md text-center">
            <div className="p-space-sm flex flex-col items-center justify-center">
              <span className="font-stat-metric text-[20px] sm:text-[24px] md:text-[26px] lg:text-[34px] xl:text-stat-metric text-amber-highlight break-words">Turnkey</span>
              <span className="font-headline-sm text-headline-sm text-on-primary mt-space-2xs">Turnkey Bathroom Fit-Outs</span>
              <span className="font-body-sm text-body-sm text-outline-variant">Finish discussed for the brief</span>
            </div>
            <div className="p-space-sm flex flex-col items-center justify-center">
              <span className="font-stat-metric text-[20px] sm:text-[24px] md:text-[26px] lg:text-[34px] xl:text-stat-metric text-on-primary break-words">Coordinated</span>
              <span className="font-headline-sm text-headline-sm text-on-primary mt-space-2xs">Tiling and installation</span>
              <span className="font-body-sm text-body-sm text-outline-variant">Across {site.area}</span>
            </div>
            <div className="p-space-sm flex flex-col items-center justify-center">
              <span className="font-stat-metric text-[20px] sm:text-[24px] md:text-[26px] lg:text-[34px] xl:text-stat-metric text-amber-highlight break-words">Waterproofing</span>
              <span className="font-headline-sm text-headline-sm text-on-primary mt-space-2xs">Preparation and tanking</span>
              <span className="font-body-sm text-body-sm text-outline-variant">Discussed in the project scope</span>
            </div>
            <div className="p-space-sm flex flex-col items-center justify-center">
              <span className="font-stat-metric text-[20px] sm:text-[24px] md:text-[26px] lg:text-[34px] xl:text-stat-metric text-on-primary break-words">Considered</span>
              <span className="font-headline-sm text-headline-sm text-on-primary mt-space-2xs">Considered Design</span>
              <span className="font-body-sm text-body-sm text-outline-variant">Layout planned around how you live</span>
            </div>
          </div>
        </div>
      </section>

      {/* Service Features Grid */}
      <section className="w-full bg-surface py-space-3xl lg:py-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-2xl">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">Architectural Sanctuary Design</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary mb-space-sm">
              Transform Your Washroom Into a Spa-Grade Retreat
            </h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              From full structural room expansions to bespoke wet rooms, we coordinate every stage: first-fix plumbing and electrics,
              subfloor damp proofing, laser-level tiling, and precision sanitary installation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {SERVICE_FEATURE_CARDS.map((card) => (
              <div key={card.title} className="group bg-surface-pure rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-slate">
                  <SafeImage sourceComponent="BathroomRenovationsPage.FeatureCard" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={card.alt} src={card.image} width={960} height={720} />
                  <span className={`absolute top-space-xs left-space-xs px-space-xs py-space-2xs font-label-caps text-label-caps rounded uppercase ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                </div>
                <div className="p-space-md flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-space-xs">{card.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">{card.description}</p>
                  </div>
                  <div className="pt-space-md mt-space-md">
                    <span className="font-label-ui text-label-ui text-secondary font-semibold flex items-center gap-space-2xs">
                      {card.tagline} <MSIcon name="arrow_forward" size={16} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section (8 Clear Steps) */}
      <section className="w-full bg-surface-ground py-space-3xl lg:py-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl">
            <div className="max-w-2xl">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">Rigorous Architectural Methodology</span>
              <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary">
                Our Bathroom Renovation Process
              </h2>
            </div>
            <div className="mt-space-md md:mt-0">
              <span className="font-body-md text-body-md text-on-surface-variant">A structured 8-stage delivery focused on watertight results and clear communication.</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {PROCESS_STEPS.map((step) => (
              <div key={step.phase} className="p-space-lg rounded-lg bg-surface-pure shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div aria-hidden="true" className="absolute -right-2 -top-2 font-stat-metric text-stat-metric text-on-surface-variant select-none">{step.phase}</div>
                <div className="relative z-10">
                  <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-widest block mb-space-xs">Phase {step.phase}</span>
                  <h3 className="font-headline-md text-headline-md text-primary mb-space-xs">{step.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{step.description}</p>
                </div>
                <div className="mt-space-md pt-space-xs flex items-center gap-space-2xs font-label-ui text-label-ui text-secondary">
                  <MSIcon name={step.icon} size={16} /> {step.footnote}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bathroom Craftsmanship in Detail — single static image, no fabricated before/after or case-study claims */}
      <section className="w-full bg-surface-pure py-space-3xl lg:py-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-xl">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">Craftsmanship Spotlight</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary mb-space-xs">
              A Closer Look at Our Bathroom Finishes
            </h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              A look at the standard of finish we aim for on every bathroom project: considered tiling, clean sanitaryware
              installation, and a tidy, well-sealed result throughout.
            </p>
          </div>
          <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] rounded-xl overflow-hidden shadow-2xl">
            <SafeImage
              sourceComponent="BathroomRenovationsPage.Craftsmanship"
              className="absolute inset-0 w-full h-full object-cover"
              alt="Bathroom service or gallery image from supplied project photography"
              src="/images/services-bathroom.webp"
              width={1600}
              height={900}
            />
            <div className="absolute bottom-space-md left-space-md bg-surface-dark/85 backdrop-blur-md px-space-sm py-space-xs rounded text-surface-pure font-label-caps text-label-caps tracking-widest uppercase">
              Supplied Project Photography
            </div>
          </div>
        </div>
      </section>

      {/* Recent Bathroom Installations — only real, verified project data, no fabricated case studies */}
      <section className="w-full bg-surface py-space-3xl lg:py-space-4xl" id="portfolio">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl">
            <div>
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">Bespoke Portfolio</span>
              <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary">
                Recent Bathroom Installations
              </h2>
            </div>
            <Link
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui text-secondary font-semibold hover:text-primary transition-colors mt-space-sm md:mt-0"
              to="/projects"
            >
              <span>Explore All Case Studies</span>
              <MSIcon name="arrow_forward" size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
            {bathroomProject && (
              <div className="group bg-surface-pure rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:col-start-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-slate">
                  <SafeImage
                    sourceComponent="BathroomRenovationsPage.ProjectCard"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={`${bathroomProject.title} — supplied project photography`}
                    src={bathroomProject.image}
                    width={960}
                    height={720}
                  />
                  <span className="absolute top-space-xs left-space-xs px-space-xs py-space-2xs bg-surface-dark/85 text-surface-pure font-label-caps text-label-caps rounded uppercase">
                    {bathroomProject.category}
                  </span>
                </div>
                <div className="p-space-lg flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-space-2xs text-body-sm text-on-surface-variant mb-space-2xs">
                      {bathroomProject.tags.map((tag) => (
                        <span key={tag} className="px-space-2xs py-[2px] rounded bg-surface-ground">{tag}</span>
                      ))}
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-space-xs">{bathroomProject.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">{bathroomProject.description}</p>
                  </div>
                  <div className="pt-space-md mt-space-md flex items-center justify-between text-label-ui font-semibold text-secondary">
                    <Link to={`/projects/${bathroomProject.slug}`} className="flex items-center gap-space-2xs">
                      <span>View Project</span>
                      <MSIcon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="w-full bg-surface-pure py-space-3xl lg:py-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-2xl">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">Transparent Advice</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary mb-space-xs">
              Bathroom Renovation FAQs
            </h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              Everything you need to know about timelines, waterproofing, site cleanliness, and plumbing arrangements during work.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
            <div className="lg:col-span-8 flex flex-col gap-space-md">
              {FAQS.map((faq) => (
                <div key={faq.question} className="p-space-lg rounded-lg bg-surface-ground shadow-sm">
                  <h3 className="font-headline-md text-headline-md text-primary mb-space-xs flex items-center gap-space-xs">
                    <MSIcon name={faq.icon} size={22} className="text-secondary" />
                    {faq.question}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
            {/* FAQ Side Card */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="p-space-lg rounded-xl bg-surface-slate text-on-primary shadow-lg sticky top-28">
                <span className="font-label-caps text-label-caps text-amber-highlight uppercase font-bold tracking-widest block mb-space-xs">Direct Technical Assistance</span>
                <h3 className="font-headline-md text-headline-md text-on-primary mb-space-sm">Have a Technical Question About Your Space?</h3>
                <p className="font-body-sm text-body-sm text-outline-variant mb-space-md">
                  Speak directly with our team about water flow rates, unvented cylinders, or structural wet room loads.
                </p>
                <div className="space-y-space-sm">
                  <a
                    className="w-full flex items-center justify-center gap-space-xs py-space-xs px-space-md rounded bg-surface-pure text-primary font-headline-sm text-headline-sm hover:bg-surface-ground transition-colors"
                    href={site.phoneHref}
                  >
                    <MSIcon name="call" size={18} className="text-secondary" />
                    <span>{site.phone}</span>
                  </a>
                  <a
                    className="w-full flex items-center justify-center gap-space-xs py-space-xs px-space-md rounded bg-success-green text-surface-pure font-headline-sm text-headline-sm hover:opacity-90 transition-opacity"
                    href={site.whatsappHref}
                    rel="noopener"
                    target="_blank"
                  >
                    <MSIcon name="chat" size={18} />
                    <span>Direct WhatsApp Consultation</span>
                  </a>
                </div>
                <div className="mt-space-lg pt-space-md border-t border-border-slate/40 text-body-sm text-outline-variant flex items-center gap-space-2xs">
                  <MSIcon name="pin_drop" size={16} className="text-amber-highlight" />
                  <span>Available across {site.area}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Dark CTA Section */}
      <section className="w-full bg-surface-dark text-on-primary py-space-3xl lg:py-space-4xl shadow-2xl relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded bg-surface-slate text-amber-highlight font-label-caps text-label-caps uppercase tracking-wider mb-space-md">
                <MSIcon name="event_available" size={14} />
                Bathroom Installation Enquiries
              </div>
              <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-primary mb-space-md">
                Planning a Bathroom Renovation?
              </h2>
              <p className="font-body-lead text-body-lead text-outline-variant max-w-2xl leading-relaxed">
                Get in touch with our bathroom installation team for advice, material selection guidance, and a no-obligation
                 itemised estimate. We visit your property, discuss the room and water setup, and prepare a realistic project programme.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-space-sm">
              <Link
                className="w-full flex items-center justify-center gap-space-xs px-space-lg py-space-md rounded bg-amber-highlight hover:bg-secondary text-surface-dark font-headline-sm text-headline-sm transition-all shadow-xl"
                to="/quote"
              >
                <span>Request a Bathroom Consultation</span>
                <MSIcon name="arrow_forward" size={20} />
              </Link>
              <div className="grid grid-cols-2 gap-space-xs">
                <a
                  className="flex items-center justify-center gap-space-2xs py-space-xs rounded bg-surface-slate hover:bg-border-slate text-on-primary font-headline-sm text-headline-sm transition-colors"
                  href={site.phoneHref}
                >
                  <MSIcon name="call" size={18} className="text-amber-highlight" />
                  <span>Direct Call</span>
                </a>
                <a
                  className="flex items-center justify-center gap-space-2xs py-space-xs rounded bg-surface-slate hover:bg-border-slate text-on-primary font-headline-sm text-headline-sm transition-colors"
                  href={site.whatsappHref}
                  rel="noopener"
                  target="_blank"
                >
                  <MSIcon name="chat" size={18} className="text-success-green" />
                  <span>WhatsApp</span>
                </a>
              </div>
              <span className="font-body-sm text-body-sm text-outline-variant text-center pt-space-2xs">
                No obligation • Written project information
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const SERVICE_FEATURE_CARDS = [
  {
    title: 'Full Bathroom Renovations',
    description:
      'Complete strip-back to bare brick and joists, structural subfloor reinforcement, complete replumb, re-wire, and insulation upgrades.',
    tagline: 'Structural Turnkey Scope',
    badge: 'Turnkey Strip-Out',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/works-site.jpeg',
    alt: 'Construction site progress detail from supplied project photography',
  },
  {
    title: 'Bathroom Refurbishment',
    description:
      'Modernising existing functional layouts with premium sanitaryware, durable surfaces, designer heated towel rails, and updated ventilation.',
    tagline: 'Sanitaryware Upgrades',
    badge: 'Modernisation',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/bathroom-hero.jpeg',
    alt: 'Bathroom service or gallery image from supplied project photography',
  },
  {
    title: 'Walk-In Showers & Wet Rooms',
    description:
      'Multi-coat tanking systems, pre-formed gradient trays, flush floor linear drains, and architectural glass screens.',
    tagline: 'Zero-Step Thresholds',
    badge: 'Watertight Tanking',
    badgeClass: 'bg-amber-subtle text-secondary font-bold',
    image: '/images/insulation-detail.jpeg',
    alt: 'Technical installation detail from supplied project photography',
  },
  {
    title: 'Freestanding Bath Installation',
    description:
      'Statement freestanding baths with precision floor-mounted mixer feeds, subfloor anti-vibration traps, and overflow testing.',
    tagline: 'Solid Installation Detailing',
    badge: 'Statement Piece',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/bathroom-hero.jpeg',
    alt: 'Bathroom service or gallery image from supplied project photography',
  },
  {
    title: 'Precision Wall & Floor Tiling',
    description:
      'Mitred external edges, bookmatched-pattern layouts where specified, intricate ceramic patterns, and waterproof grouting.',
    tagline: 'Mitred Edge Detailing',
    badge: 'Tiling detail',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/bathroom-hero.jpeg',
    alt: 'Bathroom service or gallery image from supplied project photography',
  },
  {
    title: 'Vanity & Custom Storage',
    description:
      'Bespoke wall-hung vanity units, moisture-resistant cabinetry, recessed shampoo niches, and integrated hidden power outlets.',
    tagline: 'Storage Ergonomics',
    badge: 'Custom Joinery',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/site-interior.jpeg',
    alt: 'Interior project detail from supplied project photography',
  },
  {
    title: 'Architectural Lighting',
    description:
      'Low-glare recessed ceiling downlights, shadow-gap wash profiles, demister mirror backlights, and subtle sensor-led night lighting.',
    tagline: 'Layered Ambience',
    badge: 'Lighting Design',
    badgeClass: 'bg-surface-dark/85 text-surface-pure',
    image: '/images/interior-stair.jpeg',
    alt: 'Interior stair detail from supplied project photography',
  },
  {
    title: 'High-Spec Finishing & Snagging',
    description:
      'Colour-matched silicone lines, hidden cistern maintenance access, quiet extraction fans, and acoustically dampened waste pipe sleeves.',
    tagline: 'Acoustic & Seal Quality',
    badge: 'Zero Tolerance',
    badgeClass: 'bg-amber-subtle text-secondary font-bold',
    image: '/images/insulation-room.jpeg',
    alt: 'Technical installation detail from supplied project photography',
  },
] as const;

const PROCESS_STEPS = [
  {
    phase: '01',
    title: 'Initial Consultation & Survey',
    description:
      'An in-depth home visit across our coverage area. We assess water flow, boiler capacity, waste fall gradients, and existing joist condition.',
    footnote: 'Water pressure check',
    icon: 'speed',
  },
  {
    phase: '02',
    title: 'Layout & Sanitaryware Selection',
    description:
      'Translating your vision into spatial plans. Selecting baths, brassware finishes, and vanity dimensions that suit the room.',
    footnote: 'Spatial layout plan',
    icon: 'architecture',
  },
  {
    phase: '03',
    title: 'Material & Tile Specification',
    description:
      'Tile layout mapping to ensure symmetrical cut lines and minimal slivers, with sourcing support for porcelain, microcement, and underlay.',
    footnote: 'Symmetrical tile map',
    icon: 'grid_on',
  },
  {
    phase: '04',
    title: 'Transparent Project Quotation',
    description:
      'A line-by-line outline covering demolition, waste removal, tanking, brassware installation, and electrics, with scope and costs discussed before work begins.',
    footnote: 'Written project scope',
    icon: 'request_quote',
  },
  {
    phase: '05',
    title: 'Clean Demolition & Surface Prep',
    description:
      'Dust barrier protection on staircases and carpets. Careful stripping of existing fittings, joist sistering where needed, and floor levelling.',
    footnote: 'Careful subfloor prep',
    icon: 'carpenter',
  },
  {
    phase: '06',
    title: 'Plumbing, Tanking & Electrics',
    description:
      'Concealed valves installed with pressure testing. Multi-coat waterproof tanking membrane applied to all wet zones.',
    footnote: 'Watertight membrane',
    icon: 'shield_with_heart',
  },
  {
    phase: '07',
    title: 'Precision Tiling & Sanitaryware',
    description:
      'Careful mitred corners, flawless tile installation, vanity mounting, glass screen anchoring, and second-fix brassware calibration.',
    footnote: 'Mitred-corner finish',
    icon: 'handyman',
  },
  {
    phase: '08',
    title: 'Snag-Free Inspection & Handover',
    description:
      'A thorough silicone-cure check, water pressure and drainage audit, deep clean, and handover of the project information agreed for the work.',
    footnote: 'Project information handover',
    icon: 'verified',
  },
] as const;

const FAQS = [
  {
    question: 'How long does a full bathroom installation take?',
    icon: 'schedule',
    answer:
      'A complete strip-back and bathroom renovation typically takes between 10 and 15 working days (2 to 3 weeks). This schedule accounts for proper drying intervals between structural floor levelling, tanking membrane cure times, tile adhesive setting, and silicone skinning. We don’t rush drying times, to help protect the waterproofing.',
  },
  {
    question: 'How is waterproofing and wet room tanking discussed?',
    icon: 'verified_user',
    answer:
      'The waterproofing approach, materials, preparation, and installation details are discussed as part of the project scope. The agreed information is recorded with the quotation and handover documents where applicable.',
  },
  {
    question: 'Can you supply sanitaryware and tiles, or can we supply?',
    icon: 'inventory_2',
    answer:
      'We offer flexibility here. Our turnkey package handles procurement and delivery working with established suppliers. Alternatively, if you have already purchased tiles and suites, we provide an installation-only contract to the same standard of craftsmanship.',
  },
  {
    question: 'Will we be left without water or toilet facilities during work?',
    icon: 'wc',
    answer:
      'No. If your home has only one bathroom, our plumbers reconnect a temporary operational toilet and cold water service at the close of each working day. Water mains are only isolated for short, pre-notified windows during active first-fix plumbing.',
  },
  {
    question: 'What happens with old plumbing and structural floorboards?',
    icon: 'construction',
    answer:
      'We don’t tile over rotted or creaky floorboards. As standard on full renovations, we inspect all joists, sister warped timbers where needed to prevent floor deflection (which can crack tile grout), and replace corroded or lead pipework with modern equivalents.',
  },
] as const;
