import { Link } from 'react-router-dom';
import { site, services, projects } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

/**
 * Bespoke, Stitch-matched composition for "/services".
 *
 * Section order, grid structure, spacing and card shapes are translated
 * directly from the Stitch export at:
 *   Omni Development/.../omni_developments_manchester_services/code.html
 *
 * As with Home/About/Areas/Bathroom, a number of deliberate content-safety
 * edits were applied versus the Stitch copy — no fabricated stats, prices,
 * durations, star ratings, named reviews, unconfirmed accreditations/warranty
 * figures, or invented case-study cards. See REAL_CONTENT_REQUIRED.md and the
 * inline comments below for the specific substitutions.
 */

const HERO_TRUST_POINTS = [
  { icon: 'policy', label: 'Written Project Information' },
  { icon: 'verified_user', label: 'Regulatory Steps Discussed' },
  { icon: 'engineering', label: 'Direct Site Communication' },
] as const;

const PILLARS = [
  {
    icon: 'handshake',
    title: 'Customer-First Approach',
    body: 'Clear project information, a considered scope, and direct communication throughout the enquiry and build.',
    tag: 'Clear Project Scope',
  },
  {
    icon: 'architecture',
    title: 'Architectural Detail',
    body: 'Layout, structure and finishing choices are reviewed together so the proposed work remains practical and clear.',
    tag: 'Considered detailing',
  },
  {
    icon: 'supervisor_account',
    title: 'Daily Accountability',
    body: 'Project communication and site coordination are discussed around the scope, property and working arrangements.',
    tag: 'Clear coordination',
  },
  {
    icon: 'domain_verification',
    title: 'Regional Authority Fluency',
    body: 'We discuss the planning and building-control steps that may apply to the project and help keep the route clear.',
    tag: 'Local Planning Context',
  },
] as const;

const PROCESS_STEPS = [
  { num: '01', title: 'Initial Enquiry', body: 'Discovery call and preliminary drawings / scope review.', icon: 'phone_in_talk' },
  { num: '02', title: 'Site Survey', body: 'In-person technical audit, drainage and structural check.', icon: 'square_foot' },
  { num: '03', title: 'Scope & Quotation', body: 'A clear written outline of the proposed work and costs to discuss together.', icon: 'calculate' },
  { num: '04', title: 'Pre-Start Prep', body: 'Contract signing, procurement schedule, and site protection.', icon: 'assignment_turned_in' },
  { num: '05', title: 'Construction', body: 'The agreed structural, first-fix, second-fix and finishing work is coordinated through the build.', icon: 'construction' },
  { num: '06', title: 'Project Preparation', body: 'Materials, safety planning and site setup are confirmed before the build starts.', icon: 'fact_check' },
  { num: '07', title: 'Snagging Audit', body: 'A thorough internal and client walkthrough de-snagging process.', icon: 'rule' },
  { num: '08', title: 'Final Inspection & Handover', body: 'The final walkthrough and agreed project documentation close out the work.', icon: 'key' },
] as const;

const CLOSING_TRUST_CHIPS = ['Clear project communication', 'Written project information', 'Local planning context'] as const;

