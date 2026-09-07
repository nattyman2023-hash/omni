import { Link } from 'react-router-dom';
import { site, projects } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

/**
 * Matches the Stitch "Areas We Cover" export structure/spacing/tokens exactly.
 * Content differences from the raw Stitch mockup are deliberate — see
 * REAL_CONTENT_REQUIRED.md. Notably:
 *  - The "Primary Operational Districts" grid uses our 10 REAL coverage
 *    towns (data/content.ts `areas`), not Stitch's invented borough names.
 *  - The dark "map" panel is a clearly stylized decorative panel (no fake
 *    satellite/map image, no unverified dispatch-time or office-address
 *    stats).
 *  - "Recent Projects By Location" uses our 3 REAL supplied projects, with
 *    real tags instead of invented prices/durations/street names.
 *  - The planning-approvals panel keeps the general public planning-law
 *    guidance, but swaps the 4 unverified "registry/fast-track" badges for
 *    plain service descriptions.
 */

type District = {
  area: string;
  region: string;
  postcodes: string;
  description: string;
  capabilities: string[];
};

const DISTRICTS: District[] = [
  {
    area: 'Manchester',
    region: 'MANCHESTER CITY',
    postcodes: 'M1–M14',
    description:
      'Apartment renovations, period conversion refurbishments and kitchen updates for homes across central and south Manchester.',
    capabilities: ['Renovations', 'Refurbishments', 'Kitchens'],
  },
  {
    area: 'Salford',
    region: 'SALFORD METROPOLITAN',
    postcodes: 'M5, M6',
    description:
      'Home extensions, property refurbishments and bathroom transformations for townhouses and terraces across Salford.',
    capabilities: ['Extensions', 'Refurbishments', 'Bathrooms'],
  },
  {
    area: 'Sale',
    region: 'TRAFFORD BOROUGH',
    postcodes: 'M33',
    description:
      'Rear and side extensions, loft conversions and full renovations for semi-detached and detached homes in Sale.',
    capabilities: ['Extensions', 'Loft conversions', 'Renovations'],
  },
  {
    area: 'Altrincham',
    region: 'TRAFFORD BOROUGH',
    postcodes: 'WA14, WA15',
    description:
      'Residential extensions, open-plan kitchen transformations and bathroom upgrades across Altrincham.',
    capabilities: ['Extensions', 'Kitchens', 'Bathrooms'],
  },
  {
    area: 'Hale',
    region: 'TRAFFORD BOROUGH',
    postcodes: 'WA15',
    description:
      'Substantial renovations, high-spec refurbishments and bathroom installations for homes across Hale.',
    capabilities: ['Renovations', 'Refurbishments', 'Bathrooms'],
  },
  {
    area: 'Stockport',
    region: 'STOCKPORT BOROUGH',
    postcodes: 'SK1–SK4',
    description:
      'Extensions, loft conversions and general building work for residential properties across Stockport.',
    capabilities: ['Extensions', 'Loft conversions', 'General building'],
  },
  {
    area: 'Cheadle',
    region: 'STOCKPORT BOROUGH',
    postcodes: 'SK8',
    description:
      'Open-plan extensions, bathroom upgrades and general building work for homes in Cheadle.',
    capabilities: ['Extensions', 'Bathrooms', 'General building'],
  },
  {
    area: 'Bramhall',
    region: 'STOCKPORT BOROUGH',
    postcodes: 'SK7',
    description:
      'Extensions, loft conversions and kitchen fitting for period and modern homes across Bramhall.',
    capabilities: ['Extensions', 'Loft conversions', 'Kitchens'],
  },
  {
    area: 'Hazel Grove',
    region: 'STOCKPORT BOROUGH',
    postcodes: 'SK7',
    description:
      'Extensions, property refurbishments and general building work for homes across Hazel Grove.',
    capabilities: ['Extensions', 'Refurbishments', 'General building'],
  },
  {
    area: 'Wilmslow',
    region: 'CHESHIRE',
    postcodes: 'SK9',
    description:
      'High-specification extensions, luxury kitchen installations and full renovations for homes across Wilmslow.',
    capabilities: ['Extensions', 'Kitchens', 'Renovations'],
  },
];

const COVERAGE_LOCATIONS = [
  'Manchester', 'Salford', 'Sale', 'Altrincham', 'Hale', 'Stockport', 'Cheadle', 'Bramhall', 'Hazel Grove', 'Wilmslow',
] as const;

