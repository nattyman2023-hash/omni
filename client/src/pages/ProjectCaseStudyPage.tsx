import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { site, services, Project } from '../data/content';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';
import ProjectGallery from '../components/ProjectGallery';
import { getProjectGallery, getPublishedProject, usePublishedProjects } from '../data/projectFeed';

/**
 * Bespoke, Stitch-matched composition for /projects/:slug — the individual
 * project "case study" template. One template, parametrized by published
 * `Project` records returned by the project workspace API (with the supplied
 * records as an offline fallback).
 *
 * Section order, grid structure, spacing and card shapes are translated from
 * the Stitch export at:
 *   Omni Development/.../omni_developments_manchester_project_case_study/code.html
 *
 * The Stitch template invents a large amount of per-project "fact" content
 * that does not exist anywhere in this project's verified data: a specific
 * price, a build duration in weeks, a completion date, a named client
 * testimonial with a 10/10 scorecard, a specific street address, an
 * interactive comparison of a named property, a fabricated
 * spec-sheet of materials/measurements (e.g. "8.8 Metres", "0.13 W/m²K",
 * "VMZinc", "Schuco ASS70"), named staff members, and numeric accreditation
 * claims (e.g. "£5M", "10-Year", "5.0 Stars"). None of that exists in the
 * real `Project` type (`slug, title, location, category, description, image,
 * gallery, tags`), so none of it is published here — see the inline comments
 * below for where content was omitted or replaced with real, category-level
 * data instead.
 */

const CATEGORY_SERVICE_SLUG: Record<string, string> = {
  Extensions: 'home-extensions',
  Renovations: 'property-renovations',
  Bathrooms: 'bathroom-renovations',
};

const CATEGORY_ICON: Record<string, string> = {
  Extensions: 'architecture',
  Renovations: 'home_work',
  Bathrooms: 'wc',
};

const CATEGORY_COPY: Record<string, { brief: string; scope: string; approach: string }> = {
  Extensions: {
    brief:
      'Extension projects usually start the same way: a home that has run out of light, space or connection to the garden. The brief is to understand what the household actually needs from the new space before any structural decisions are made.',
    scope:
      'Depending on the property, the scope can include structural steelwork, new openings, roof and glazing changes, and reconfiguring the rooms that meet the new space. We keep the scope written down so it stays easy to compare against the finished work.',
    approach:
      'We coordinate the structural, building-control and trade sequencing so the site stays safe and the household disruption is kept to a minimum, with clear communication throughout the build.',
  },
  Renovations: {
    brief:
      'Renovation and improvement projects are often a sequence of connected decisions — internal layout, external works, finishes — rather than a single job. The brief is to understand which of those matter most to the homeowner.',
    scope:
      'The scope can span internal reconfiguration, external and driveway works, landscaping and general building repairs. We agree the priorities in writing so the project stays focused on what the property actually needs.',
    approach:
      'We sequence the trades and keep the site tidy and accessible throughout, with regular updates so the homeowner always knows what stage the work has reached.',
  },
  Bathrooms: {
    brief:
      'A bathroom project usually starts with a room that no longer works well for the household — poor layout, tired finishes or ageing plumbing. The brief is to understand how the space should function before any fittings are chosen.',
    scope:
      'The scope typically covers plumbing and waterproofing preparation, tiling, fixtures and ventilation, finished to a tidy, coordinated standard.',
    approach:
      'We take care of the demolition, first-fix plumbing, tanking, tiling and second-fix installation as one coordinated process, with a clean, well-sealed handover.',
  },
};

const DEFAULT_CATEGORY_COPY = {
  brief: 'Every project starts with a clear brief: what is not working today, and what the finished work needs to make possible.',
  scope: 'The scope is agreed and written down early, so the priorities stay visible throughout the build.',
  approach: 'We coordinate the trades and keep communication clear from the first site visit through to handover.',
};

