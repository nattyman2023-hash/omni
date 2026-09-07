import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MSIcon } from '../components/icons';
import { areas, siteSettings, projects as suppliedProjects } from '../data/content';
import { usePublishedProjects } from '../data/projectFeed';
import SafeImage from '../components/SafeImage';

/**
 * Homepage ("/") — near-verbatim structural translation of the Stitch export
 *   Omni Development/.../omni_developments_manchester_home/code.html
 * Section order, grids, dark/light alternation, card counts and copy are
 * reproduced from the Stitch source. Remote Stitch images map to the closest
 * supplied local photograph (object-fit cover, containers preserved). Stitch
 * `data-path="#"` links are wired to real React Router routes. Stitch copy is
 * frozen verbatim; unverified factual claims are flagged in
 * REAL_CONTENT_REQUIRED.md rather than silently rewritten.
 */

const HERO_TRUST = [
  { icon: 'schedule', label: 'A clear project sequence' },
  { icon: 'request_quote', label: 'Written scope and quotation' },
  { icon: 'policy', label: 'Planning discussed in context' },
  { icon: 'thumb_up', label: 'Client-focused communication' },
] as const;

type Metric = { icon: string; title: string; body: string };

const METRICS: Metric[] = [
  { icon: 'description', title: 'Written project scope', body: 'Understand what is being discussed before work begins.' },
  { icon: 'engineering', title: 'On-site coordination', body: 'A clear point of contact for practical project questions.' },
  { icon: 'forum', title: 'Direct communication', body: 'Keep decisions and updates moving throughout the work.' },
  { icon: 'photo_library', title: 'Supplied photography', body: 'Browse photographs from the project library.' },
];

const SERVICES = [
  { tag: '01 • Extensions', title: 'Home Extensions', image: '/images/site-interior.webp', alt: 'Finished rear extension from supplied project photography.', body: 'Single and double-storey rear extensions, side returns, and open-plan kitchen diners shaped around the property and brief.', points: ['Structural alterations', 'Planning and building information discussed in context', 'Doors, glazing and finishes selected for the brief'], link: 'View Extensions Portfolio', to: '/services/home-extensions' },
  { tag: '02 • Lofts', title: 'Loft Conversions', image: '/images/interior-stair.jpeg', alt: 'Supplied project photography for loft and roof-space work.', body: 'Loft conversion options for additional rooms, storage and useful living space, subject to the property and design.', points: ['Floor and stair coordination', 'Rooflight and dormer options', 'Insulation and first-fix services'], link: 'View Loft Conversions', to: '/services/loft-conversions' },
  { tag: '03 • Renovations', title: 'Property Renovations', image: '/images/completed-facade.jpeg', alt: 'Supplied project photography for property renovation work.', body: 'Whole-home renovation work planned around the existing building, the desired layout and the decisions still to be made.', points: ['Structural reconfiguration', 'Services and internal finishes', 'A coordinated scope for the property'], link: 'View Renovation Gallery', to: '/services/property-renovations' },
  { tag: '04 • Finishes', title: 'Property Refurbishments', image: '/images/insulation-room.jpeg', alt: 'Supplied project photography for property refurbishment work.', body: 'Refurbishment work that brings layout, materials and finishing decisions together into a coherent home project.', points: ['Sub-floor and insulation considerations', 'Carpentry and internal finishes', 'Lighting and finishing coordination'], link: 'Explore Refurbishment Work', to: '/services/property-refurbishments' },
  { tag: '05 • Kitchens', title: 'Kitchen Fitting', image: '/images/site-interior.jpeg', alt: 'Supplied project photography for kitchen work.', body: 'Kitchen projects planned around the room, the services and the way you want the space to work day to day.', points: ['Layout and appliance coordination', 'Worktops, cabinetry and finishes', 'Lighting and underfloor heating options'], link: 'View Kitchen Installations', to: '/services/kitchen-renovations' },
  { tag: '06 • Bathrooms', title: 'Bathroom Installation', image: '/images/bathroom-hero.jpeg', alt: 'Supplied project photography for bathroom work.', body: 'Bathroom and wet-room work developed around the room, the services and the level of finish you want.', points: ['Waterproofing and drainage coordination', 'Tiling and sanitaryware choices', 'Shower, storage and glass details'], link: 'View Bathroom Suites', to: '/services/bathroom-renovations' },
] as const;