export default function AreasPage() {
  return (
    <div className="flex flex-col w-full">
        {/* Hero Section */}
        <section className="relative bg-surface-slate text-on-primary py-space-3xl lg:py-space-4xl overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern height="48" id="arch-grid" patternUnits="userSpaceOnUse" width="48">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#F59E0B" strokeDasharray="2 4" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect fill="url(#arch-grid)" height="100%" width="100%" />
            </svg>
          </div>
          <div className="relative max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-space-2xs bg-surface-dark/60 backdrop-blur-sm px-space-sm py-space-2xs rounded-full mb-space-md">
                <span className="w-2 h-2 rounded-full bg-amber-highlight" />
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">
                  REGIONAL COVERAGE
                </span>
              </div>
              <h1 className="font-display-hero text-display-hero-mobile md:text-display-hero tracking-tight text-on-primary mb-space-md leading-tight">
                Serving Greater Manchester &amp; Cheshire
              </h1>
              <p className="font-body-lead text-body-lead text-outline-variant mb-space-2xl max-w-2xl leading-relaxed">
                Bespoke home extensions, structural renovations, loft conversions, and refurbishments across{' '}
                {site.area}&apos;s residential neighbourhoods.
              </p>

              {/* Trust Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md pt-space-md">
                <div className="bg-surface-dark/80 backdrop-blur p-space-md rounded-xl shadow-sm">
                  <div className="flex items-center gap-space-xs mb-space-2xs text-amber-highlight">
                    <MSIcon name="policy" size={22} />
                    <span className="font-label-caps text-label-caps tracking-wider uppercase text-amber-highlight">
                      Local Fluency
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-surface-ground">
                    Local planning and building-control context is discussed for each property
                  </p>
                </div>
                <div className="bg-surface-dark/80 backdrop-blur p-space-md rounded-xl shadow-sm">
                  <div className="flex items-center gap-space-xs mb-space-2xs text-amber-highlight">
                    <MSIcon name="engineering" size={22} />
                    <span className="font-label-caps text-label-caps tracking-wider uppercase text-amber-highlight">
                      Project Coordination
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-surface-ground">
                    Project coordination and specialist input are discussed as the scope develops
                  </p>
                </div>
                <div className="bg-surface-dark/80 backdrop-blur p-space-md rounded-xl shadow-sm">
                  <div className="flex items-center gap-space-xs mb-space-2xs text-amber-highlight">
                    <MSIcon name="event_available" size={22} />
                    <span className="font-label-caps text-label-caps tracking-wider uppercase text-amber-highlight">
                      Rapid Survey
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-surface-ground">
                    Survey timing and feasibility information are agreed during enquiry
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Regional Operational Footprint */}
        <section className="py-space-3xl bg-surface-pure text-on-surface">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-start">
              {/* Narrative Column (7 cols) */}
              <div className="lg:col-span-7 space-y-space-lg">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">
                    ENGINEERING RIGOUR
                  </span>
                  <h2 className="font-headline-xl text-headline-xl text-primary leading-tight tracking-tight">
                    Why Local Regional Knowledge Matters
                  </h2>
                </div>
                <p className="font-body-lead text-body-lead text-on-surface-variant">
                  Every property has its own constraints. The early conversation helps identify the information,
                  permissions and practical decisions that need to be understood before work begins.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                  <div className="bg-surface-ground p-space-md rounded-xl shadow-sm space-y-space-xs">
                    <div className="w-9 h-9 rounded-lg bg-amber-subtle text-on-secondary-fixed-variant flex items-center justify-center">
                      <MSIcon name="layers" size={20} />
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">Existing Property</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Existing structure, access, drainage and ground conditions are reviewed as part of understanding
                      the work that may be needed.
                    </p>
                  </div>
                  <div className="bg-surface-ground p-space-md rounded-xl shadow-sm space-y-space-xs">
                    <div className="w-9 h-9 rounded-lg bg-blue-subtle text-blue-deep flex items-center justify-center">
                      <MSIcon name="account_balance" size={20} />
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">Planning Context</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Designations, local requirements and the chosen scope can affect the route forward. These are
                      discussed before the project information is finalised.
                    </p>
                  </div>
                  <div className="bg-surface-ground p-space-md rounded-xl shadow-sm space-y-space-xs">
                    <div className="w-9 h-9 rounded-lg bg-surface-variant text-primary flex items-center justify-center">
                      <MSIcon name="handshake" size={20} />
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">Approval Pathway</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Planning and building-control steps vary by property and local authority. We help identify the
                      information that may be needed for the next stage.
                    </p>
                  </div>
                  <div className="bg-surface-ground p-space-md rounded-xl shadow-sm space-y-space-xs">
                    <div className="w-9 h-9 rounded-lg bg-amber-subtle text-on-secondary-fixed flex items-center justify-center">
                      <MSIcon name="hub" size={20} />
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">Access &amp; Logistics</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Access, deliveries, protection and site logistics are considered alongside the proposed scope
                      and the way the property is used.
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplied illustrative coverage map with the accessible location list beneath it */}
              <div className="lg:col-span-5 bg-surface-slate text-on-primary p-space-lg rounded-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-space-md pb-space-xs border-b border-border-slate">
                  <div>
                    <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-widest block">
                      OPERATIONAL HUB
                    </span>
                    <span className="font-headline-sm text-headline-sm">Greater Manchester &amp; Cheshire Coverage</span>
                  </div>
                  <span className="px-space-xs py-space-2xs bg-surface-dark text-success-green-light font-label-caps text-label-caps rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-green-light animate-pulse" /> 10 Areas Covered
                  </span>
                </div>

                <figure className="coverage-map" aria-labelledby="coverage-map-title">
                  <SafeImage sourceComponent="AreasPage.CoverageMap" className="coverage-map-image" src="/images/omni-service-area-map-v2.png" alt="Illustrated map showing Greater Manchester and Cheshire principal service areas" width={1448} height={1086} loading="eager" />
                  <figcaption id="coverage-map-title" className="coverage-map-note">Illustrated service area; locations are shown for orientation.</figcaption>
                </figure>
                <ul className="coverage-map-list" aria-label="Areas covered">
                  {COVERAGE_LOCATIONS.map((location) => <li key={location}><Link to={`/areas/${location.toLowerCase().replaceAll(' ', '-')}`}>{location}</Link></li>)}
                </ul>

                <div className="space-y-space-xs font-body-sm text-body-sm text-outline-variant">
                  <div className="flex items-center justify-between text-on-primary">
                    <span className="flex items-center gap-2">
                      <MSIcon name="location_on" size={18} className="text-amber-highlight" />
                      Active across {site.area}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Location Directory Cards (10 Core Areas) */}
        <section className="py-space-3xl bg-surface-ground">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="max-w-2xl mb-space-2xl">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">
                EXPANSIVE PORTFOLIO
              </span>
              <h2 className="font-headline-xl text-headline-xl text-primary tracking-tight">
                Primary Operational Districts
              </h2>
              <p className="font-body-lead text-body-lead text-on-surface-variant mt-space-2xs">
                Explore our specialist architectural design and structural build services across South Manchester
                and Cheshire.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {DISTRICTS.map((district, index) => (
                <div
                  key={district.area}
                  className={`bg-surface-pure rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                    index === DISTRICTS.length - 1 ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-space-xs">
                      <div>
                        <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider block">
                          COVERAGE AREA
                        </span>
                        <h3 className="font-headline-md text-headline-md text-primary mt-space-2xs">{district.area}</h3>
                      </div>
                      <span className="px-space-xs py-space-2xs bg-surface-subtle text-primary font-headline-sm text-[13px] rounded">
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
                      Residential extensions, renovations and building enquiries for homes in {district.area}.
                    </p>
                    <div className="mb-space-md">
                      <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant block mb-space-2xs">
                        Core Capabilities:
                      </span>
                      <div className="flex flex-wrap gap-space-2xs">
                        {district.capabilities.map((label) => (
                          <span
                            key={label}
                            className="px-space-xs py-space-2xs bg-surface-subtle rounded text-[12px] font-body-sm text-on-surface"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link
                    className="group inline-flex items-center gap-space-2xs font-headline-sm text-[14px] text-primary hover:text-secondary transition-colors pt-space-xs border-t border-border-stone"
                    to="/projects"
                  >
                    <span>View {district.area} Projects &amp; Services</span>
                    <MSIcon
                      name="arrow_forward"
                      size={16}
                      className="text-amber-highlight group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Projects by Location */}
        <section className="py-space-3xl bg-surface-pure">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl">
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-space-2xs">
                  LOCAL EVIDENCE
                </span>
                <h2 className="font-headline-xl text-headline-xl text-primary tracking-tight">
                  Recent Projects By Location
                </h2>
              </div>
              <Link
                className="mt-space-md md:mt-0 inline-flex items-center gap-space-2xs font-headline-sm text-headline-sm text-primary hover:text-secondary transition-colors"
                to="/projects"
              >
                <span>Explore Entire Portfolio</span>
                <MSIcon name="east" size={18} className="text-amber-highlight" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              {projects.map((project) => (
                <div key={project.slug} className="bg-surface-ground rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <SafeImage
                      sourceComponent="AreasPage.ProjectCard"
                      className="w-full h-full object-cover"
                      src={project.image}
                      alt={`${project.title} — supplied project photography`}
                      loading="lazy"
                      width={960}
                      height={720}
                    />
                    <span className="absolute top-space-sm left-space-sm px-space-xs py-space-2xs bg-surface-dark/90 text-on-primary font-label-caps text-[11px] rounded tracking-wider">
                      {project.location.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-space-lg flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-secondary font-headline-sm text-[13px] block mb-space-2xs">
                        {project.category}
                      </span>
                      <h3 className="font-headline-md text-[20px] text-primary mb-space-xs leading-snug">
                        {project.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                        {project.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-space-2xs pt-space-sm border-t border-border-stone">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-space-xs py-space-2xs bg-surface-subtle rounded text-[11px] font-label-caps tracking-wider text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Local Building Regulations Guidance Callout */}
        <section className="py-space-2xl bg-surface-ground">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="bg-surface-pure rounded-xl p-space-xl lg:p-space-2xl shadow-sm border border-border-stone">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <div className="lg:col-span-8 space-y-space-sm">
                  <div className="inline-flex items-center gap-space-2xs bg-amber-subtle text-on-secondary-fixed px-space-xs py-space-2xs rounded">
                    <MSIcon name="verified_user" size={18} />
                    <span className="font-label-caps text-label-caps uppercase tracking-wider">
                      REGULATORY INTELLIGENCE
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                    Permitted Development Rights &amp; Statutory Approvals
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Planning and building-control requirements vary by property and local authority. We can help
                    identify the information needed to discuss the next stage, including drawings, permissions and
                    structural details where relevant.
                  </p>
                  <div className="flex flex-wrap items-center gap-space-md pt-space-xs text-body-sm text-on-surface">
                    <span className="flex items-center gap-1.5 font-headline-sm text-[13px]">
                      <MSIcon name="check_circle" size={18} className="text-success-green" />
                      Planning application support
                    </span>
                    <span className="flex items-center gap-1.5 font-headline-sm text-[13px]">
                      <MSIcon name="check_circle" size={18} className="text-success-green" />
                      Building control liaison
                    </span>
                    <span className="flex items-center gap-1.5 font-headline-sm text-[13px]">
                      <MSIcon name="check_circle" size={18} className="text-success-green" />
                      Party wall notice management
                    </span>
                    <span className="flex items-center gap-1.5 font-headline-sm text-[13px]">
                      <MSIcon name="check_circle" size={18} className="text-success-green" />
                      Certificate of lawfulness guidance
                    </span>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col justify-center bg-surface-subtle p-space-lg rounded-xl">
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-space-2xs">
                    Unsure if you require planning?
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                    Send us your address and a brief description of the scope, and we&apos;ll talk through your
                    local authority&apos;s planning position as part of your enquiry.
                  </p>
                  <Link
                    className="inline-flex items-center justify-center gap-space-2xs bg-primary text-on-primary px-space-md py-space-xs rounded-lg font-headline-sm text-[14px] hover:bg-surface-slate transition-colors shadow-sm"
                    to="/contact"
                  >
                    <span>Check Planning Status</span>
                    <MSIcon name="chevron_right" size={16} className="text-amber-highlight" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="bg-surface-slate text-on-primary py-space-3xl lg:py-space-4xl relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop text-center relative z-10">
            <div className="max-w-3xl mx-auto space-y-space-md">
              <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-widest">
                NEXT STEPS
              </span>
              <h2 className="font-display-hero text-headline-xl-mobile md:text-headline-xl tracking-tight text-on-primary">
                Planning a Project in Your Area?
              </h2>
              <p className="font-body-lead text-body-lead text-outline-variant max-w-2xl mx-auto leading-relaxed">
                Arrange a complimentary on-site feasibility consultation with Omni&apos;s senior project
                directors. We evaluate space parameters, structural requirements, and initial budget forecasts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md pt-space-lg">
                <Link
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm px-space-xl py-space-sm rounded-lg hover:bg-secondary-container transition-all shadow-md"
                  to="/quote"
                >
                  <span>Request a Consultation</span>
                  <MSIcon name="calendar_month" size={18} />
                </Link>
                <a
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-surface-dark text-on-primary font-headline-sm text-headline-sm px-space-xl py-space-sm rounded-lg hover:bg-border-slate transition-all border border-border-slate"
                  href={site.phoneHref}
                >
                  <MSIcon name="call" size={18} className="text-amber-highlight" />
                  <span>Call {site.phone}</span>
                </a>
              </div>
              <p className="text-body-sm text-outline-variant pt-space-md">
                Zero obligation • Complete structural review • Itemised cost projections
              </p>
            </div>
          </div>
        </section>
    </div>
  );
}
