import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MSIcon } from '../components/icons';
import { projects as suppliedProjects } from '../data/content';
import SafeImage from '../components/SafeImage';

/**
 * Home Extensions ("/services/home-extensions") — near-verbatim structural
 * translation of the Stitch export
 *   Omni Development/.../omni_developments_manchester_home_extensions/code.html
 *
 * 10 sections in exact Stitch order: breadcrumb, split hero, trust bar,
 * 6 extension-type cards, 8-step process, supplied photography + project context,
 * 3 recent commissions, verified review, 5-item FAQ accordion, dark CTA.
 * Stitch copy is frozen verbatim; unverified claims are flagged in
 * REAL_CONTENT_REQUIRED.md, not silently rewritten.
 */

type TrustItem = { icon: string; value: string; label: string; amber?: boolean };

const TRUST: TrustItem[] = [
  { icon: 'description', value: 'Written', label: 'Project scope' },
  { icon: 'engineering', value: 'On-site', label: 'Project coordination' },
  { icon: 'forum', value: 'Direct', label: 'Communication' },
  { icon: 'photo_library', value: 'Supplied', label: 'Project photography', amber: true },
];

const EXTENSION_TYPES = [
  { tag: 'Rear extension', title: 'Rear Extensions', image: '/images/site-interior.webp', alt: 'Finished rear extension from supplied project photography.', body: 'Extend the rear of the home to create useful space, with the design shaped around the property and the brief.', points: ['Structural alterations', 'Glazing and threshold options', 'Planning and building information discussed in context'], link: 'Discuss a Rear Extension' },
  { tag: 'Side return', title: 'Side Return Extensions', image: '/images/site-interior.jpeg', alt: 'Supplied project photography for a side return extension.', body: 'Make better use of a side passage or narrow footprint with a plan developed around the existing home.', points: ['Spatial planning options', 'Rooflight and glazing choices', 'Neighbour and permission considerations discussed in context'], link: 'Discuss a Side Return' },
  { tag: 'Wraparound', title: 'Wraparound Extensions', image: '/images/completed-facade.jpeg', alt: 'Supplied project photography for a wraparound extension.', body: 'Combine rear and side opportunities where the property and brief make a wraparound approach useful.', points: ['Combined rear and side planning', 'Structural and glazing coordination', 'Planning route discussed for the property'], link: 'Discuss a Wraparound' },
  { tag: 'Double-storey', title: 'Double-Storey Extensions', image: '/images/home-front.jpeg', alt: 'Supplied project photography for a double-storey extension.', body: 'Explore additional space across two levels, subject to the property, design and relevant permissions.', points: ['Upper and lower-level planning', 'Structural load-path considerations', 'Materials selected for the existing home'], link: 'Discuss a Double-Storey Extension' },
  { tag: 'Kitchen-led', title: 'Kitchen Extensions', image: '/images/insulation-room.jpeg', alt: 'Supplied project photography for kitchen extension work.', body: 'Plan an extension around the kitchen, dining and living spaces you want the home to support.', points: ['Room layout and service coordination', 'Joinery and appliance choices', 'Lighting and finishing decisions'], link: 'Discuss a Kitchen Extension' },
  { tag: 'Open plan', title: 'Open-Plan Extensions', image: '/images/interior-stair.jpeg', alt: 'Supplied project photography for open-plan extension work.', body: 'Reconsider divided rooms and connections so the layout works better for daily life.', points: ['Structural opening options', 'Kitchen, dining and living zones', 'Acoustic and service considerations'], link: 'Discuss an Open-Plan Extension' },
] as const;

const STEPS = [
  { num: '01', icon: 'chat_bubble_outline', title: 'Initial Conversation', body: 'Brief consultation to assess goals, planning baseline (permitted dev vs full application), and initial budget guidance.', stage: 'Stage • Inception' },
  { num: '02', icon: 'straighten', title: 'Site Assessment', body: 'Foreman & architectural survey of drainage invert levels, party wall conditions, sub-soils, and structural load pathways.', stage: 'Stage • Feasibility' },
  { num: '03', icon: 'architecture', title: 'Design & Feasibility', body: 'Develop the design information needed to discuss the scope, permissions and practical next steps.', stage: 'Stage • Planning' },
  { num: '04', icon: 'receipt_long', title: 'Detailed Itemised Quote', body: 'Review the scope, inclusions and quotation together before work starts.', stage: 'Stage • Commercial' },
  { num: '05', icon: 'construction', title: 'Groundwork & Structure', body: 'Plan the ground and structural work around the agreed brief and the existing property.', stage: 'Stage • Structural' },
  { num: '06', icon: 'roofing', title: 'External Envelope', body: 'Progress the external walls, roof, insulation and openings so the new space can be developed safely.', stage: 'Stage • Envelope' },
  { num: '07', icon: 'carpenter', title: 'Services & Finishes', body: 'Coordinate services, joinery, flooring and other finishes as the work progresses.', stage: 'Stage • Craft' },
  { num: '08', icon: 'verified', title: 'Final Inspection & Handover', body: 'A structured snagging review, final walkthrough, and handover of the agreed project documents.', stage: 'Stage • Handover' },
] as const;