const PILLARS = [
  { icon: 'handshake', title: 'Start with the brief', body: 'The first conversation focuses on your aims, the property and the decisions that still need to be made.', tag: 'Direct conversation' },
  { icon: 'architecture', title: 'Consider the detail', body: 'Structural, spatial and finishing choices are reviewed together so the scope remains understandable.', tag: 'Considered detailing' },
  { icon: 'verified_user', title: 'Keep the work visible', body: 'Clear project information and regular communication make it easier to follow the work as it develops.', tag: 'Visible project route' },
  { icon: 'home_pin', title: 'Local Planning Context', body: 'Planning and building-control considerations are discussed in relation to the property, the brief and the relevant local requirements.', tag: 'Planning discussed in context' },
] as const;

const JOURNEY = [
  { step: 'STEP 01', icon: 'chat_bubble_outline', title: 'Project Enquiry', body: 'Reach out via our online wizard, direct phone call, or WhatsApp message with your project aspirations.' },
  { step: 'STEP 02', icon: 'forum', title: 'Initial Consultation', body: 'We review design feasibility, planning restrictions, budget ranges, and ideal target timelines.' },
  { step: 'STEP 03', icon: 'square_foot', title: 'Site Survey & Visit', body: 'Comprehensive physical inspection, laser measurements, foundation assessment, and drainage verification.' },
  { step: 'STEP 04', icon: 'receipt_long', title: 'Itemised Quotation', body: 'Review the scope, inclusions and quotation together before work starts.' },
  { step: 'STEP 05', icon: 'assignment_turned_in', title: 'Contract & Schedule', body: 'Agree the project documents, sequence and practical arrangements for the work.' },
  { step: 'STEP 06', icon: 'construction', title: 'Construction Phase', body: 'The agreed work is coordinated through the build with regular project communication.' },
  { step: 'STEP 07', icon: 'task_alt', title: 'Final Inspection', body: 'A structured snagging review and walkthrough keeps the close-out details visible.' },
  { step: 'STEP 08', icon: 'verified', title: 'Handover', body: 'The agreed project documents and handover details are reviewed with you.' },
] as const;

const PROJECTS = suppliedProjects.map((project) => ({
  slug: project.slug,
  tag: project.location,
  badge: project.category,
  title: project.title,
  body: project.description,
  image: project.image,
  alt: `${project.title} — supplied project photography`,
  category: project.category.toLowerCase(),
}));

// Review records are intentionally empty until the owner approves their attribution and wording.
const TESTIMONIALS: Array<{ source: string; quote: string; initials: string; name: string; meta: string }> = [];

const FILTERS = ['all', 'extension', 'loft', 'kitchen', 'renovation', 'bathroom'] as const;

const TOWNS = areas;

function matchesProjectFilter(project: { category: string; tags: string[] }, filter: string) {
  if (filter === 'all') return true;
  const searchable = `${project.category} ${project.tags.join(' ')}`.toLowerCase();
  const terms: Record<string, string> = {
    extension: 'extension',
    loft: 'loft',
    kitchen: 'kitchen',
    renovation: 'renovation',
    bathroom: 'bathroom',
  };
  return searchable.includes(terms[filter] ?? filter);
}