export default function ServicesPage() {
  const mainServices = services.slice(0, 6);
  const generalBuilding = services.find((service) => service.slug === 'general-building-work');

  return (
    <div className="flex flex-col w-full">
      {/* 1. Hero Section */}
      <section className="relative w-full bg-surface-slate text-on-primary overflow-hidden">
        <div className="relative z-10 max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop py-space-3xl lg:py-space-4xl flex flex-col lg:flex-row items-center gap-space-2xl">
          <div className="w-full lg:w-7/12 space-y-space-md">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-dark/60 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-highlight" />
              <span className="font-label-caps text-label-caps text-amber-highlight tracking-widest uppercase">Our Services</span>
            </div>
            <h1 className="font-display-hero text-display-hero-mobile lg:text-display-hero tracking-tight text-on-primary">
              Comprehensive Design &amp; Build Services
            </h1>
            <p className="font-body-lead text-body-lead text-outline-variant max-w-2xl leading-relaxed">
              Omni Developments delivers residential construction, bespoke extensions, structural renovations, and property
              improvements across {site.area}. We help clarify the scope, practical decisions, and project communication from
              enquiry through to handover.
            </p>
            <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
              <Link
                className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-semibold shadow-md hover:bg-secondary-container transition-colors"
                to="/quote"
              >
                <span>Discuss Your Project</span>
                <MSIcon name="arrow_forward" size={18} />
              </Link>
              <a
                className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-dark/80 text-on-primary font-headline-sm text-headline-sm hover:bg-surface-dark transition-colors"
                href="#services-catalogue"
              >
                <span>Explore Services</span>
                <MSIcon name="expand_more" size={18} />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-space-lg pt-space-md">
              {HERO_TRUST_POINTS.map((point) => (
                <div key={point.label} className="flex items-center gap-space-xs">
                  <MSIcon name={point.icon} size={20} className="text-amber-highlight" />
                  <span className="font-label-ui text-label-ui text-outline-variant">{point.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-5/12">
            <div className="relative rounded-xl overflow-hidden shadow-2xl bg-surface-dark">
              <SafeImage
                sourceComponent="ServicesPage.Hero"
                className="w-full h-96 lg:h-[480px] object-cover"
                alt="Finished rear extension from supplied project photography"
                src="/images/site-interior.webp"
                width={960}
                height={720}
              />
              <div className="absolute bottom-0 left-0 right-0 p-space-md bg-gradient-to-t from-surface-dark via-surface-dark/80 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-caps text-label-caps uppercase text-amber-highlight tracking-wider">Supplied Project Photography</p>
                    <p className="font-headline-sm text-headline-sm text-on-primary">Recent Extension &amp; Renovation Work</p>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-surface-slate flex items-center justify-center text-amber-highlight shrink-0">
                    <MSIcon name="check_circle" size={20} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Comprehensive Services Grid */}
      <section className="w-full py-space-3xl lg:py-space-4xl max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop" id="services-catalogue">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
          <div className="max-w-2xl space-y-space-2xs">
            <span className="font-label-caps text-label-caps tracking-widest uppercase text-secondary">Architectural Portfolio</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
              Specialised Residential Construction
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Considered project delivery for South Manchester, Cheshire, and Trafford homeowners.
            </p>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg">
            <MSIcon name="engineering" size={20} className="text-secondary" />
            <span className="font-label-ui text-label-ui text-on-surface-variant">On-site project management &amp; trades</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {mainServices.map((service, index) => (
            <article key={service.slug} className="flex flex-col bg-surface-pure rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-56 overflow-hidden bg-surface-subtle">
                <SafeImage
                  sourceComponent="ServicesPage.ServiceCard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={`${service.name} — supplied project photography`}
                  src={service.image}
                  width={960}
                  height={620}
                />
                <div className="absolute top-space-sm left-space-sm px-space-xs py-space-2xs bg-surface-dark/85 text-amber-highlight rounded font-label-caps text-label-caps tracking-wider uppercase">
                  {String(index + 1).padStart(2, '0')} • {service.shortName}
                </div>
              </div>
              <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                <div className="space-y-space-xs">
                  <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-secondary transition-colors">
                    {service.name}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{service.description}</p>
                  <ul className="space-y-space-2xs pt-space-xs">
                    {service.bullets.slice(0, 3).map((bullet) => (
                      <li key={bullet} className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface">
                        <MSIcon name="check_circle" size={18} className="text-success-green shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-space-xs">
                  <Link
                    className="inline-flex items-center gap-space-2xs font-headline-sm text-headline-sm text-secondary group-hover:translate-x-1 transition-transform"
                    to={`/services/${service.slug}`}
                  >
                    <span>Explore Service</span>
                    <MSIcon name="arrow_forward" size={18} className="text-amber-highlight" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {/* 07 • General Building Work — spans 3 columns on desktop for architectural balance */}
          {generalBuilding && (
            <article className="flex flex-col md:flex-row lg:col-span-3 bg-surface-pure rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="relative md:w-5/12 h-64 md:h-auto overflow-hidden bg-surface-subtle">
                <SafeImage
                  sourceComponent="ServicesPage.GeneralBuilding"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={`${generalBuilding.name} — supplied project photography`}
                  src={generalBuilding.image}
                  width={960}
                  height={620}
                />
                <div className="absolute top-space-sm left-space-sm px-space-xs py-space-2xs bg-surface-dark/85 text-amber-highlight rounded font-label-caps text-label-caps tracking-wider uppercase">
                  07 • Structural &amp; General Works
                </div>
              </div>
              <div className="p-space-lg md:p-space-xl md:w-7/12 flex flex-col justify-between space-y-space-md">
                <div className="space-y-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-secondary uppercase">Core Structural Capability</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Trafford &amp; Manchester coverage</span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface group-hover:text-secondary transition-colors">
                    {generalBuilding.name}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{generalBuilding.detail}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs pt-space-xs">
                    {generalBuilding.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface">
                        <MSIcon name="check_circle" size={18} className="text-success-green shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-space-sm flex flex-wrap items-center justify-between gap-space-sm">
                  <Link
                    className="inline-flex items-center gap-space-2xs font-headline-sm text-headline-sm text-secondary group-hover:translate-x-1 transition-transform"
                    to={`/services/${generalBuilding.slug}`}
                  >
                    <span>Explore Service</span>
                    <MSIcon name="arrow_forward" size={18} className="text-amber-highlight" />
                  </Link>
                   <span className="font-label-ui text-label-ui text-on-surface-variant font-medium">Project coordination support available</span>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      {/* 3. "Not Sure What Your Project Needs?" Consultation Banner */}
      <section className="w-full bg-surface-container-low py-space-2xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="p-space-xl lg:p-space-2xl rounded-2xl bg-surface-pure shadow-sm flex flex-col lg:flex-row items-center justify-between gap-space-xl">
            <div className="space-y-space-xs max-w-2xl">
              <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                <MSIcon name="help_outline" size={18} />
                <span>Early Stage Planning &amp; Feasibility</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Not sure what your project needs yet?
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Whether you need guidance on Permitted Development Rights, structural engineer calculations for an RSJ, or
                advice on balancing a rear extension with a loft conversion, our team offers direct technical insight before
                you commit.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm w-full lg:w-auto">
              <a
                className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-dark text-on-primary font-headline-sm text-headline-sm hover:bg-surface-slate transition-colors"
                href={site.phoneHref}
              >
                <MSIcon name="call" size={20} className="text-amber-highlight" />
                <span>{site.phone}</span>
              </a>
              <Link
                className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-subtle text-on-surface font-headline-sm text-headline-sm hover:bg-surface-container-high transition-colors"
                to="/contact"
              >
                <span>Book A Consultation</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "Why Homeowners Across Manchester Choose Omni" (4 Pillars) */}
      <section className="w-full py-space-3xl lg:py-space-4xl max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="text-center max-w-2xl mx-auto space-y-space-xs mb-space-2xl">
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">Architectural Standards</span>
          <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
            Why Homeowners Across Manchester Choose Omni
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Setting the standard for considered residential building with clear process and transparent communication.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="p-space-lg rounded-xl bg-surface-pure shadow-sm flex flex-col justify-between space-y-space-md">
              <div className="space-y-space-sm">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                  <MSIcon name={pillar.icon} size={28} />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{pillar.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{pillar.body}</p>
              </div>
              <span className="font-label-caps text-label-caps text-secondary uppercase font-semibold">{pillar.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Our Delivery Process (8 Steps) */}
      <section className="w-full bg-surface-pure py-space-3xl lg:py-space-4xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-2xl space-y-space-2xs mb-space-2xl">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">Structured Execution</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
              Our Delivery Process
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              From the first enquiry to Building Regulations sign-off, every phase is managed with clear milestones.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {PROCESS_STEPS.map((step) => (
              <div key={step.num} className="p-space-md rounded-lg bg-surface shadow-sm flex flex-col justify-between space-y-space-xs">
                <span className="font-stat-metric text-headline-lg text-secondary">{step.num}</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{step.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">{step.body}</p>
                </div>
                <MSIcon name={step.icon} size={20} className="text-secondary" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Client Trust — honest empty state, no fabricated reviews or star ratings */}
      <section className="w-full py-space-3xl lg:py-space-4xl max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="max-w-2xl mx-auto text-center space-y-space-sm">
          <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">Homeowner Trust</span>
          <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
            What Our Clients Say
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            We are building a verified review library for this site. Published feedback will appear here once it has been
            approved for use.
          </p>
          <div className="pt-space-sm">
            <Link
              className="inline-flex items-center gap-space-xs px-space-lg py-space-sm rounded-lg bg-surface-slate text-on-primary font-label-ui text-label-ui font-semibold hover:bg-primary transition-colors"
              to="/reviews"
            >
              <span>Visit the Reviews Page</span>
              <MSIcon name="arrow_forward" size={16} className="text-amber-highlight" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Recent Completed Projects — only real, supplied project data */}
      <section className="w-full py-space-3xl max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
          <div className="space-y-space-2xs max-w-xl">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">Case Study Showcase</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface tracking-tight">
              Recent Completed Projects
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              A look at supplied photography from structural extensions and interior work handed over across
              {' '}{site.area}.
            </p>
          </div>
          <Link className="inline-flex items-center gap-space-2xs font-headline-sm text-headline-sm text-secondary hover:text-on-surface transition-colors" to="/projects">
            <span>View All Projects</span>
            <MSIcon name="arrow_forward" size={18} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {projects.map((project) => (
            <Link
              key={project.slug}
              to={`/projects/${project.slug}`}
              className="group bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="relative h-48 overflow-hidden bg-surface-subtle">
                <SafeImage
                  sourceComponent="ServicesPage.ProjectCard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={`${project.title} — supplied project photography`}
                  src={project.image}
                  width={960}
                  height={640}
                />
                <span className="absolute top-space-xs left-space-xs px-space-xs py-space-2xs rounded bg-surface-dark/90 text-on-primary font-label-caps text-label-caps uppercase">
                  {project.category}
                </span>
              </div>
              <div className="p-space-md flex-1 flex flex-col justify-between space-y-space-xs">
                <div>
                  <div className="flex flex-wrap items-center gap-space-2xs pb-space-2xs">
                    {project.tags.map((tag) => (
                      <span key={tag} className="px-space-2xs py-[2px] rounded bg-surface-subtle font-label-caps text-label-caps uppercase text-on-surface-variant">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-secondary transition-colors">
                    {project.title}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">{project.description}</p>
                </div>
                <div className="pt-space-xs">
                  <span className="inline-flex items-center gap-space-2xs font-label-ui text-label-ui text-secondary font-semibold">
                    <span>View Case Study</span>
                    <MSIcon name="arrow_forward" size={16} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 8. Final Dark CTA Section */}
      <section className="w-full bg-surface-slate text-on-primary py-space-3xl lg:py-space-4xl relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop text-center space-y-space-lg">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-dark">
            <span className="w-2 h-2 rounded-full bg-amber-highlight" />
            <span className="font-label-caps text-label-caps text-amber-highlight tracking-widest uppercase">
              Ready to discuss your home transformation?
            </span>
          </div>
          <h2 className="font-display-hero text-display-hero-mobile lg:text-display-hero text-on-primary tracking-tight max-w-3xl mx-auto">
            Let&apos;s Discuss Your Project
          </h2>
          <p className="font-body-lead text-body-lead text-outline-variant max-w-2xl mx-auto leading-relaxed">
            Speak directly with our team. No pushy sales, just clear feasibility advice and a transparent, itemised
            quotation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-md">
            <Link
              className="inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-lg bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-semibold shadow-lg hover:bg-secondary-container transition-all"
              to="/quote"
            >
              <span>Request a Free Consultation</span>
              <MSIcon name="calendar_month" size={18} />
            </Link>
            <a
              className="inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-lg bg-surface-dark text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container transition-colors"
              href={site.phoneHref}
            >
              <MSIcon name="call" size={20} className="text-amber-highlight" />
              <span>Call Direct: {site.phone}</span>
            </a>
            <a
              className="inline-flex items-center gap-space-xs px-space-xl py-space-md rounded-lg bg-surface-dark text-success-green-light font-headline-sm text-headline-sm hover:bg-primary-container transition-colors"
              href={site.whatsappHref}
              rel="noopener"
              target="_blank"
            >
              <MSIcon name="chat" size={20} />
              <span>WhatsApp Message</span>
            </a>
          </div>
          <div className="pt-space-2xl border-t border-border-slate/50 max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-space-xl text-outline-variant">
            {CLOSING_TRUST_CHIPS.map((chip) => (
              <div key={chip} className="flex items-center gap-space-xs">
                <MSIcon name="check_circle" size={22} className="text-amber-highlight" />
                <span className="font-label-ui text-label-ui">{chip}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
