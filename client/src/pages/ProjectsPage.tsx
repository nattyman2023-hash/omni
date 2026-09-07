import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MSIcon } from '../components/icons';
import { projects } from '../data/content';
import { usePublishedProjects } from '../data/projectFeed';
import SafeImage from '../components/SafeImage';

/**
 * Projects listing ("/projects") — reconstructed using the project-card and
 * gallery design language from code(10).html, code(3).html, code(4).html and
 * the supplied project photographs. No Stitch "projects listing" HTML exists,
 * so this page composes the shared design system (hero, filterable gallery,
 * supplied photography panel, mid-page CTA, dark final CTA) using patterns from the
 * homepage and About pages. Project names/locations use the real `projects`
 * data — no invented names, prices, addresses or locations.
 */

type Project = (typeof projects)[number];

const CATEGORIES = ['All', 'Extensions', 'Renovations', 'Kitchens', 'Bathrooms', 'Loft Conversions'] as const;

function matchesCategory(p: Project, filter: string) {
  if (filter === 'All') return true;
  const map: Record<string, string[]> = {
    Extensions: ['Extensions', 'Structural work', 'Openings'],
    Renovations: ['Renovations', 'External works', 'Landscaping'],
    Kitchens: ['Kitchens', 'Finishes'],
    Bathrooms: ['Bathrooms', 'Installation', 'Finishes'],
    'Loft Conversions': ['Loft conversions'],
  };
  const targets = map[filter] || [filter];
  return p.tags.some((t) => targets.some((tg) => t.includes(tg) || tg.includes(t)));
}