export default function HomePage() {
  const [filter, setFilter] = useState<string>('all');
  const projectRecords = usePublishedProjects();
  const filterLabels: Record<string, string> = { all: 'All', extension: 'Extensions', loft: 'Lofts', kitchen: 'Kitchens', renovation: 'Renovations', bathroom: 'Bathrooms' };
  const availableFilters = FILTERS.filter((candidate) => candidate === 'all' || projectRecords.some((project) => matchesProjectFilter(project, candidate)));
  const visibleProjects = projectRecords
    .filter((project) => matchesProjectFilter(project, filter))
    .map((project) => ({
      slug: project.slug,
      tag: project.location,
      badge: project.category,
      title: project.title,
      body: project.description,
      image: project.image,
      alt: `${project.title} â€” supplied project photography`,
      category: project.category.toLowerCase(),
    }))
    .slice(0, 4);

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO SECTION — bg-surface-slate (dark) */}
      <section className="relative w-full bg-surface-slate text-on-primary overflow-hidden pb-space-3xl pt-space-2xl md:pt-space-3xl">
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="flex flex-wrap items-center gap-space-sm mb-space-md">
            <span className="inline-flex items-center gap-space-2xs px-space-sm py-1 rounded bg-surface-dark font-label-caps text-label-caps tracking-widest text-amber-highlight uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-highlight animate-pulse" />
              Home projects across Greater Manchester &amp; Cheshire
            </span>
            {(siteSettings.fmbRegistered || siteSettings.structuralWarranty10yr) && (
              <span className="inline-flex items-center gap-space-2xs text-blue-subtle font-label-ui text-label-ui">
                <MSIcon name="verified" size={16} className="text-amber-highlight" />
                {[
                  siteSettings.fmbRegistered && 'FMB Registered',
                  siteSettings.structuralWarranty10yr && '10-Year Warranty',
                ].filter(Boolean).join(' & ')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-7 flex flex-col space-y-space-lg">
              <h1 className="font-display-hero text-display-hero-mobile md:text-display-hero text-on-primary font-extrabold tracking-tight leading-none">
                Transforming Homes Across <span className="text-amber-highlight underline decoration-secondary decoration-2 underline-offset-8">Greater Manchester</span>
              </h1>
              <p className="font-body-lead text-body-lead text-surface-ground max-w-2xl font-normal leading-relaxed">
                Professional home extensions, structural loft conversions, property renovations, kitchens and bathrooms—shaped around the property, the brief and the next practical decision.
              </p>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold shadow-lg hover:bg-secondary-container transition-all">
                  <span>Get Your Free Detailed Quote</span>
                  <MSIcon name="arrow_forward" size={18} />
                </Link>
                <a href="#featured-projects" className="inline-flex items-center justify-center gap-space-2xs px-space-lg py-space-sm rounded bg-surface-dark text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-surface-slate transition-colors">
                  <MSIcon name="photo_library" size={18} className="text-amber-highlight" />
                  <span>Explore Completed Projects</span>
                </a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md pt-space-md">
                {HERO_TRUST.map((t) => (
                  <div key={t.label} className="flex items-center gap-space-2xs">
                    <MSIcon name={t.icon} size={18} className="text-amber-highlight" />
                    <span className="font-label-ui text-body-sm text-outline-variant">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-surface-dark aspect-[4/3]">
                <SafeImage sourceComponent="HomePage.Hero" src="/images/site-interior.webp" alt="Finished rear extension from supplied project photography" width={960} height={720} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/90 via-surface-dark/20 to-transparent" />
                <div className="absolute bottom-space-md left-space-md right-space-md p-space-sm rounded-lg bg-surface-slate/95 backdrop-blur-md text-on-primary">
                  <div className="flex items-center justify-between mb-1">
                  <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-wider">Supplied project photography</span>
                </div>
                  <p className="font-headline-sm text-headline-sm font-semibold truncate">Project details available through the enquiry process</p>
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-outline-variant mt-1">
                    <span>Featured project image</span>
                    <span className="text-on-primary font-medium">Details available on request</span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 hidden sm:flex flex-col items-center justify-center p-space-sm rounded-xl bg-primary text-on-primary shadow-xl">
                <span className="font-stat-metric text-stat-metric text-amber-highlight leading-none">Local</span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-center mt-1">project<br />experience</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. METRIC & CREDIBILITY PODS — bg-surface-pure */}
      <section className="w-full bg-surface-pure py-space-xl shadow-sm relative z-20 -mt-6 rounded-t-2xl max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-lg text-center md:text-left">
          {METRICS.map((m) => (
            <div key={m.title} className="flex flex-col space-y-1 p-space-sm rounded bg-surface-subtle">
              <div className="flex items-center gap-space-2xs text-secondary">
                <MSIcon name={m.icon} size={22} />
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{m.title}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CORE BUILDING SERVICES SHOWCASE — bg-surface-ground */}
      <section className="w-full py-space-3xl bg-surface-ground">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="max-w-2xl space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Specialised Architectural Building</span>
              <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Comprehensive Design &amp; Build Services</h2>
              <p className="font-body-lead text-body-lead text-on-surface-variant">
                From extensions and structural remodels to considered interior finishes, each project is shaped around the property, the scope and the decisions that matter.
              </p>
            </div>
            <div>
              <Link to="/services" className="inline-flex items-center gap-space-2xs font-headline-sm text-headline-sm text-primary font-bold hover:text-secondary transition-colors">
                <span>View All Detailed Service Specifications</span>
                <MSIcon name="arrow_forward" size={18} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {SERVICES.map((s) => (
              <div key={s.title} className="group flex flex-col bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="relative h-60 w-full overflow-hidden bg-surface-container">
                  <SafeImage sourceComponent="HomePage.ServiceCard" src={s.image} alt={s.alt} width={960} height={640} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-space-sm left-space-sm px-space-xs py-1 rounded bg-surface-dark text-amber-highlight font-label-caps text-label-caps uppercase">{s.tag}</span>
                </div>
                <div className="p-space-lg flex flex-col flex-1 justify-between space-y-space-md">
                  <div>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface group-hover:text-secondary transition-colors">{s.title}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">{s.body}</p>
                    <ul className="mt-space-md space-y-space-2xs text-body-sm font-body-sm text-on-surface-variant">
                      {s.points.map((pt) => (
                        <li key={pt} className="flex items-center gap-space-2xs">
                          <MSIcon name="check_circle" size={16} className="text-success-green" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to={s.to} className="inline-flex items-center gap-space-2xs font-label-ui text-label-ui font-semibold text-primary group-hover:text-secondary transition-colors pt-space-xs">
                    <span>{s.link}</span>
                    <MSIcon name="chevron_right" size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PROJECT PHOTOGRAPHY — no unverified comparison is asserted */}
      <section className="w-full py-space-3xl bg-surface-pure">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Supplied Project Photography</span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">The craft is in the detail</h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              Browse the supplied project library for visual context. Project descriptions, locations and any comparison relationships are published only after owner approval.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-stretch">
            <div className="lg:col-span-8">
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-xl bg-surface-dark">
                <SafeImage sourceComponent="HomePage.ProjectSpotlight" src="/images/site-interior.webp" alt="Supplied project photography for a finished rear extension" width={960} height={600} className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded bg-surface-dark/85 text-amber-highlight font-label-caps text-label-caps tracking-wider uppercase">Supplied photograph</span>
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col space-y-space-md p-space-lg rounded-xl bg-surface-ground">
              <div className="space-y-1">
                <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">Project library</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Explore the work in context</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">The gallery contains supplied photographs. The staff workflow is the source of truth for approved project details.</p>
              </div>
              <ul className="space-y-space-sm pt-space-xs font-body-sm text-body-sm text-on-surface">
                <li className="flex items-start gap-space-xs"><MSIcon name="photo_library" size={18} className="text-secondary mt-0.5" /> Extension and renovation photography</li>
                <li className="flex items-start gap-space-xs"><MSIcon name="fact_check" size={18} className="text-secondary mt-0.5" /> Descriptions added through the staff workflow</li>
                <li className="flex items-start gap-space-xs"><MSIcon name="forum" size={18} className="text-secondary mt-0.5" /> Start a conversation about your own property</li>
              </ul>
              <Link to="/projects" className="w-full mt-auto inline-flex items-center justify-center gap-space-xs py-space-sm px-space-md bg-primary text-on-primary font-label-ui text-label-ui rounded hover:bg-surface-slate transition-colors font-semibold">
                <span>View the project gallery</span>
                <MSIcon name="arrow_forward" size={16} className="text-amber-highlight" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE OMNI — bg-surface-slate (dark) */}
      <section className="w-full py-space-3xl bg-surface-slate text-on-primary">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="inline-flex items-center gap-space-2xs px-space-sm py-1 rounded bg-surface-dark font-label-caps text-label-caps text-amber-highlight tracking-widest uppercase">
              A considered project route
            </span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-primary">
              Clear decisions from first conversation to handover
            </h2>
            <p className="font-body-lead text-body-lead text-surface-ground">
              A clear brief, visible decisions and regular communication give each home project a useful structure.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {PILLARS.map((p) => (
              <div key={p.title} className="p-space-lg rounded-xl bg-surface-dark flex flex-col justify-between space-y-space-md shadow-md">
                <div className="space-y-space-sm">
                  <div className="w-12 h-12 rounded bg-surface-slate text-amber-highlight flex items-center justify-center">
                    <MSIcon name={p.icon} size={28} />
                  </div>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-primary leading-tight">{p.title}</h3>
                  <p className="font-body-md text-body-md text-outline-variant leading-relaxed">{p.body}</p>
                </div>
                <div className="pt-space-xs">
                  <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-wider">{p.tag}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-space-2xl p-space-lg rounded-xl bg-surface-dark flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-on-secondary shrink-0">
                <MSIcon name="call" size={24} />
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-primary">Need to talk through your property?</h3>
                <p className="font-body-sm text-body-sm text-outline-variant">Speak directly with the team on 07928 149 731.</p>
              </div>
            </div>
            <div className="flex items-center gap-space-sm w-full md:w-auto">
              <a className="flex-1 md:flex-initial text-center px-space-md py-space-xs bg-amber-highlight text-surface-dark font-label-ui text-label-ui font-bold rounded hover:bg-secondary-container transition-colors" href="tel:+447928149731">
                Call 07928 149 731
              </a>
              <Link className="flex-1 md:flex-initial text-center px-space-md py-space-xs bg-surface-slate text-on-primary font-label-ui text-label-ui font-semibold rounded hover:bg-surface-pure hover:text-surface-dark transition-colors" to="/quote">
                Start a quote enquiry
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. THE 8-STEP CUSTOMER JOURNEY — bg-surface-ground */}
      <section className="w-full py-space-3xl bg-surface-ground">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Process &amp; Project Governance</span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">A Clear, Stress-Free Journey From Blueprint to Handover</h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              We strip out guesswork with a structured, transparent eight-step route from first conversation to handover.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm relative">
            {JOURNEY.map((j, i) => {
              const last = i === JOURNEY.length - 1;
              const color = last ? 'text-success-green' : 'text-secondary';
              return (
                <div key={j.step} className="p-space-md rounded-xl bg-surface-pure flex flex-col justify-between space-y-space-sm shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <span className={`font-label-caps text-label-caps ${color} font-bold`}>{j.step}</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-1">{j.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{j.body}</p>
                  </div>
                  <div className={`pt-space-xs ${color}`}>
                    <MSIcon name={j.icon} size={20} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-space-xl text-center">
            <Link to="/how-it-works" className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded bg-primary text-on-primary font-headline-sm text-headline-sm font-bold hover:bg-surface-slate transition-colors">
              <span>Explore the project route</span>
              <MSIcon name="arrow_forward" size={18} className="text-amber-highlight" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FEATURED RECENT PROJECTS — bg-surface-pure */}
      <section className="w-full py-space-3xl bg-surface-pure" id="featured-projects">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Proven Craftsmanship</span>
              <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Recent Projects in Manchester &amp; Cheshire</h2>
              <p className="font-body-lead text-body-lead text-on-surface-variant max-w-2xl">
                Browse supplied photographs and the project context currently approved for publication.
              </p>
            </div>
            <div className="project-filter-tabs grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-space-2xs bg-surface-ground p-1 rounded-lg self-stretch md:self-auto" aria-label="Filter recent projects">
              {availableFilters.map((f) => {
                const active = filter === f;
                return (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={`px-space-sm py-1 rounded font-label-ui text-label-ui font-semibold transition-all ${active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {filterLabels[f]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {visibleProjects.map((p) => (
              <div key={p.title} className="project-card flex flex-col bg-surface-ground rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all" data-category={p.category}>
                <div className="relative h-64 w-full overflow-hidden bg-surface-container">
                  <SafeImage sourceComponent="HomePage.ProjectCard" src={p.image} alt={p.alt} loading="eager" width={960} height={640} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded bg-surface-dark text-on-primary font-label-caps text-label-caps uppercase">{p.tag}</span>
                  <span className="absolute bottom-3 right-3 px-2 py-1 rounded bg-amber-highlight text-surface-dark font-label-caps text-label-caps font-bold">{p.badge}</span>
                </div>
                <div className="p-space-md flex flex-col flex-1 justify-between space-y-space-sm">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{p.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{p.body}</p>
                  </div>
                  <div className="pt-space-xs flex items-center justify-between font-label-ui text-label-ui">
                    <span className="text-on-surface-variant">Supplied project photography</span>
                    <Link to={`/projects/${p.slug}`} className="font-semibold text-secondary hover:underline flex items-center">View project <MSIcon name="arrow_forward" size={14} /></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-space-xl text-center">
            <Link to="/projects" className="inline-flex items-center gap-space-xs font-headline-sm text-headline-sm font-bold text-primary hover:text-secondary transition-colors">
              <span>View the supplied project gallery</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. CLIENT REVIEWS — owner approval required */}
      <section className="w-full py-space-3xl bg-surface-ground home-review-hidden" aria-hidden="true">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Homeowner Trust</span>
              <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">What Our Clients Say</h2>
              <p className="font-body-lead text-body-lead text-on-surface-variant">
                Owner-approved feedback will appear here when available.
              </p>
            </div>
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-2xs bg-surface-pure px-space-md py-space-xs rounded-lg shadow-sm">
                <span className="w-5 h-5 rounded-full bg-white border border-border-stone flex items-center justify-center text-[11px] font-bold" style={{ color: '#4285F4' }} aria-hidden="true">G</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">Rating pending owner approval</span>
                <span className="text-body-sm font-body-sm text-on-surface-variant">No rating published</span>
              </div>
              <Link to="/reviews" className="px-space-md py-space-xs rounded bg-surface-slate text-on-primary font-label-ui text-label-ui font-semibold hover:bg-primary transition-colors">
                Read All Reviews
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-space-lg rounded-xl bg-surface-pure shadow-sm flex flex-col justify-between space-y-space-md">
                <div className="space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-highlight">
                      {[0, 1, 2, 3, 4].map((i) => <MSIcon key={i} name="star" size={18} />)}
                    </div>
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant bg-surface-subtle px-2 py-0.5 rounded">{t.source}</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed italic">"{t.quote}"</p>
                </div>
                <div className="pt-space-xs flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-bold text-primary">{t.initials}</div>
                  <div>
                    <p className="font-headline-sm text-headline-sm font-bold text-on-surface">{t.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{t.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. COVERAGE AREA MATRIX — bg-surface-pure */}
      <section className="w-full py-space-3xl bg-surface-pure">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-6 space-y-space-md">
              <div className="space-y-space-xs">
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Operational Footprint</span>
                <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Serving Greater Manchester &amp; South Cheshire</h2>
                <p className="font-body-lead text-body-lead text-on-surface-variant">
                  Explore the locations currently listed in our coverage area. Service availability and planning requirements are discussed for each individual property.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-xs pt-space-xs">
                {TOWNS.map((town) => (
                  <div key={town} className="flex items-center gap-space-2xs p-space-xs rounded bg-surface-subtle">
                    <MSIcon name="location_on" size={18} className="text-secondary" />
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{town}</span>
                  </div>
                ))}
              </div>
              <div className="pt-space-xs flex items-center gap-space-md">
                  <Link to="/areas" className="font-label-ui text-label-ui font-semibold text-primary hover:text-secondary flex items-center gap-1">
                  <span>Explore coverage areas</span>
                  <MSIcon name="arrow_forward" size={16} />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6">
              <figure className="rounded-xl overflow-hidden shadow-md bg-surface-ground p-space-xs">
                <div className="relative w-full h-80 rounded-lg overflow-hidden bg-surface-dark">
                  <SafeImage
                    sourceComponent="HomePage.CoverageMap"
                    src="/images/omni-service-area-map-v2.png"
                    alt="Illustrated map showing Greater Manchester and Cheshire principal service areas"
                    width={1200}
                    height={800}
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-surface-dark/10 pointer-events-none" />
                  <figcaption className="absolute bottom-space-sm left-space-sm right-space-sm px-space-md py-space-xs rounded-lg bg-surface-dark/95 text-on-primary shadow-2xl">
                    <p className="font-headline-sm text-headline-sm font-bold">Coverage area</p>
                    <p className="font-body-sm text-body-sm text-outline-variant">Locations shown for orientation; availability is confirmed during enquiry.</p>
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CALL-TO-ACTION — bg-surface-slate (dark) */}
      <section className="w-full py-space-4xl bg-surface-slate text-on-primary relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center max-w-3xl lg:mx-auto">
          <span className="inline-flex items-center gap-space-2xs px-space-sm py-1 rounded bg-surface-dark font-label-caps text-label-caps text-amber-highlight tracking-widest uppercase mb-space-sm">
            Ready to Discuss Your Home Transformation?
          </span>
          <h2 className="font-display-hero text-display-hero-mobile md:text-display-hero font-extrabold tracking-tight text-on-primary leading-tight mb-space-md">
            Let&apos;s Build Something Exceptional Together
          </h2>
          <p className="font-body-lead text-body-lead text-surface-ground leading-relaxed mb-space-xl">
            Speak directly with Omni Developments Manchester Ltd. We provide honest, experienced advice, feasibility reviews, and transparent, line-by-line quotations with zero sales pressure.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-md">
            <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold shadow-xl hover:bg-secondary-container transition-all">
              <span>Request Your Free Quotation</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
            <a className="inline-flex items-center justify-center gap-space-2xs px-space-xl py-space-sm rounded bg-surface-dark text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-surface-pure hover:text-surface-dark transition-colors" href="tel:+447928149731">
              <MSIcon name="call" size={18} className="text-amber-highlight" />
              <span>Direct Call: 07928 149 731</span>
            </a>
            <a className="inline-flex items-center justify-center gap-space-2xs px-space-lg py-space-sm rounded bg-success-green/20 text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-success-green hover:text-surface-dark transition-colors" href="https://wa.me/447928149731" rel="noopener" target="_blank">
              <MSIcon name="chat" size={18} />
              <span>WhatsApp Message</span>
            </a>
          </div>
          <div className="mt-space-xl pt-space-md flex flex-wrap items-center justify-center gap-space-lg text-body-sm font-body-sm text-outline-variant">
            {([
              siteSettings.fmbRegistered && 'FMB Registered',
              siteSettings.publicLiabilityInsured && 'Full Public Liability Insured',
              siteSettings.structuralWarranty10yr && '10-Year Structural Warranty',
              siteSettings.buildingControlGuaranteed && 'Building Control Guaranteed',
            ].filter((x): x is string => typeof x === 'string')).map((label) => (
              <span key={label} className="flex items-center gap-1">
                <MSIcon name="verified" size={16} className="text-amber-highlight" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}