export default function ProjectCaseStudyPage() {
  const { slug } = useParams();
  const publishedProjects = usePublishedProjects();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    setProject(undefined);
    getPublishedProject(slug || '').then((nextProject) => {
      if (mounted) setProject(nextProject);
    });
    return () => { mounted = false; };
  }, [slug]);

  if (project === undefined) {
    return <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop py-space-4xl text-center"><p className="font-body-md text-body-md text-on-surface-variant">Loading project…</p></div>;
  }

  if (!project) {
    return (
      <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop py-space-4xl text-center">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-space-sm">Project not found</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
          We couldn&apos;t find a project matching that link. It may have been renamed or the address may be out of date.
        </p>
        <Link className="font-label-ui text-label-ui text-secondary font-semibold hover:text-primary transition-colors" to="/projects">
          Back to all projects
        </Link>
      </div>
    );
  }

  const relatedService = services.find((item) => item.slug === CATEGORY_SERVICE_SLUG[project.category]);
  const categoryIcon = CATEGORY_ICON[project.category] ?? 'architecture';
  const copy = CATEGORY_COPY[project.category] ?? DEFAULT_CATEGORY_COPY;
  const otherProjects = publishedProjects.filter((item) => item.slug !== project.slug);
  const gallery = getProjectGallery(project);

  return (
    <div className="flex flex-col w-full">
      {/* BREADCRUMB & CONTEXT STRIP */}
      <section className="w-full bg-surface-container-low py-space-sm">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/">
              <MSIcon name="home" size={16} />
              <span>Home</span>
            </Link>
            <MSIcon name="chevron_right" size={14} />
            <Link className="hover:text-primary transition-colors" to="/projects">Projects</Link>
            <MSIcon name="chevron_right" size={14} />
            <span className="text-on-surface font-semibold truncate">{project.title}</span>
          </nav>
        </div>
      </section>

      {/* EDITORIAL HERO HEADER */}
      <section className="w-full bg-surface-ground pt-space-2xl pb-space-xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-end mb-space-xl">
            <div className="lg:col-span-8 space-y-space-xs">
              <div className="flex flex-wrap items-center gap-space-xs">
                <span className="px-space-xs py-space-2xs bg-amber-subtle text-on-secondary-container font-label-caps text-label-caps uppercase tracking-wider rounded">
                  Case Study &bull; {project.category}
                </span>
                <span className="inline-flex items-center gap-1 text-on-surface-variant font-label-ui text-label-ui">
                  <MSIcon name="location_on" size={16} className="text-amber-highlight" />
                  {project.location}
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary tracking-tight">
                {project.title}
              </h1>
              <p className="font-body-lead text-body-lead text-on-surface-variant max-w-3xl leading-relaxed">
                {project.description}
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end items-center gap-space-xs">
              <a
                className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-slate text-on-primary rounded font-label-ui text-label-ui shadow-sm hover:bg-primary-container transition-all"
                href="#gallery"
              >
                <MSIcon name="photo_library" size={18} className="text-amber-highlight" />
                <span>View Project Gallery</span>
              </a>
              <Link
                className="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-secondary text-on-secondary rounded font-label-ui text-label-ui shadow-sm hover:bg-on-secondary-container transition-all"
                to="/quote"
              >
                <span>Enquire On This Build</span>
                <MSIcon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
          {/* Hero Cinematic Visual Card */}
          <div className="relative w-full rounded-xl overflow-hidden shadow-xl bg-surface-dark aspect-[16/9] max-h-[640px]">
            <SafeImage
              sourceComponent="ProjectCaseStudyPage.Hero"
              className="w-full h-full object-cover"
              alt={`${project.title} — supplied project photography`}
              src={project.image}
              width={1200}
              height={800}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-surface-dark/90 via-surface-dark/40 to-transparent p-space-lg text-on-primary">
              <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-widest block mb-space-2xs">
                Supplied Project Photography
              </span>
              <p className="font-headline-sm text-headline-sm text-on-primary">{project.title}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROJECT SUMMARY BAR — real fields only (category, location, gallery count); no fabricated
          duration, handover date or building-control claim */}
      <section className="w-full bg-surface-container-lowest -mt-8 relative z-10">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="bg-surface-pure rounded-xl shadow-lg p-space-md lg:p-space-lg grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <div className="space-y-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">Project Type</span>
              <p className="font-headline-sm text-headline-sm text-primary">{project.category}</p>
            </div>
            <div className="space-y-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">Location</span>
              <p className="font-headline-sm text-headline-sm text-primary">{project.location}</p>
            </div>
            <div className="space-y-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">Gallery</span>
              <p className="font-headline-sm text-headline-sm text-primary">{gallery.length} supplied photos</p>
              <span className="font-body-sm text-body-sm text-on-surface-variant block">{project.tags.join(' • ')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* NARRATIVE SECTION: BRIEF, SCOPE & APPROACH — generic, category-level copy; no invented
          measurements, materials, staff names or client-specific claims */}
      <section className="w-full bg-surface-ground py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl">
            {/* Left Editorial Pillar */}
            <div className="lg:col-span-4 space-y-space-lg">
              <div className="bg-surface-slate text-on-primary p-space-xl rounded-xl shadow-md space-y-space-md">
                <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs bg-surface-dark rounded text-amber-highlight font-label-caps text-label-caps uppercase tracking-wider">
                  <MSIcon name={categoryIcon} size={16} />
                  Project Overview
                </div>
                <h2 className="font-headline-md text-headline-md text-on-primary leading-snug">{project.title}</h2>
                <p className="font-body-sm text-body-sm text-outline-variant leading-relaxed">{project.description}</p>
                {project.tags.length > 0 && (
                  <ul className="space-y-space-2xs pt-space-2xs">
                    {project.tags.map((tag) => (
                      <li key={tag} className="flex items-center gap-space-xs font-body-sm text-body-sm text-surface-container-high py-1">
                        <MSIcon name="check_circle" size={16} className="text-amber-highlight shrink-0" />
                        <span>{tag}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* How We Work — general, non-project-specific claims only */}
              <div className="bg-surface-pure p-space-lg rounded-xl shadow-sm space-y-space-sm">
                <div className="flex items-center gap-space-xs text-secondary">
                  <MSIcon name="verified_user" size={24} />
                  <span className="font-headline-sm text-headline-sm text-primary">How We Work</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                   We keep clients informed at every stage of the build and provide written project information before work begins.
                </p>
                <div className="flex items-center gap-space-xs pt-space-2xs text-body-sm font-body-sm text-on-surface font-semibold">
                  <MSIcon name="check" size={18} className="text-success-green" />
                  Clear Scope, Written Quotation
                </div>
              </div>
            </div>
            {/* Right Detailed Narrative */}
            <div className="lg:col-span-8 space-y-space-2xl">
              <div className="space-y-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-primary">01</span>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Project Overview</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">The Brief</h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{copy.brief}</p>
              </div>
              <div className="space-y-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-primary">02</span>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Scope Of Work</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">The Scope</h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{copy.scope}</p>
              </div>
              <div className="space-y-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-primary">03</span>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">How We Deliver</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Our Approach</h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{copy.approach}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shared gallery viewer. The CRM controls the image order; the main image
          is normalized to the first frame and duplicates are removed. */}
      <ProjectGallery projectTitle={project.title} images={gallery} />

      {/* SCOPE OF WORK — single card built from the real, approved service bullets for this
          project's category (client/src/data/content.ts), not a fabricated per-project spec sheet */}
      {relatedService && (
        <section className="w-full bg-surface-ground py-space-3xl">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-space-2xl gap-space-md">
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Scope Of Work</span>
                <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary tracking-tight">
                  What This Type Of Project Can Involve
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                {relatedService.description}
              </p>
            </div>
            <div className="bg-surface-pure p-space-lg lg:p-space-xl rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-space-md">
                <MSIcon name={categoryIcon} size={20} />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-space-sm">{relatedService.name}</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-xs font-body-md text-body-md text-on-surface-variant">
                {relatedService.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <MSIcon name="check" size={16} className="text-success-green mt-1 shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="inline-flex items-center gap-space-2xs mt-space-lg font-label-ui text-label-ui text-secondary font-semibold hover:text-primary transition-colors"
                to={`/services/${relatedService.slug}`}
              >
                <span>Explore this service</span>
                <MSIcon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY: PHOTO MOSAIC — same supplied images as above in a mosaic layout; captions are
          kept neutral ("supplied project photography") rather than inventing specific per-photo
          descriptions, per PHOTO_MAPPING.md (no owner-verified feature descriptions exist) */}
      <section className="w-full bg-surface py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-2xl mb-space-xl space-y-space-xs">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Detail &amp; Finishes</span>
            <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary tracking-tight">Project Visual Gallery</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              A closer look at the supplied project photography for {project.title.toLowerCase()}.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {gallery.map((image, index) => (
              <div
                key={`${image.src}-${index}`}
                className={`group relative rounded-xl overflow-hidden shadow-md bg-surface-dark ${
                  index === 0 ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-square'
                }`}
              >
                <SafeImage
                  sourceComponent="ProjectCaseStudyPage.GalleryMosaic"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={image.alt}
                  src={image.src}
                  width={960}
                  height={640}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-space-md flex flex-col justify-end text-on-primary">
                  <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-wider">Supplied Project Photography</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Note: Stitch's "Client Testimonial Block" (a named client, star rating and a 10/10
          scorecard) is intentionally omitted here — no real testimonial data exists anywhere in
          this project (see REAL_CONTENT_REQUIRED.md), so it is not fabricated. */}

      {/* RELATED PROJECTS — only other records currently returned as published */}
      {otherProjects.length > 0 && (
        <section className="w-full bg-surface-ground py-space-3xl">
          <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-space-2xl gap-space-md">
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Selected Portfolio</span>
                <h2 className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary tracking-tight">Explore Other Projects</h2>
              </div>
              <Link
                className="font-headline-sm text-headline-sm text-secondary hover:text-primary inline-flex items-center gap-1"
                to="/projects"
              >
                <span>View All Projects</span>
                <MSIcon name="arrow_forward" size={18} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg max-w-4xl mx-auto">
              {otherProjects.map((item) => (
                <div key={item.slug} className="bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="aspect-[4/3] bg-surface-dark overflow-hidden">
                    <SafeImage
                      sourceComponent="ProjectCaseStudyPage.RelatedProject"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      alt={`${item.title} — supplied project photography`}
                      src={item.image}
                      width={960}
                      height={720}
                      loading="eager"
                    />
                  </div>
                  <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                    <div>
                      <div className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant mb-1">
                        <span>{item.category}</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-primary">{item.title}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{item.description}</p>
                    </div>
                    <Link
                      className="font-label-ui text-label-ui text-secondary font-semibold inline-flex items-center gap-1 hover:text-primary"
                      to={`/projects/${item.slug}`}
                    >
                      <span>View Project</span>
                      <MSIcon name="arrow_forward" size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CLOSING DARK NAVY EXECUTIVE CTA SECTION — accreditation/insurance badges reworded to
          non-claiming copy; no named staff, no numeric guarantee figures (see
          REAL_CONTENT_REQUIRED.md for the equivalent decision made on About/Bathroom) */}
      <section className="w-full bg-surface-slate text-on-primary py-space-4xl relative overflow-hidden">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
            <div className="lg:col-span-7 space-y-space-md">
              <h2 className="font-display-hero text-display-hero-mobile lg:text-display-hero text-on-primary tracking-tight">
                Considering Something Similar?
              </h2>
              <p className="font-body-lead text-body-lead text-outline-variant max-w-xl leading-relaxed">
                Discuss your project with our team. Receive honest feasibility advice and a transparent,
                written quotation.
              </p>
              <div className="pt-space-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
                <Link
                  className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-md bg-secondary text-on-secondary rounded font-headline-sm text-headline-sm hover:bg-on-secondary-container transition-all shadow-lg"
                  to="/quote"
                >
                  <span>Discuss Your Project</span>
                  <MSIcon name="arrow_forward" size={18} />
                </Link>
                <a
                  className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-md bg-surface-dark text-on-primary rounded font-headline-sm text-headline-sm hover:bg-primary-container transition-all shadow-sm"
                  href={site.phoneHref}
                >
                  <MSIcon name="call" size={20} className="text-amber-highlight" />
                  <span>Call {site.phone}</span>
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 bg-surface-dark p-space-xl rounded-xl shadow-xl space-y-space-md">
              <h3 className="font-headline-md text-headline-md text-on-primary">Why Homeowners Choose Omni</h3>
              <ul className="space-y-space-sm font-body-sm text-body-sm text-surface-container-high">
                <li className="flex items-start gap-space-xs">
                  <MSIcon name="check_circle" size={20} className="text-amber-highlight shrink-0 mt-0.5" />
                   <span><strong>Written Project Information:</strong> A clear scope discussed before work begins.</span>
                </li>
                <li className="flex items-start gap-space-xs">
                  <MSIcon name="check_circle" size={20} className="text-amber-highlight shrink-0 mt-0.5" />
                  <span><strong>Planning &amp; Building Control Support:</strong> We help coordinate the local authority steps that apply to your project.</span>
                </li>
                <li className="flex items-start gap-space-xs">
                  <MSIcon name="check_circle" size={20} className="text-amber-highlight shrink-0 mt-0.5" />
                  <span><strong>A Single Point Of Contact:</strong> Clear, direct communication from first visit through to handover.</span>
                </li>
              </ul>
              <a
                className="w-full flex items-center justify-center gap-space-xs py-space-xs px-space-md rounded bg-success-green text-surface-pure font-headline-sm text-headline-sm hover:opacity-90 transition-opacity"
                href={site.whatsappHref}
                rel="noopener"
                target="_blank"
              >
                <MSIcon name="chat" size={18} />
                <span>WhatsApp The Team</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