export default function ProjectsPage() {
  const [filter, setFilter] = useState<string>('All');
  const projectRecords = usePublishedProjects();
  const visible = projectRecords.filter((p) => matchesCategory(p, filter));

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO — bg-surface-slate (dark) */}
      <section className="relative w-full bg-surface-slate text-on-primary overflow-hidden pb-space-3xl pt-space-2xl md:pt-space-3xl">
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <span className="inline-flex items-center gap-space-2xs px-space-sm py-1 rounded bg-surface-dark font-label-caps text-label-caps tracking-widest text-amber-highlight uppercase mb-space-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-highlight animate-pulse" />
            Proven Craftsmanship Across Manchester &amp; Cheshire
          </span>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-7 flex flex-col space-y-space-lg">
              <h1 className="font-display-hero text-display-hero-mobile md:text-display-hero text-on-primary font-extrabold tracking-tight leading-none">
                Selected Work, <span className="text-amber-highlight underline decoration-secondary decoration-2 underline-offset-8">Carefully Documented</span>
              </h1>
              <p className="font-body-lead text-body-lead text-surface-ground max-w-2xl font-normal leading-relaxed">
                Explore supplied project photography by type. Real homes, considered finishes and the structural detail that decides how a finished build feels day to day. Verified case-study detail will be added as it is approved for publication.
              </p>
              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm rounded bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold shadow-lg hover:bg-secondary-container transition-all">
                  <span>Discuss Your Project</span>
                  <MSIcon name="arrow_forward" size={18} />
                </Link>
                <a href="#project-gallery" className="inline-flex items-center justify-center gap-space-2xs px-space-lg py-space-sm rounded bg-surface-dark text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-surface-slate transition-colors">
                  <MSIcon name="photo_library" size={18} className="text-amber-highlight" />
                  <span>Browse Gallery</span>
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-xl overflow-hidden shadow-2xl bg-surface-dark aspect-[4/3]">
                <SafeImage sourceComponent="ProjectsPage.Hero" src="/images/site-interior.webp" alt="Finished rear extension from supplied project photography" width={960} height={720} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/90 via-surface-dark/20 to-transparent" />
                <div className="absolute bottom-space-md left-space-md right-space-md p-space-sm rounded-lg bg-surface-slate/95 backdrop-blur-md text-on-primary">
                  <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-wider">Featured Photography</span>
                  <p className="font-headline-sm text-headline-sm font-semibold truncate">Supplied project gallery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROJECT GALLERY — bg-surface-ground */}
      <section className="w-full py-space-3xl bg-surface-ground" id="project-gallery">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Project Gallery</span>
              <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Real Work, Useful Context</h2>
              <p className="font-body-lead text-body-lead text-on-surface-variant max-w-2xl">Filter by project type to explore the supplied photography.</p>
            </div>
            <div className="flex flex-wrap gap-space-2xs bg-surface-pure p-1 rounded-lg shadow-sm">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setFilter(c)} className={`px-space-sm py-1 rounded font-label-ui text-label-ui font-semibold whitespace-nowrap transition-all ${filter === c ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {visible.map((p) => (
              <div key={p.slug} className="group flex flex-col bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
                <div className="relative h-64 w-full overflow-hidden bg-surface-container">
                  <SafeImage sourceComponent="ProjectsPage.ProjectCard" src={p.image} alt={`${p.title} — supplied project photography`} loading="eager" width={960} height={640} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded bg-surface-dark text-on-primary font-label-caps text-label-caps uppercase">{p.category}</span>
                </div>
                <div className="p-space-lg flex flex-col flex-1 justify-between space-y-space-sm">
                  <div>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface group-hover:text-secondary transition-colors">{p.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{p.description}</p>
                    <div className="flex flex-wrap gap-space-2xs pt-space-xs">{p.tags.map((t) => <span key={t} className="px-space-2xs py-0.5 bg-surface-subtle font-label-caps text-label-caps text-on-surface-variant rounded">{t}</span>)}</div>
                  </div>
                  <Link to={`/projects/${p.slug}`} className="inline-flex items-center gap-space-2xs font-label-ui text-label-ui font-semibold text-primary group-hover:text-secondary transition-colors pt-space-xs"><span>View Case Study</span><MSIcon name="arrow_forward" size={16} /></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SUPPLIED PROJECT PHOTOGRAPHY — bg-surface-pure */}
      <section className="w-full py-space-3xl bg-surface-pure">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Supplied Project Photography</span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">The work, shown in context</h2>
            <p className="font-body-lead text-body-lead text-on-surface-variant">Browse the supplied project library for visual context. No before-and-after relationship is asserted.</p>
          </div>
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-xl bg-surface-dark max-w-4xl mx-auto">
            <SafeImage sourceComponent="ProjectsPage.SuppliedPhotography" src="/images/site-interior.webp" alt="Supplied project photography for a finished rear extension" width={960} height={600} className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded bg-surface-dark/85 text-amber-highlight font-label-caps text-label-caps tracking-wider uppercase">Supplied photograph</span>
          </div>
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-space-sm">Project descriptions and image relationships are published only after owner approval.</p>
        </div>
      </section>

      {/* 4. MID-PAGE CTA — bg-surface-slate (dark) */}
      <section className="w-full py-space-3xl bg-surface-slate text-on-primary relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center max-w-3xl lg:mx-auto">
          <span className="inline-flex items-center gap-space-2xs px-space-sm py-1 rounded bg-surface-dark font-label-caps text-label-caps text-amber-highlight tracking-widest uppercase mb-space-sm">Have a Project of Your Own?</span>
          <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-primary mb-space-md">Bring Us the Idea, the Awkward Layout or the Unfinished Plan</h2>
          <p className="font-body-lead text-body-lead text-surface-ground leading-relaxed mb-space-xl">We&apos;ll help you understand the next practical step for your home — with honest, experienced advice and a clear, itemised quotation.</p>
          <div className="flex flex-wrap items-center justify-center gap-space-md">
            <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold shadow-xl hover:bg-secondary-container transition-all"><span>Request Your Free Quotation</span><MSIcon name="arrow_forward" size={18} /></Link>
            <a className="inline-flex items-center justify-center gap-space-2xs px-space-xl py-space-sm rounded bg-surface-dark text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-surface-pure hover:text-surface-dark transition-colors" href="tel:+447928149731"><MSIcon name="call" size={18} className="text-amber-highlight" /><span>Direct Call: 07928 149 731</span></a>
          </div>
        </div>
      </section>

      {/* 5. ADDITIONAL GRID — bg-surface-ground */}
      <section className="w-full py-space-3xl bg-surface-ground">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Full Gallery</span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">More From the Project Library</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md">
            {projects.flatMap((p) => [p.image, ...p.gallery]).slice(0, 8).map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden shadow-sm group bg-surface-container">
                <SafeImage sourceComponent="ProjectsPage.Gallery" src={img} alt={`Supplied project photography ${i + 1}`} loading="lazy" width={960} height={640} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL DARK CTA — bg-surface-dark */}
      <section className="w-full py-space-4xl bg-surface-dark text-on-primary relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center max-w-3xl lg:mx-auto">
          <h2 className="font-display-hero text-display-hero-mobile md:text-display-hero font-extrabold tracking-tight text-on-primary leading-tight mb-space-md">Let&apos;s Build Something Exceptional Together</h2>
          <p className="font-body-lead text-body-lead text-surface-ground leading-relaxed mb-space-xl">Speak directly with Omni Developments. We provide honest, experienced advice, feasibility reviews, and clear, itemised quotations with no sales pressure.</p>
          <div className="flex flex-wrap items-center justify-center gap-space-md">
            <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-xl py-space-sm rounded bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold shadow-xl hover:bg-secondary-container transition-all"><span>Request Your Free Quotation</span><MSIcon name="arrow_forward" size={18} /></Link>
            <a className="inline-flex items-center justify-center gap-space-2xs px-space-lg py-space-sm rounded bg-success-green/20 text-on-primary font-headline-sm text-headline-sm font-semibold hover:bg-success-green hover:text-surface-dark transition-colors" href="https://wa.me/447928149731" rel="noopener" target="_blank"><MSIcon name="chat" size={18} /><span>WhatsApp Message</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}

