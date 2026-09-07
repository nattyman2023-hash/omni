import { Link } from 'react-router-dom';
import { site, projects } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

const TRUST_CHIPS = [
  { icon: 'engineering', label: 'Project coordination discussed' },
  { icon: 'policy', label: 'Written project scopes' },
  { icon: 'share_location', label: 'Local planning experience' },
  { icon: 'verified_user', label: 'Clear daily communication' },
] as const;

const METRIC_CARDS = [
  {
    word: 'On-Site',
    title: 'On-Site Management',
    body: 'A single accountable team from start to finish.',
    tone: 'light',
  },
  {
    word: 'Written Scope',
    title: 'Clear Project Information',
    body: 'Clear scope and decisions recorded before work begins.',
    tone: 'light',
  },
  {
    word: 'Direct',
    title: 'Direct Communication',
    body: 'One point of contact throughout the project.',
    tone: 'light',
  },
  {
    word: 'Local',
    title: 'Local Accountability',
    body: `Working across ${site.area}.`,
    tone: 'dark',
  },
] as const;

const VALUE_CARDS = [
  {
    icon: 'record_voice_over',
    title: 'Customer-First Approach',
    body: 'We listen carefully to spatial priorities and daily living routines before engineering solutions. No high-pressure sales, just honest feasibility guidance and design practicality.',
    tag: 'Client Consultation Priority',
  },
  {
    icon: 'square_foot',
    title: 'Exceptional Attention to Detail',
    body: 'Structural, spatial and finishing choices are reviewed together so the proposed work remains practical and clear.',
    tag: 'Considered detailing',
  },
  {
    icon: 'mark_chat_read',
    title: 'Clear Communication',
    body: 'Project updates and decisions are kept clear so you know what has been discussed and what comes next.',
    tag: 'Clear updates',
  },
  {
    icon: 'share_location',
    title: 'Local Authority Knowledge',
    body: 'Planning and building-control requirements are discussed in relation to the property, the brief and the relevant local route.',
    tag: 'Local context',
  },
] as const;