const COMMISSIONS = suppliedProjects.map((project) => ({
  slug: project.slug,
  label: 'Supplied project photography',
  location: project.location,
  detail: 'Details to be confirmed',
  title: project.title,
  body: project.description,
  tags: project.tags.join(' • '),
  image: project.image,
  alt: `${project.title} — supplied project photography`,
}));

const FAQS = [
  { q: 'What planning information will we discuss?', a: 'The useful planning route depends on the property, the proposed work and the relevant local requirements. We can discuss the information needed for your next decision during an initial conversation; formal advice should be confirmed for the specific property before work starts.' },
  { q: 'How long will a home extension take?', a: 'The programme depends on the design, approvals, existing building and agreed scope. We can discuss the likely sequence once the property and work are understood, without publishing a generic duration as a promise.' },
  { q: 'Can drawings and structural engineering be part of the conversation?', a: 'Yes, the project discussion can cover the design information and structural input needed for the proposed work. The exact appointments and documents depend on the property and scope.' },
  { q: 'Can we remain living in the property during construction?', a: 'That depends on the layout, access, services and extent of the work. We can talk through practical occupation and site-separation considerations as part of the project planning.' },
  { q: 'How is the project quotation prepared?', a: 'The quotation follows the scope and information available for the property. We review the inclusions and assumptions with you so the next decision is clear.' },
] as const;

