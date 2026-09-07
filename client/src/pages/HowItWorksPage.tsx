import { Link } from 'react-router-dom';
import { site } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

/**
 * The dedicated Stitch reference for this page
 * (omni_developments_manchester_how_it_works/code.html) specifies an
 * 8-stage process ("The 8-Stage Construction Blueprint"), not the 6-step
 * `journey` used elsewhere on the site — so this page uses its own local
 * step data rather than the shared `journey` array. Stage titles and
 * descriptions are taken from that Stitch HTML; fabricated claims in the
 * same reference (a "Client Governance SLA" stat panel, FMB/CHAS/warranty
 * badges, a named-client testimonial, a fake live Gantt schedule, and a
 * "Featured Transformation Spotlight" with invented project specifics) are
 * intentionally not reproduced — see REAL_CONTENT_REQUIRED.md.
 */
const HERO_METRICS = [
  { word: 'On-Site', desc: 'A foreman coordinates trades and logistics throughout the build.', color: 'text-on-primary' },
  { word: 'Written', desc: 'The scope and next decisions are recorded clearly before work begins.', color: 'text-amber-highlight' },
  { word: 'Direct', desc: 'One point of contact from enquiry through to handover.', color: 'text-on-primary' },
] as const;

const STAGES = [
  {
    number: '01',
    icon: 'perm_phone_msg',
    title: 'Project Enquiry',
    copy: 'Reach out via our online quote wizard, a direct call or WhatsApp. We discuss the initial scope, broad budget parameters and project feasibility.',
    involvement: 'An introductory call or message',
  },
  {
    number: '02',
    icon: 'architecture',
    title: 'Initial Consultation',
    copy: 'An in-depth review of your aspirations, spatial priorities and the architectural potential of the property, including any existing planning history.',
    involvement: 'A discovery meeting and spatial brief',
  },
  {
    number: '03',
    icon: 'straighten',
    title: 'Site Survey',
    copy: 'A full in-person property inspection — measurements, structural checks, drainage, service entries and any party wall considerations.',
    involvement: 'An on-site survey walkthrough',
  },
  {
    number: '04',
    icon: 'design_services',
    title: 'Design & Planning',
    copy: 'Where architectural plans are needed, our designers produce spatial concepts and planning submissions. Where drawings already exist, our team reviews the structural detail.',
    involvement: 'Drawing approvals and material selection',
  },
  {
    number: '05',
    icon: 'request_quote',
    title: 'Detailed Quotation',
    copy: 'A transparent, line-by-line schedule of works covering the agreed demolition, groundwork, structural work, carpentry, services and finishes.',
    involvement: 'Reviewing and agreeing the contract',
  },
  {
    number: '06',
    icon: 'construction',
    title: 'Project Preparation',
    copy: 'Site setup, procurement of key materials and safety planning are confirmed before work begins, alongside the agreed project contacts.',
    involvement: 'A pre-start briefing and project information',
  },
  {
    number: '07',
    icon: 'domain',
    title: 'Construction Phase',
    copy: 'The active build is coordinated against the agreed scope, with progress updates and reviews arranged around the project.',
    involvement: 'Progress reviews and agreed payment points',
  },
  {
    number: '08',
    icon: 'key',
    title: 'Inspection & Handover',
    copy: 'A thorough snagging review, completion walkthrough, full clean and handover of the agreed project documentation.',
    involvement: 'A final walkthrough and handover sign-off',
  },
] as const;

