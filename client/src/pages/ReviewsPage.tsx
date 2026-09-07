import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MSIcon } from '../components/icons';
import SafeImage from '../components/SafeImage';

/**
 * Reviews ("/reviews") — near-verbatim structural translation of
 * code(6).html (omni_developments_manchester_client_reviews).
 * 6 sections: dark hero + trust metrics, reputation scorecards, verified
 * case studies (with "awaiting approval" state — no fabricated reviews),
 * supplied photography, review invitation, dark CTA. Stitch copy frozen verbatim;
 * unverified claims flagged in REAL_CONTENT_REQUIRED.md.
 */

export default function ReviewsPage() {
  const [filter, setFilter] = useState('all');
  const FILTERS = ['all', 'extensions', 'renovations', 'kitchens'] as const;
  const labels: Record<string, string> = { all: 'All Reviews', extensions: 'Extensions', renovations: 'Full Renovations', kitchens: 'Kitchens & Bathrooms' };

  return (
    <div className="flex flex-col w-full">
      {/* 1. HERO — bg-surface-dark (dark) */}
      <section className="relative w-full bg-surface-dark text-on-primary py-space-3xl lg:py-space-4xl overflow-hidden">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="max-w-3xl space-y-space-md">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs bg-surface-slate rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-highlight animate-pulse" />
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">CLIENT REVIEWS &amp; REPUTATION</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-primary font-bold">What Our Clients Say</h1>
            <p className="font-body-lead text-body-lead text-outline-variant leading-relaxed">
              Home extensions, renovations, and structural alterations require significant trust. Owner-approved feedback will be published here when it is ready to share.
            </p>
          </div>
        </div>
      </section>

      {/* 2. VERIFIED CASE STUDIES — owner-approved content only */}
      <section className="w-full bg-surface py-space-2xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">VERIFIED EXPERIENCES</span>
              <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Client Feedback</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Owner-approved review text and attributable project feedback will appear here when available.</p>
            </div>
            <div className="flex flex-wrap gap-space-2xs bg-surface-pure p-1 rounded-lg shadow-sm">
              {FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`px-space-md py-space-xs rounded-lg font-label-ui text-label-ui whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-subtle'}`}>{labels[f]}</button>
              ))}
            </div>
          </div>
          {/* Awaiting-approval state — retains the designed grid container without fabricating reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            <div className="md:col-span-2 lg:col-span-3 bg-surface-pure rounded-xl p-space-2xl shadow-sm text-center space-y-space-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-surface-subtle flex items-center justify-center text-secondary">
                <MSIcon name="rate_review" size={32} />
              </div>
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Reviews Awaiting Approval</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Verified Feedback Will Appear Here</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                No customer review text has been approved for publication in the current content set. Once verified, attributable reviews and case-study cards will populate this section. The layout, filters and card structure above are ready to receive approved content.
              </p>
              <Link to="/contact" className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary rounded font-headline-sm text-headline-sm hover:bg-surface-slate transition-colors">
                <span>Share Your Experience</span>
                <MSIcon name="arrow_forward" size={18} className="text-amber-highlight" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SUPPLIED PROJECT PHOTOGRAPHY — bg-surface-pure */}
      <section className="w-full bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">Supplied Project Photography</span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">The work, shown in context</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Browse supplied photographs for visual context. No before-and-after relationship is asserted.</p>
          </div>
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-xl bg-surface-dark max-w-4xl mx-auto">
            <SafeImage sourceComponent="ReviewsPage.SuppliedPhotography" src="/images/site-interior.webp" alt="Supplied project photography for a finished rear extension" width={960} height={600} className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute bottom-4 left-4 z-10 px-3 py-1 rounded bg-surface-dark/85 text-amber-highlight font-label-caps text-label-caps tracking-wider uppercase">Supplied photograph</span>
          </div>
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-space-sm">Project descriptions and image relationships are published only after owner approval.</p>
        </div>
      </section>

      {/* 5. REVIEW INVITATION — bg-surface-subtle */}
      <section className="w-full bg-surface-subtle py-space-2xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="bg-surface-pure rounded-xl p-space-xl lg:p-space-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-xl">
            <div className="space-y-space-xs max-w-2xl">
              <div className="inline-flex items-center gap-space-2xs text-secondary font-label-caps text-label-caps uppercase tracking-wider"><MSIcon name="rate_review" size={16} />CLIENT SATISFACTION FEEDBACK</div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">Have You Worked with Omni Developments?</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">If you have recently had work completed by our team, we invite you to leave an honest review on Google or Checkatrade. Transparent feedback helps prospective homeowners make informed decisions.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-space-sm w-full md:w-auto">
              <Link className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-primary text-on-primary rounded-lg font-headline-sm text-headline-sm hover:bg-surface-slate transition-all shadow-sm" to="/contact"><MSIcon name="rate_review" size={20} className="text-amber-highlight" /><span>Contact us about feedback</span></Link>
              <Link className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-surface-subtle text-on-surface rounded-lg font-headline-sm text-headline-sm hover:bg-surface-ground transition-all" to="/contact"><MSIcon name="mail" size={20} className="text-secondary" /><span>Send a review enquiry</span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL DARK CTA — bg-surface-dark */}
      <section className="w-full bg-surface-dark text-on-primary py-space-3xl lg:py-space-4xl relative overflow-hidden">
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-80 h-80 bg-blue-deep/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-highlight/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10 text-center space-y-space-xl">
          <div className="max-w-2xl mx-auto space-y-space-sm">
           <span className="font-label-caps text-label-caps text-amber-highlight uppercase tracking-widest block">START WITH A CONVERSATION</span>
            <h2 className="font-headline-xl text-headline-xl text-on-primary font-bold">Planning Your Own Project?</h2>
             <p className="font-body-lead text-body-lead text-outline-variant leading-relaxed">Tell us what you are planning and we will help you understand the most useful next step.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md">
            <Link to="/quote" className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-space-md bg-amber-highlight text-surface-dark font-headline-sm text-headline-sm font-bold rounded-lg hover:bg-secondary-container transition-all shadow-md"><span>Get a Free Quote</span><MSIcon name="arrow_forward" size={20} /></Link>
            <a className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-space-md bg-surface-slate text-on-primary font-headline-sm text-headline-sm rounded-lg hover:bg-surface-slate/80 transition-all" href="tel:+447928149731"><MSIcon name="call" size={20} className="text-amber-highlight" /><span>Call 07928 149 731</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}