export default function HomeExtensionsPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="flex flex-col w-full">
      {/* 1. BREADCRUMB — bg-surface-ground */}
      <section className="w-full bg-surface-ground py-space-sm">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-space-2xs text-body-sm font-body-sm text-on-surface-variant">
            <Link to="/" className="hover:text-on-surface transition-colors flex items-center gap-space-2xs">
              <MSIcon name="roofing" size={16} />
              <span>Home</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <Link to="/services" className="hover:text-on-surface transition-colors">Services</Link>
            <span className="text-outline-variant">/</span>
            <span className="text-secondary font-semibold">Home Extensions</span>
          </nav>
        </div>
      </section>

      {/* 2. EDITORIAL HERO — bg-surface-pure */}
      <section className="w-full bg-surface-pure pt-space-xl pb-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl lg:gap-space-2xl items-center">
            <div className="lg:col-span-7 flex flex-col space-y-space-md">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-slate text-on-primary w-fit shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-highlight" />
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">SPECIALISED RESIDENTIAL ARCHITECTURAL EXTENSIONS</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl lg:font-display-hero lg:text-display-hero text-on-surface leading-tight tracking-tight">
                Home Extensions in Manchester &amp; Cheshire
              </h1>
              <p className="font-body-lead text-body-lead text-on-surface-variant max-w-2xl leading-relaxed">
                Transform the way you live with bespoke single-storey, double-storey, and wraparound extensions. Create expansive open-plan living spaces, sunlit kitchen diners, and seamless indoor-outdoor connections without the disruption and cost of moving house.
              </p>
              <div className="pt-space-sm flex flex-wrap items-center gap-space-sm">
                <Link to="/quote" className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-secondary text-on-secondary font-headline-sm text-headline-sm rounded hover:bg-on-secondary-container transition-all shadow-md group">
                  <span>Discuss Your Extension</span>
                  <MSIcon name="arrow_forward" size={18} className="text-amber-subtle group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a href="#projects-showcase" className="inline-flex items-center justify-center gap-space-xs px-space-lg py-space-sm bg-surface-subtle text-on-surface font-headline-sm text-headline-sm rounded hover:bg-surface-container-high transition-all">
                  <span>View Extension Projects</span>
                  <MSIcon name="visibility" size={18} />
                </a>
              </div>
              <div className="pt-space-md grid grid-cols-3 gap-space-md">
                <div className="flex items-center gap-space-2xs text-body-sm font-body-sm text-on-surface-variant">
                  <MSIcon name="architecture" size={20} className="text-secondary" />
                  <span>Design detail discussed</span>
                </div>
                <div className="flex items-center gap-space-2xs text-body-sm font-body-sm text-on-surface-variant">
                  <MSIcon name="shield_with_house" size={20} className="text-secondary" />
                  <span>Planning discussed in context</span>
                </div>
                <div className="flex items-center gap-space-2xs text-body-sm font-body-sm text-on-surface-variant">
                  <MSIcon name="verified_user" size={20} className="text-secondary" />
                  <span>Project scope clarified</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative w-full aspect-[4/3] lg:aspect-[5/4] rounded-xl overflow-hidden shadow-xl bg-surface-slate">
                <SafeImage sourceComponent="HomeExtensionsPage.Hero" src="/images/site-interior.webp" alt="Finished rear extension from supplied project photography" width={960} height={720} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/60 via-transparent to-transparent" />
                <div className="absolute bottom-space-md left-space-md right-space-md p-space-sm bg-surface-pure/95 backdrop-blur-md rounded shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                  <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">Supplied photograph</span>
                      <p className="font-headline-sm text-headline-sm text-on-surface leading-snug">Supplied project photography</p>
                    </div>
                    <div className="text-right">
                      <span className="font-label-caps text-label-caps uppercase text-outline">Project detail</span>
                      <p className="font-body-sm text-body-sm text-on-surface font-semibold">To be confirmed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CREDIBILITY TRUST BAR — bg-surface-slate (dark) */}
      <section className="w-full bg-surface-slate text-on-primary py-space-md shadow-inner">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md divide-y md:divide-y-0 md:divide-x divide-border-slate/40">
            {TRUST.map((t) => (
              <div key={t.value} className="flex items-center gap-space-sm py-space-xs md:py-0 md:px-space-md first:pl-0">
                <div className="w-11 h-11 rounded-lg bg-surface-dark flex items-center justify-center text-amber-highlight flex-shrink-0">
                  <MSIcon name={t.icon} size={24} />
                </div>
                <div>
                  <span className={`block font-headline-md text-headline-md ${t.amber ? 'text-amber-highlight' : 'text-on-primary'}`}>{t.value}</span>
                  <span className="font-body-sm text-body-sm text-outline-variant">{t.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRANSFORM THE SPACE YOU ALREADY OWN — bg-surface — 6 extension-type cards */}
      <section className="w-full bg-surface py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-space-2xl gap-space-md">
            <div className="max-w-2xl space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">SPATIAL ENGINEERING</span>
              <h2 className="font-headline-xl text-headline-xl text-on-surface">Transform the Space You Already Own</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Every square metre in Greater Manchester homes carries immense value. We re-engineer structural footings, remove load-bearing masonry, and insert steel frameworks to unlock light, spatial flow, and enduring property equity.
              </p>
            </div>
            <div className="flex items-center gap-space-xs">
              <Link to="/quote" className="font-label-ui text-label-ui text-secondary hover:text-on-secondary-container font-semibold inline-flex items-center gap-space-2xs">
                <span>Get extension spec advice</span>
                <MSIcon name="north_east" size={16} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {EXTENSION_TYPES.map((c) => (
              <div key={c.title} className="bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-ground">
                  <SafeImage sourceComponent="HomeExtensionsPage.ExtensionCard" src={c.image} alt={c.alt} width={960} height={600} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-space-xs left-space-xs px-space-xs py-space-2xs bg-surface-dark/90 backdrop-blur-xs text-amber-highlight rounded font-label-caps text-label-caps uppercase">{c.tag}</div>
                </div>
                <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-md">
                  <div className="space-y-space-xs">
                    <h3 className="font-headline-md text-headline-md text-on-surface">{c.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{c.body}</p>
                    <ul className="pt-space-xs space-y-space-2xs font-body-sm text-body-sm text-on-surface">
                      {c.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-space-2xs">
                          <MSIcon name="check_circle" size={16} className="text-secondary mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-space-xs">
                    <Link to="/quote" className="font-label-ui text-label-ui text-on-surface hover:text-secondary inline-flex items-center gap-space-2xs font-semibold">
                      <span>{c.link}</span>
                      <MSIcon name="arrow_forward" size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. OUR 8-STEP EXTENSION PROCESS — bg-surface-ground */}
      <section className="w-full bg-surface-ground py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">TURNKEY DELIVERY</span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">Our 8-Step Extension Process</h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Residential construction is complex, but your experience shouldn&apos;t be. This eight-stage route keeps the brief, decisions and next steps visible from the initial conversation to handover.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {STEPS.map((s) => (
              <div key={s.num} className="bg-surface-pure p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-stat-metric text-headline-lg text-secondary font-bold">{s.num}</span>
                    <MSIcon name={s.icon} size={24} className="text-surface-slate" />
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-2xs">{s.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{s.body}</p>
                </div>
              <div className="pt-space-md text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">{s.stage}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PROJECT PHOTOGRAPHY — no unverified comparison is asserted */}
      <section className="w-full bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">SUPPLIED PROJECT PHOTOGRAPHY</span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">See the work in context</h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Browse supplied photographs for visual context. Project descriptions, locations and any comparison relationships are published only after owner approval.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-stretch">
            <div className="lg:col-span-8">
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-xl bg-surface-dark">
                <SafeImage sourceComponent="HomeExtensionsPage.ProjectSpotlight" src="/images/site-interior.webp" alt="Supplied project photography for a finished rear extension" width={960} height={600} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-space-sm left-space-sm px-space-xs py-space-2xs bg-surface-dark/85 text-amber-highlight rounded font-label-caps text-label-caps uppercase">Supplied photograph</div>
              </div>
            </div>
            <div className="lg:col-span-4 bg-surface-slate text-on-primary p-space-xl rounded-xl shadow-lg flex flex-col justify-between space-y-space-lg">
              <div className="space-y-space-md">
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-amber-highlight">PROJECT LIBRARY</span>
                  <h3 className="font-headline-lg text-headline-lg text-on-primary mt-space-2xs">Explore the work in context</h3>
                  <p className="font-body-sm text-body-sm text-outline-variant mt-space-xs leading-relaxed">The gallery contains supplied photographs. The staff workflow is the source of truth for approved project details.</p>
                </div>
                <ul className="space-y-space-sm pt-space-xs border-t border-border-slate/40 font-body-sm text-body-sm text-outline-variant">
                  <li className="flex items-start gap-space-xs"><MSIcon name="photo_library" size={18} className="text-amber-highlight mt-0.5" /> Extension and renovation photography</li>
                  <li className="flex items-start gap-space-xs"><MSIcon name="fact_check" size={18} className="text-amber-highlight mt-0.5" /> Descriptions added through the staff workflow</li>
                  <li className="flex items-start gap-space-xs"><MSIcon name="forum" size={18} className="text-amber-highlight mt-0.5" /> Start a conversation about your own property</li>
                </ul>
              </div>
              <Link to="/projects" className="w-full py-space-sm px-space-md bg-secondary text-on-secondary rounded text-center font-headline-sm text-headline-sm hover:bg-on-secondary-container transition-colors shadow">View the project gallery</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. RECENT EXTENSION COMMISSIONS — bg-surface — 3 project cards */}
      <section className="w-full bg-surface py-space-3xl" id="projects-showcase">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
            <div className="max-w-2xl space-y-space-xs">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">PORTFOLIO EXCELLENCE</span>
              <h2 className="font-headline-xl text-headline-xl text-on-surface">Supplied Extension Photography</h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Delivering structural refinement and elevated interiors across Trafford, Cheshire, and South Manchester.
              </p>
            </div>
            <div>
              <Link to="/projects" className="inline-flex items-center gap-space-2xs px-space-md py-space-xs bg-surface-pure rounded shadow-sm hover:bg-surface-ground text-on-surface font-label-ui text-label-ui font-semibold transition-all">
                 <span>View Project Gallery</span>
                <MSIcon name="arrow_forward" size={18} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
            {COMMISSIONS.map((p) => (
              <div key={p.title} className="bg-surface-pure rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="relative aspect-[4/3] bg-surface-ground overflow-hidden">
                  <SafeImage sourceComponent="HomeExtensionsPage.CommissionCard" src={p.image} alt={p.alt} width={960} height={640} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-space-xs right-space-xs px-space-xs py-space-2xs bg-surface-dark/90 text-on-primary rounded font-label-caps text-label-caps">{p.label}</div>
                </div>
                <div className="p-space-lg flex-1 flex flex-col justify-between space-y-space-sm">
                  <div>
                    <div className="flex items-center justify-between text-body-sm font-body-sm text-secondary font-medium mb-space-2xs">
                      <span>{p.location}</span>
                      <span className="font-semibold text-on-surface">{p.detail}</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">{p.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs leading-relaxed">{p.body}</p>
                  </div>
                  <div className="pt-space-xs flex items-center justify-between">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{p.tags}</span>
                    <Link to={`/projects/${p.slug}`} className="text-secondary group-hover:translate-x-1 transition-transform" aria-label={`View ${p.title}`}><MSIcon name="east" size={20} /></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="w-full bg-surface-pure py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-2xl mx-auto text-center space-y-space-sm">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">CLIENT FEEDBACK</span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">Verified feedback will appear here</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">No client review text or rating is published until the owner has approved the attribution and wording.</p>
            <Link to="/reviews" className="inline-flex items-center gap-space-xs px-space-lg py-space-sm bg-surface-slate text-on-primary rounded font-headline-sm text-headline-sm">Review the feedback page <MSIcon name="arrow_forward" size={16} /></Link>
          </div>
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS — bg-surface-ground */}
      <section className="w-full bg-surface-ground py-space-3xl">
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <div className="max-w-3xl mb-space-2xl space-y-space-xs">
            <span className="font-label-caps text-label-caps uppercase tracking-widest text-secondary font-bold">CLIENT ASSURANCE</span>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">Frequently Asked Questions</h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Clear, straightforward answers regarding planning rules, structural calculations, build durations, and site management in Manchester and Cheshire.
            </p>
          </div>
          <div className="max-w-3xl space-y-space-sm" id="faq-accordion">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="bg-surface-pure rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                  <button aria-expanded={open} type="button" onClick={() => setOpenFaq(open ? -1 : i)} className="w-full p-space-lg text-left flex items-center justify-between focus:outline-none">
                    <span className="font-headline-sm text-headline-sm text-on-surface">{f.q}</span>
                    <MSIcon name="expand_more" size={24} className={`text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <div className="px-space-lg pb-space-lg text-body-md font-body-md text-on-surface-variant leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FINAL DARK CTA — bg-surface-dark (dark) */}
      <section className="w-full bg-surface-dark text-on-primary py-space-3xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
        <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-8 space-y-space-sm">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded bg-surface-slate text-amber-highlight">
                <MSIcon name="calendar_today" size={16} />
                <span className="font-label-caps text-label-caps uppercase tracking-wider">START WITH A CONVERSATION</span>
              </div>
              <h2 className="font-headline-xl text-headline-xl lg:font-display-hero lg:text-display-hero text-on-primary leading-tight">Planning an Extension in Greater Manchester?</h2>
              <p className="font-body-lead text-body-lead text-outline-variant max-w-2xl leading-relaxed">
                Speak directly with our senior development team. We will evaluate your property&apos;s architectural potential, review planning parameters, and arrange an obligation-free feasibility site survey.
              </p>
              <div className="flex items-center gap-space-md text-body-sm font-body-sm text-outline-variant pt-space-xs">
                <span className="flex items-center gap-space-2xs"><MSIcon name="check" size={18} className="text-amber-highlight" /> No sales pressure</span>
                <span className="flex items-center gap-space-2xs"><MSIcon name="check" size={18} className="text-amber-highlight" /> Written project scope</span>
                <span className="flex items-center gap-space-2xs"><MSIcon name="check" size={18} className="text-amber-highlight" /> Planning discussed in context</span>
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-space-sm">
              <Link to="/quote" className="w-full flex items-center justify-center gap-space-xs px-space-lg py-space-md bg-secondary text-on-secondary rounded font-headline-sm text-headline-sm hover:bg-on-secondary-container transition-all shadow-lg text-center">
                <span>Tell Us About Your Project</span>
                <MSIcon name="arrow_forward" size={18} className="text-amber-highlight" />
              </Link>
              <a className="w-full flex items-center justify-center gap-space-xs px-space-lg py-space-md bg-surface-slate text-on-primary rounded font-headline-sm text-headline-sm hover:bg-border-slate transition-all text-center" href="tel:+447928149731">
                <MSIcon name="call" size={20} className="text-secondary" />
                <span>Direct Call: 07928 149 731</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}