const APPROACH_CARDS = [
  {
    icon: 'engineering',
    title: 'Consistent On-Site Presence',
    body: 'The project contact, site logistics and agreed working arrangements are kept clear throughout the build.',
    tag: 'ON-SITE COORDINATION',
  },
  {
    icon: 'add_a_photo',
    title: 'Photo Updates As Work Progresses',
    body: 'Key stages can be recorded in project photos when useful, helping keep decisions and progress visible as the work moves forward.',
    tag: 'PROGRESS RECORDED IN PHOTOS',
  },
  {
    icon: 'gavel',
    title: 'Written Sign-Off On Changes',
    body: 'If an unforeseen issue is found once work is underway, it is explained, costed and agreed with you in writing before any extra work goes ahead.',
    tag: 'AGREED IN WRITING',
  },
  {
    icon: 'support_agent',
    title: 'Direct Contact Throughout Your Project',
    body: 'You are given a direct contact for your project so questions can be answered quickly, without navigating a general call centre.',
    tag: 'DIRECT CONTACT AVAILABLE',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="flex flex-col w-full">
      {/* BREADCRUMB STRIP */}
      <div className="w-full bg-surface-subtle">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop py-space-sm flex items-center gap-space-xs font-label-ui text-label-ui text-on-surface-variant">
          <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/">
            <MSIcon name="home" size={16} />
            <span>Home</span>
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="font-semibold text-primary">How It Works</span>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative w-full bg-surface-slate text-on-primary overflow-hidden py-space-3xl lg:py-space-4xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
            <div className="lg:col-span-8 space-y-space-md">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-dark text-amber-highlight font-label-caps text-label-caps tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-highlight animate-pulse" />
                Our Process
              </div>
              <h1 className="font-display-hero text-headline-xl lg:text-display-hero text-on-primary tracking-tight leading-tight">
                A Clear, Stress-Free Journey From Idea to Finished Home
              </h1>
              <p className="font-body-lead text-body-lead text-surface-container-high max-w-3xl leading-relaxed">
                Residential building work is complex, but your experience of it does not need to be. Our eight-stage process
                is designed to keep structural decisions, costs and communication visible from the first conversation
                through to a completed handover.
              </p>
              <div className="pt-space-sm flex flex-wrap items-center gap-space-md">
                <a
                  className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-lg py-space-sm bg-amber-highlight text-surface-dark font-bold rounded hover:bg-secondary-container transition-all shadow-md"
                  href="#process"
                >
                  <span>See Our Eight-Stage Process</span>
                  <MSIcon name="arrow_forward" size={18} />
                </a>
                <a
                  className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-lg py-space-sm bg-surface-dark text-on-primary font-semibold rounded hover:bg-surface-slate transition-colors shadow-sm"
                  href="#approach"
                >
                  <MSIcon name="verified_user" size={18} className="text-amber-highlight" />
                  <span>How We Keep You Informed</span>
                </a>
              </div>
            </div>
            {/* Way Of Working Tile */}
            <div className="lg:col-span-4 bg-surface-dark p-space-xl rounded-xl shadow-xl space-y-space-lg">
              <div className="pb-space-sm">
                <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-widest">
                  Our Way Of Working
                </span>
              </div>
              <div className="space-y-space-md">
                {HERO_METRICS.map((metric) => (
                  <div key={metric.word} className="flex items-baseline justify-between gap-space-md">
                    <span
                      className={`font-stat-metric text-[20px] sm:text-[24px] md:text-[26px] lg:text-[34px] xl:text-stat-metric tracking-tight shrink-0 ${metric.color}`}
                    >
                      {metric.word}
                    </span>
                    <span className="font-body-sm text-body-sm text-outline-variant text-right">{metric.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EIGHT-STAGE PROCESS */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-surface-ground" id="process">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop space-y-space-2xl">
          <div className="max-w-3xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">
              THE METHODOLOGY
            </span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">The 8-Stage Process</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Every project follows the same sequence, so decisions, scope and communication stay visible from the first
              conversation to the final walkthrough.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {STAGES.map((step) => (
              <div
                key={step.number}
                className="flex flex-col bg-surface-pure rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-space-md">
                  <span className="font-stat-metric text-headline-lg font-extrabold text-secondary group-hover:scale-105 transition-transform">
                    {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-surface-subtle flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <MSIcon name={step.icon} size={24} />
                  </div>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-space-xs">{step.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant flex-1 mb-space-md leading-relaxed">{step.copy}</p>
                <div className="pt-space-sm bg-surface-subtle -mx-space-lg -mb-space-lg p-space-md rounded-b-xl flex items-start gap-space-xs">
                  <MSIcon name="assignment_turned_in" size={18} className="text-secondary mt-0.5" />
                  <div>
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">
                      Client Involvement
                    </span>
                    <span className="font-label-ui text-label-ui font-semibold text-on-surface">{step.involvement}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMUNICATION & TRANSPARENCY */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-surface-pure" id="approach">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop space-y-space-2xl">
          <div className="text-center max-w-2xl mx-auto space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">
              COMMUNICATION &amp; TRANSPARENCY
            </span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              You&rsquo;re Kept Informed at Every Stage
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              We understand that home alterations can feel disruptive. Our process is designed to keep information moving
              from day one through to completion.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
            {APPROACH_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-surface-ground p-space-xl rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-space-sm">
                  <div className="w-12 h-12 rounded-lg bg-surface-slate text-amber-highlight flex items-center justify-center">
                    <MSIcon name={card.icon} size={26} />
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{card.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{card.body}</p>
                </div>
                <div className="pt-space-md">
                  <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-wider">
                    {card.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FROM OUR PROJECT GALLERY */}
      <section className="w-full py-space-3xl lg:py-space-4xl bg-surface-ground">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop space-y-space-2xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div>
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">
                OUR APPROACH IN PRACTICE
              </span>
              <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Delivered Through This Same Process
              </h2>
            </div>
            <Link
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui font-bold text-primary hover:text-secondary transition-colors"
              to="/projects"
            >
              <span>Explore Our Project Gallery</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
          </div>
          <div className="bg-surface-pure rounded-xl shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Project Image */}
            <div className="lg:col-span-7 relative h-72 lg:h-auto min-h-[380px]">
              <SafeImage
                sourceComponent="HowItWorksPage.Gallery"
                className="w-full h-full object-cover"
                alt="Supplied project photography — completed rear extension exterior with bi-fold doors"
                src="/images/site-interior.jpeg"
                width={960}
                height={640}
              />
              <div className="absolute top-space-md left-space-md bg-surface-dark/85 backdrop-blur-md px-space-sm py-space-2xs rounded font-label-caps text-label-caps text-amber-highlight">
                SUPPLIED PROJECT PHOTOGRAPHY
              </div>
            </div>
            {/* Project Detail Panel */}
            <div className="lg:col-span-5 p-space-xl lg:p-space-2xl flex flex-col justify-between space-y-space-lg">
              <div className="space-y-space-sm">
                <span className="font-label-caps text-label-caps text-secondary font-bold tracking-widest uppercase">
                  FROM OUR PROJECT GALLERY
                </span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface leading-tight">
                  A Completed Project, Delivered Step By Step
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  This project followed the same eight-stage process outlined above, from the first conversation through to
                  final handover. More supplied photography from our completed work is available in the project gallery.
                </p>
              </div>
              <div>
                <Link
                  className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-md py-space-xs rounded bg-surface-slate text-on-primary font-semibold hover:bg-primary transition-colors"
                  to="/projects"
                >
                  <span>View Project Gallery</span>
                  <MSIcon name="photo_library" size={16} className="text-amber-highlight" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="w-full bg-surface-slate text-on-primary py-space-3xl lg:py-space-4xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center space-y-space-lg">
          <div className="max-w-2xl mx-auto space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight font-bold">
              START WITH A FEASIBILITY CONVERSATION
            </span>
            <h2 className="font-headline-xl text-headline-xl text-on-primary tracking-tight">
              Ready to Start Your Home Transformation?
            </h2>
            <p className="font-body-lead text-body-lead text-surface-container-high leading-relaxed">
              Speak directly with our team. You&rsquo;ll get honest feasibility advice, practical guidance, and a
              transparent, itemised quotation with no obligation.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-sm">
            <Link
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-xl py-space-sm bg-amber-highlight text-surface-dark font-bold rounded hover:bg-secondary-container transition-all shadow-md"
              to="/quote"
            >
              <span>Start Your Project Enquiry</span>
              <MSIcon name="arrow_forward" size={18} />
            </Link>
            <a
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-lg py-space-sm bg-surface-dark text-on-primary font-semibold rounded hover:bg-primary transition-colors"
              href={site.phoneHref}
            >
              <MSIcon name="call" size={18} className="text-secondary" />
              <span>Call Direct: {site.phone}</span>
            </a>
            <a
              className="inline-flex items-center gap-space-xs font-label-ui text-label-ui px-space-lg py-space-sm bg-surface-dark text-success-green-light font-semibold rounded hover:bg-primary transition-colors"
              href={site.whatsappHref}
              rel="noopener"
              target="_blank"
            >
              <MSIcon name="chat" size={18} />
              <span>WhatsApp Message</span>
            </a>
          </div>
          <div className="pt-space-md text-outline-variant font-body-sm text-body-sm flex flex-wrap items-center justify-center gap-space-lg">
            <span className="flex items-center gap-1">
              <MSIcon name="verified" size={16} className="text-amber-highlight" />
              Free On-Site Consultation
            </span>
            <span className="flex items-center gap-1">
              <MSIcon name="receipt_long" size={16} className="text-amber-highlight" />
              Itemised Line-by-Line Pricing
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