const PROCESS_STAGES = [
  {
    stage: 'STAGE 01',
    title: 'Planning & Feasibility',
    body: 'The available drawings, property information and permissions are reviewed so the scope and next decisions are clear.',
    image: '/images/works-site.jpeg',
    alt: 'Construction site-progress supplied photography',
  },
  {
    stage: 'STAGE 02',
    title: 'Groundworks & Steel',
    body: 'Groundworks, structural requirements, insulation and external connections are coordinated around the agreed scope.',
    image: '/images/timber-frame.jpeg',
    alt: 'Construction site-progress supplied photography',
  },
  {
    stage: 'STAGE 03',
    title: 'Artisanal Craftsmanship',
    body: 'Services, joinery, kitchens, bathrooms and other finishes are coordinated as the work develops.',
    image: '/images/interior-stair.jpeg',
    alt: 'Interior supplied photography',
  },
  {
    stage: 'STAGE 04',
    title: 'Handover & Sign-Off',
    body: 'The closing review records outstanding details and the agreed handover information for the completed work.',
    image: '/images/home-front.jpeg',
    alt: 'Exterior extension supplied photography',
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex flex-col w-full">
      {/* HERO SECTION */}
      <section className="relative bg-surface py-space-3xl lg:py-space-4xl overflow-hidden">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
            {/* Left Editorial Content (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-amber-subtle text-secondary font-label-caps text-label-caps tracking-widest uppercase mb-space-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-highlight" />
                About Omni Developments
              </div>
              <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight mb-space-lg">
                Built Around Quality, Communication and Craftsmanship
              </h1>
              <p className="font-body-lead text-body-lead text-on-surface-variant max-w-2xl mb-space-xl">
                Founded on the principle that residential building should be transparent, disciplined, and stress-free. Delivering
                architectural extensions, complete home renovations, and bespoke refurbishments across Greater Manchester and
                Cheshire.
              </p>
              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-space-md mb-space-2xl w-full sm:w-auto">
                <Link
                  className="w-full sm:w-auto text-center px-space-xl py-space-sm bg-secondary hover:bg-on-secondary-container text-on-primary font-headline-sm text-headline-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-space-xs"
                  to="/quote"
                >
                  <span>Discuss Your Project</span>
                  <MSIcon name="arrow_forward" size={18} />
                </Link>
                <Link
                  className="w-full sm:w-auto text-center px-space-xl py-space-sm bg-surface-pure hover:bg-surface-subtle text-on-surface font-headline-sm text-headline-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-space-xs"
                  to="/projects"
                >
                  <span>Explore supplied work</span>
                  <MSIcon name="architecture" size={18} />
                </Link>
              </div>
              {/* Trust Chips Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs w-full pt-space-md">
                {TRUST_CHIPS.map((chip) => (
                  <div key={chip.label} className="bg-surface-pure p-space-sm rounded-lg shadow-sm flex items-center gap-space-xs">
                    <MSIcon name={chip.icon} size={20} className="text-amber-highlight" />
                    <span className="font-label-ui text-label-ui text-on-surface">{chip.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right Architectural Imagery (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-surface-slate aspect-[4/5]">
                <SafeImage
                  sourceComponent="AboutPage.Hero"
                  className="w-full h-full object-cover"
                  alt="Branded Omni Developments vehicle from supplied photography"
                  src="/images/about-omni-van.webp"
                  width={960}
                  height={1200}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/80 via-transparent to-transparent" />
                {/* Bottom Floating Trust Metric Tag */}
                <div className="absolute bottom-space-lg left-space-lg right-space-lg bg-surface-slate/95 backdrop-blur-md p-space-md rounded-xl text-on-primary shadow-lg flex items-center gap-space-md">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <MSIcon name="history_edu" size={24} className="text-on-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm text-on-primary leading-tight">Design &amp; Build</span>
                    <span className="font-body-sm text-body-sm text-primary-fixed-dim">
                      Practical, considered residential projects across {site.area}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: OUR STORY */}
      <section className="bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-start">
            {/* Story Copy (7 cols) */}
            <div className="lg:col-span-7 space-y-space-md">
              <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps tracking-widest uppercase">
                <span className="w-2 h-0.5 bg-amber-highlight" />
                Established Heritage
              </div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                A Greater Manchester Contractor Built on Word-of-Mouth
              </h2>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed pt-space-xs">
                Omni Developments operates with a single fundamental principle: treat every homeowner&apos;s property as if it
                were our own. By keeping management on site and avoiding the fragmentation of untracked subcontractors, we keep
                structural and financial accountability with one team from start to finish.
              </p>
              <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                From structural engineer meetings to party wall negotiations and the final joinery handover, the same points of
                contact stay involved throughout &mdash; across projects in {site.area}, including Altrincham, Hale and Wilmslow.
              </p>
            </div>
            {/* 4 Metric Cards Grid (5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-space-md">
              {METRIC_CARDS.map((card) =>
                card.tone === 'dark' ? (
                  <div
                    key={card.title}
                    className="p-space-lg rounded-xl bg-surface-slate text-on-primary shadow-md flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-space-2xs text-amber-highlight">
                      <span className="font-stat-metric text-headline-lg text-amber-highlight tracking-tight">{card.word}</span>
                    </div>
                    <div className="mt-space-md">
                      <p className="font-headline-sm text-headline-sm text-on-primary">{card.title}</p>
                      <p className="font-body-sm text-body-sm text-outline-variant">{card.body}</p>
                    </div>
                  </div>
                ) : (
                  <div key={card.title} className="p-space-lg rounded-xl bg-surface shadow-sm flex flex-col justify-between">
                    <span className="font-stat-metric text-headline-lg text-on-surface tracking-tight">{card.word}</span>
                    <div className="mt-space-md">
                      <p className="font-headline-sm text-headline-sm text-on-surface">{card.title}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{card.body}</p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WHAT MATTERS TO US (CORE VALUES) */}
      <section className="bg-surface py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-2xl">
            <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps tracking-widest uppercase mb-space-xs">
              <span className="w-2 h-0.5 bg-amber-highlight" />
              Our Guiding Principles
            </div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-space-sm">
              The Standards That Define Every Build
            </h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              We strip away traditional trade unpredictability with structured project oversight, uncompromising craftsmanship,
              and transparent communication.
            </p>
          </div>
          {/* Bento Style Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {VALUE_CARDS.map((value) => (
              <div key={value.title} className="p-space-xl bg-surface-pure rounded-xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-surface-subtle text-secondary flex items-center justify-center mb-space-md">
                    <MSIcon name={value.icon} size={26} />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">{value.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{value.body}</p>
                </div>
                <div className="mt-space-md pt-space-sm text-secondary font-label-caps text-label-caps tracking-wider flex items-center gap-space-2xs uppercase">
                  <span>{value.tag}</span>
                </div>
              </div>
            ))}
            {/* Value 5 (Spanning 2 cols on tablet/desktop for balance) */}
            <div className="p-space-xl bg-surface-slate text-on-primary rounded-xl shadow-md flex flex-col justify-between md:col-span-2 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md items-center">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-surface-dark text-amber-highlight flex items-center justify-center mb-space-md">
                    <MSIcon name="engineering" size={26} />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-primary mb-space-xs">Reliable Project Management</h3>
                  <p className="font-body-md text-body-md text-outline-variant">
                    Project coordination, site communication and the agreed working arrangements are kept visible from
                    preparation through to the closing review.
                  </p>
                </div>
                <div className="p-space-md bg-surface-dark/60 rounded-lg space-y-space-xs">
                  <div className="flex items-center gap-space-xs text-body-sm text-on-primary">
                    <MSIcon name="check_circle" size={18} className="text-success-green" />
                    <span>Agreed site arrangements</span>
                  </div>
                  <div className="flex items-center gap-space-xs text-body-sm text-on-primary">
                    <MSIcon name="check_circle" size={18} className="text-success-green" />
                    <span>Practical site protection</span>
                  </div>
                  <div className="flex items-center gap-space-xs text-body-sm text-on-primary">
                    <MSIcon name="check_circle" size={18} className="text-success-green" />
                    <span>Clear project contact</span>
                  </div>
                </div>
              </div>
              <div className="mt-space-md pt-space-sm text-amber-highlight font-label-caps text-label-caps tracking-wider flex items-center gap-space-2xs uppercase">
                <span>Project coordination approach</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: OUR APPROACH TO EVERY PROJECT (4 STAGES) */}
      <section className="bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div>
              <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps tracking-widest uppercase mb-space-xs">
                <span className="w-2 h-0.5 bg-amber-highlight" />
                End-to-End Rigour
              </div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                From Architectural Concept to Flawless Finish
              </h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              A practical four-stage project route that keeps the brief, decisions and next steps visible.
            </p>
          </div>
          {/* 4 Photographic Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {PROCESS_STAGES.map((stage) => (
              <div
                key={stage.stage}
                className="group rounded-xl overflow-hidden bg-surface shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative h-48 w-full bg-surface-slate overflow-hidden">
                  <SafeImage
                    sourceComponent="AboutPage.ProcessCard"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={stage.alt}
                    src={stage.image}
                    width={960}
                    height={640}
                  />
                  <div className="absolute top-space-sm left-space-sm bg-surface-dark/90 text-amber-highlight px-space-xs py-space-2xs rounded font-label-caps text-label-caps">
                    {stage.stage}
                  </div>
                </div>
                <div className="p-space-lg flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">{stage.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{stage.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: TEAM CONTENT — owner-approved profiles only */}
      <section className="bg-surface py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mx-auto rounded-xl bg-surface-pure p-space-xl lg:p-space-2xl text-center shadow-sm">
            <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps tracking-widest uppercase mb-space-xs">
              <span className="w-2 h-0.5 bg-amber-highlight" />
              The team behind the conversation
            </div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-space-sm">
              Project contacts will be listed here
            </h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">
              Owner-approved team profiles and roles will be added through the staff content workflow when the information is ready to publish.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: SELECTED TRANSFORMATIONS */}
      <section className="bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div>
              <div className="inline-flex items-center gap-space-xs text-secondary font-label-caps text-label-caps tracking-widest uppercase mb-space-xs">
                <span className="w-2 h-0.5 bg-amber-highlight" />
                Proven Track Record
              </div>
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Selected Transformations</h2>
            </div>
            <Link
              className="inline-flex items-center gap-space-xs text-secondary hover:text-on-secondary-container font-headline-sm text-headline-sm"
              to="/projects"
            >
              <span>View supplied project photography</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
          </div>
          {/* 3 Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {projects.map((project) => (
              <Link
                key={project.slug}
                to={`/projects/${project.slug}`}
                className="group rounded-xl overflow-hidden bg-surface shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="relative h-60 w-full bg-surface-slate overflow-hidden">
                  <SafeImage
                    sourceComponent="AboutPage.ProjectCard"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={`${project.title} — supplied project photography`}
                    src={project.image}
                    width={960}
                    height={640}
                  />
                  <div className="absolute top-space-sm left-space-sm bg-surface-dark/85 text-on-primary px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase">
                    {project.category}
                  </div>
                </div>
                <div className="p-space-lg">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-2xs">{project.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">{project.description}</p>
                  <div className="flex flex-wrap items-center gap-space-2xs">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase bg-surface-subtle text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: CLOSING CTA */}
      <section className="bg-surface-slate text-on-primary py-space-3xl relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-dark text-amber-highlight font-label-caps text-label-caps tracking-widest uppercase mb-space-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-highlight" />
            Direct Consultation
          </div>
          <h2 className="font-headline-xl text-headline-xl text-on-primary tracking-tight max-w-2xl mb-space-md">
            Ready to Discuss Your Home Transformation?
          </h2>
          <p className="font-body-lead text-body-lead text-outline-variant max-w-xl mb-space-xl">
            Book an obligation-free feasibility review at your property. We inspect your structure, evaluate planning
            viability, and provide transparent budget guidelines.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-space-md w-full sm:w-auto justify-center mb-space-2xl">
            <Link
              className="w-full sm:w-auto text-center px-space-xl py-space-sm bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm rounded-lg shadow-md hover:bg-secondary-container transition-all flex items-center justify-center gap-space-xs"
              to="/quote"
            >
              <span>Request a Free Feasibility Consultation</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
            <a
              className="w-full sm:w-auto text-center px-space-xl py-space-sm bg-surface-dark text-on-primary hover:text-amber-highlight font-headline-sm text-headline-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-space-xs"
              href={site.phoneHref}
            >
              <MSIcon name="call" size={18} className="text-amber-highlight" />
              <span>Call Direct: {site.phone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
