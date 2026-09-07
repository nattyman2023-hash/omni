import { FormEvent, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Bath, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleUserRound, ClipboardList, Clock3, Compass, CookingPot, FileText, Hammer, Home,
  HousePlus, LandPlot, LayoutDashboard, Mail, MapPin, Menu, MessageCircle, Minus, Phone,
  Plus, Quote, Ruler, Search, ShieldCheck, Sparkles, Star, X, Upload, Wrench, Zap,
} from 'lucide-react';
import { areas, guides, journey, projects, quoteTypes, services, site, Project, Service } from './data/content';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileQuickActions from './components/MobileQuickActions';
import StagingMarker from './components/StagingMarker';
import SafeImage from './components/SafeImage';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import HomeExtensionsPage from './pages/HomeExtensionsPage';
import ProjectCaseStudyPage from './pages/ProjectCaseStudyPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import AreasPage from './pages/AreasPage';
import BathroomRenovationsPage from './pages/BathroomRenovationsPage';
import ProjectsPage from './pages/ProjectsPage';
import ReviewsPage from './pages/ReviewsPage';
import ProjectManagerPage from './pages/ProjectManagerPage';
import './tailwind.css';
import './styles.css';

type IconProps = { name: string; size?: number };

function Icon({ name, size = 18 }: IconProps) {
  const props = { size, strokeWidth: 1.8 };
  const icons: Record<string, typeof Home> = {
    expand: HousePlus, roofing: Home, 'home-edit': Building2, sparkles: Sparkles, cooking: CookingPot,
    bathroom: Bath, hammer: Hammer, call: Phone, mail: Mail, pin: MapPin, quote: Quote, calendar: CalendarDays,
    project: BriefcaseBusiness, safety: ShieldCheck, clock: Clock3, search: Search, menu: Menu, close: X,
    user: CircleUserRound, arrow: ArrowRight, upload: Upload, guide: FileText, wrench: Wrench, compass: Compass,
    map: LandPlot, tasks: ClipboardList, dashboard: LayoutDashboard, message: MessageCircle,
  };
  const Component = icons[name] ?? Building2;
  return <Component {...props} aria-hidden="true" />;
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link className={`brand ${dark ? 'brand-dark' : ''}`} to="/" aria-label="Omni Developments home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span className="brand-copy"><strong>Omni</strong><span>Developments Ltd</span><small>Design &amp; build specialists</small></span>
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = [
    ['Services', '/services'], ['Projects', '/projects'], ['How it works', '/how-it-works'], ['About us', '/about'],
    ['Reviews', '/reviews'], ['Areas covered', '/areas'], ['Guides', '/guides'], ['Contact', '/contact'],
  ];
  useEffect(() => setOpen(false), [location.pathname]);
  return (
    <header className="site-header">
      <div className="topbar"><div className="container topbar-inner"><span><MapPin size={13} /> {site.area}</span><span className="topbar-sep" /><span><Star size={13} fill="currentColor" /> Real project photography &amp; project-led advice</span><div className="topbar-right"><a href={site.phoneHref}><Phone size={13} /> {site.phone}</a><a href={`mailto:${site.email}`}><Mail size={13} /> {site.email}</a><Link to="/staff/login">Staff portal</Link></div></div></div>
      <div className="nav-shell"><div className="container nav-inner"><Logo /><nav className="desktop-nav" aria-label="Primary navigation">{nav.map(([label, href]) => <Link key={href} className={location.pathname === href || (href !== '/' && location.pathname.startsWith(`${href}/`)) ? 'active' : ''} to={href}>{label}</Link>)}</nav><div className="nav-actions"><a className="phone-chip" href={site.phoneHref}><Phone size={17} /><span>{site.phone}</span></a><Link className="button button-dark button-small" to="/quote">Get free quote <ArrowRight size={15} /></Link><button className="menu-button" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div></div></div>
      {open && <div className="mobile-menu"><nav aria-label="Mobile navigation">{nav.map(([label, href]) => <Link key={href} to={href}>{label}<ChevronRight size={16} /></Link>)}</nav><Link className="button button-amber" to="/quote">Start a project enquiry <ArrowRight size={16} /></Link></div>}
    </header>
  );
}

function SiteFooter() {
  const location = useLocation();
  const hideMobileBar = location.pathname === '/quote';
  return <>
    <section className="footer-cta" aria-label="Project enquiry call to action"><div className="container footer-cta-inner"><div><span className="eyebrow eyebrow-amber">Ready when you are</span><h2>Let&apos;s build something<br /><em>exceptional together.</em></h2><p>Bring us the idea, the awkward layout or the unfinished plan. We&apos;ll help you understand the next practical step.</p></div><div className="footer-cta-actions"><Link className="button button-amber" to="/quote">Request a free consultation <ArrowRight size={16} /></Link><a className="button button-outline-light" href={site.phoneHref}><Phone size={16} /> Call {site.phone}</a></div></div></section>
    <footer className="site-footer"><div className="container footer-grid"><div className="footer-about"><Logo dark /><p>Design-and-build specialists for residential extensions, renovations and structural work across {site.area}.</p><div className="footer-tags"><span>FMB member</span><span>Scope-led proposals</span></div></div><div><h3>Services</h3><ul>{services.slice(0, 5).map(service => <li key={service.slug}><Link to={`/services/${service.slug}`}>{service.shortName}</Link></li>)}</ul></div><div><h3>Coverage</h3><ul className="area-list">{areas.slice(0, 8).map(area => <li key={area}><Link to={`/areas/${area.toLowerCase().replaceAll(' ', '-')}`}>{area}</Link></li>)}</ul></div><div><h3>Project enquiries</h3><ul className="footer-contact"><li><Phone size={15} /><a href={site.phoneHref}>{site.phone}</a></li><li><Mail size={15} /><a href={`mailto:${site.email}`}>{site.email}</a></li><li><MapPin size={15} /><span>{site.area}</span></li></ul><Link className="button button-amber button-small" to="/contact">Talk to the team <ArrowRight size={14} /></Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Omni Developments Ltd. All rights reserved.</span><div><Link to="/privacy">Privacy</Link><Link to="/cookies">Cookies</Link><Link to="/terms">Terms</Link></div></div></footer>
    <nav className={`mobile-contact-bar ${hideMobileBar ? 'mobile-contact-bar-hidden' : ''}`} aria-label="Quick contact"><a href={site.phoneHref}><Phone size={17} /> Call</a><a href={site.whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a><Link to="/quote"><Zap size={17} /> Free quote</Link></nav>
  </>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></>;
}

/**
 * Layout for pages rebuilt to match the Stitch design exports (About, Areas,
 * Bathroom Renovations). Uses the new Header/Footer instead of the legacy
 * SiteHeader/SiteFooter — kept separate from `Layout` so pages not yet
 * rebuilt are unaffected.
 */
function RebuiltLayout({ children }: { children: React.ReactNode }) {
  return <><Header /><main id="main-content" className="rebuilt-main">{children}</main><Footer /><MobileQuickActions /></>;
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <span className={`eyebrow ${light ? 'eyebrow-light' : ''}`}>{children}</span>;
}

function SectionHeading({ eyebrow, title, children, light = false, align = 'left' }: { eyebrow?: string; title: React.ReactNode; children?: React.ReactNode; light?: boolean; align?: 'left' | 'center' }) {
  return <div className={`section-heading ${light ? 'light' : ''} align-${align}`}>{eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}<h2>{title}</h2>{children && <p>{children}</p>}</div>;
}

function ButtonLink({ to, children, variant = 'dark' }: { to: string; children: React.ReactNode; variant?: 'dark' | 'amber' | 'outline' | 'light' }) {
  return <Link className={`button button-${variant}`} to={to}>{children}<ArrowRight size={16} /></Link>;
}

function PageHero({ eyebrow, title, intro, image, children, compact = false }: { eyebrow: string; title: React.ReactNode; intro: string; image?: string; children?: React.ReactNode; compact?: boolean }) {
  return <section className={`page-hero ${compact ? 'page-hero-compact' : ''}`}><div className="container page-hero-grid"><div className="page-hero-copy"><Eyebrow light>{eyebrow}</Eyebrow><h1>{title}</h1><p>{intro}</p>{children}</div>{image && <div className="page-hero-image"><SafeImage sourceComponent="App.PageHero" src={image} alt={`${eyebrow} — supplied project photography`} width={960} height={720} /><span className="image-caption">Supplied project photography</span></div>}</div></section>;
}

function TrustBar() {
  return <div className="trust-bar"><div className="container trust-grid"><div><Check size={16} /><span><strong>Clear scope</strong><small>Decisions made visible early</small></span></div><div><Ruler size={16} /><span><strong>Practical detail</strong><small>Buildable ideas, carefully coordinated</small></span></div><div><MessageCircle size={16} /><span><strong>Direct communication</strong><small>A joined-up point of contact</small></span></div><div><ShieldCheck size={16} /><span><strong>Greater Manchester &amp; Cheshire</strong><small>Residential work, thoughtfully delivered</small></span></div></div></div>;
}

function ServiceCard({ service }: { service: Service }) {
  return <article className="service-card"><Link className="card-image" to={`/services/${service.slug}`}><SafeImage sourceComponent="App.ServiceCard" src={service.image} alt={`${service.name} — supplied project photography`} loading="lazy" width={960} height={620} /><span className="card-badge"><Icon name={service.icon} size={15} /> {service.shortName}</span></Link><div className="card-body"><div className="card-icon"><Icon name={service.icon} size={20} /></div><h3><Link to={`/services/${service.slug}`}>{service.name}</Link></h3><p>{service.description}</p><Link className="text-link" to={`/services/${service.slug}`}>Explore service <ArrowRight size={14} /></Link></div></article>;
}

function ProjectCard({ project }: { project: Project }) {
  return <article className="project-card"><Link to={`/projects/${project.slug}`} className="project-image"><SafeImage sourceComponent="App.ProjectCard" src={project.image} alt={`${project.title} — supplied project photography`} loading="lazy" width={960} height={670} /><span className="project-category">{project.category}</span></Link><div className="project-card-body"><div><span className="meta-label">{project.location}</span><h3><Link to={`/projects/${project.slug}`}>{project.title}</Link></h3></div><Link className="circle-link" to={`/projects/${project.slug}`} aria-label={`View ${project.title}`}><ArrowRight size={17} /></Link></div></article>;
}

function MetricStrip() {
  return <section className="metric-strip"><div className="container metric-grid"><div><span className="metric-symbol">01</span><strong>Listen first</strong><p>Your brief is the starting point for the right next step.</p></div><div><span className="metric-symbol">02</span><strong>Plan clearly</strong><p>Scope, dependencies and decisions stay easy to follow.</p></div><div><span className="metric-symbol">03</span><strong>Build carefully</strong><p>Quality is considered at every stage of the work.</p></div><div><span className="metric-symbol">04</span><strong>Handover properly</strong><p>The detail matters right through to completion.</p></div></div></section>;
}

function ProcessTimeline() {
  return <div className="timeline">{journey.map(([number, title, copy]) => <div className="timeline-item" key={number}><span className="timeline-number">{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div>;
}

function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return <div className="accordion">{items.map((item, index) => <div className={`accordion-item ${open === index ? 'open' : ''}`} key={item.question}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><span>{item.question}</span>{open === index ? <Minus size={17} /> : <Plus size={17} />}</button>{open === index && <div className="accordion-answer"><p>{item.answer}</p></div>}</div>)}</div>;
}

function FinalCTA({ title = 'Planning a project?', intro = 'Tell us where you are in the process and we’ll help you work out the most useful next step.' }: { title?: string; intro?: string }) {
  return <section className="final-cta"><div className="container final-cta-inner"><div><Eyebrow light>Start with a conversation</Eyebrow><h2>{title}</h2><p>{intro}</p></div><div className="final-cta-actions"><ButtonLink to="/quote" variant="amber">Request a free quote</ButtonLink><a className="button button-outline-light" href={site.phoneHref}><Phone size={16} /> Call {site.phone}</a></div></div></section>;
}

function ServiceDetailPage() {
  const { slug } = useParams();
  const service = services.find(item => item.slug === slug);
  if (!service) return <NotFound />;
  const faq = [
    { question: `What does a ${service.shortName.toLowerCase()} project involve?`, answer: service.detail },
    { question: 'Can you help when the scope is still taking shape?', answer: 'Yes. The first conversation is there to clarify what you know, what you need to decide and what information would make the next step useful.' },
    { question: 'How do you keep the work understandable?', answer: 'We keep the scope, decisions and project communication clear so the work can be discussed in practical terms.' },
  ];
  return <><PageHero eyebrow={`Service / ${service.shortName}`} title={<>{service.name}<br /><em>for your home.</em></>} intro={service.detail} image={service.image}><ButtonLink to="/quote" variant="amber">Discuss your project</ButtonLink></PageHero><TrustBar /><section className="section section-light"><div className="container split-section"><div><Eyebrow>What this can include</Eyebrow><h2>A considered route from idea to <em>finished detail.</em></h2><p>{service.description} The right scope depends on the property, the brief and the decisions still to be made — so we start there.</p><div className="check-list">{service.bullets.map(item => <span key={item}><Check size={17} /> {item}</span>)}</div></div><div className="feature-image"><SafeImage sourceComponent="App.ServiceDetail" src={service.image} alt="" loading="lazy" width={960} height={640} /><span className="image-caption">Supplied project photography</span></div></div></section><section className="section section-tint"><div className="container"><SectionHeading eyebrow="A clear project route" title={<>How this service <em>comes together.</em></>}><span>The detail changes from home to home. The need for a clear sequence does not.</span></SectionHeading><ProcessTimeline /></div></section><section className="section section-light"><div className="container faq-layout"><div><Eyebrow>Questions</Eyebrow><h2>Frequently asked <em>questions.</em></h2><p>We’ll keep adding approved guidance here as the content library grows.</p></div><Accordion items={faq} /></div></section><FinalCTA title={`Ready to explore ${service.shortName.toLowerCase()}?`} /></>;
}

function AreaDetailPage() {
  const { slug } = useParams();
  const area = areas.find(item => item.toLowerCase().replaceAll(' ', '-') === slug);
  if (!area) return <NotFound />;
  return <><PageHero eyebrow={`Coverage / ${area}`} title={<>Building work in <em>{area}.</em></>} intro={`Considering an extension, renovation or building project in ${area}? Start with a straightforward conversation about the property and the work you have in mind.`} image="/images/home-front.jpeg"><ButtonLink to="/quote" variant="amber">Start an enquiry</ButtonLink></PageHero><section className="section section-light"><div className="container split-section"><div><Eyebrow>For homeowners in {area}</Eyebrow><h2>A practical starting point for your <em>home project.</em></h2><p>We use the first conversation to understand the brief, the property and the decisions still to be made. From there, we can talk through the most useful next step.</p><div className="check-list"><span><Check size={17} /> Extensions and structural work</span><span><Check size={17} /> Renovations and refurbishments</span><span><Check size={17} /> Kitchens, bathrooms and finishing</span></div><ButtonLink to="/contact" variant="dark">Talk to Omni</ButtonLink></div><div className="feature-image"><SafeImage sourceComponent="App.AreaDetail" src="/images/site-interior.webp" alt="Finished rear extension from supplied project photography" width={960} height={640} /></div></div></section><section className="section section-tint"><div className="container"><SectionHeading eyebrow="Explore the work" title={<>Services for homes in <em>{area}.</em></>} /><div className="service-grid">{services.slice(0, 3).map(service => <ServiceCard key={service.slug} service={service} />)}</div></div></section><FinalCTA title={`Thinking about work in ${area}?`} /></>;
}

function GuidesPage() {
  return <><PageHero eyebrow="Guides & advice" title={<>Useful guidance for <em>the road ahead.</em></>} intro="A growing library of practical guidance for homeowners planning extensions, renovations and building work." image="/images/guides-hero.webp" /><section className="section section-light"><div className="container"><SectionHeading eyebrow="From the project desk" title={<>Read, save and <em>come back to it.</em></>} /><div className="guide-grid">{guides.map(guide => <article className="guide-card" key={guide.slug}><div className="guide-icon"><FileText size={19} /></div><Eyebrow>{guide.category}</Eyebrow><h3><Link to={`/guides/${guide.slug}`}>{guide.title}</Link></h3><p>{guide.excerpt}</p><Link className="text-link" to={`/guides/${guide.slug}`}>Read guide <ArrowRight size={14} /></Link></article>)}</div></div></section><FinalCTA title="Want advice about your own home?" /></>;
}

function GuideDetailPage() {
  const { slug } = useParams();
  const guide = guides.find(item => item.slug === slug);
  if (!guide) return <NotFound />;
  return <><PageHero eyebrow={`Guide / ${guide.category}`} title={<>{guide.title}<br /><em>for your next step.</em></>} intro={guide.excerpt} image="/images/guides-hero.webp" /><article className="section section-light article-page"><div className="container article-layout"><div className="article-body">{guide.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="article-note"><Zap size={18} /><span>Good advice starts with the detail you already know. If the scope is still changing, that is a useful place to begin the conversation.</span></div></div><aside className="article-aside"><Eyebrow>Continue the conversation</Eyebrow><h2>Have a project in mind?</h2><p>Tell us what you are planning and we’ll help you work out what is useful next.</p><ButtonLink to="/quote" variant="amber">Start an enquiry</ButtonLink></aside></div></article><FinalCTA title="Have a question about your project?" /></>;
}

type ContactFormData = { name: string; email: string; phone: string; message: string; preferredContact: string; source: string; website: string; consent: boolean };
const emptyContact: ContactFormData = { name: '', email: '', phone: '', message: '', preferredContact: 'Email', source: 'contact-page', website: '', consent: false };

function ContactForm() {
  const [form, setForm] = useState<ContactFormData>(emptyContact);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const submittingRef = useRef(false);
  const update = (key: keyof ContactFormData, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message || !form.consent) { setStatus({ type: 'error', message: 'Please complete your name, email, telephone, message and privacy consent.' }); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus({ type: 'loading' });
    try { const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to send your enquiry.'); setStatus({ type: 'success', message: data.message || 'Your enquiry has been received.' }); setForm(emptyContact); } catch (error) { submittingRef.current = false; setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to send your enquiry right now.' }); }
  }
  return <form className="form-card" onSubmit={submit} noValidate><div className="form-card-heading"><Eyebrow>Send an enquiry</Eyebrow><h2>Tell us a little <em>about it.</em></h2><p>We’ll use these details to understand how to follow up with you.</p></div><label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update('website', event.target.value)} /></label><div className="form-grid"><label>Full name<input required value={form.name} onChange={event => update('name', event.target.value)} placeholder="Your name" /></label><label>Email address<input required type="email" value={form.email} onChange={event => update('email', event.target.value)} placeholder="Your email address" /></label><label>Telephone<input required type="tel" value={form.phone} onChange={event => update('phone', event.target.value)} placeholder="Your telephone number" /></label><label>Preferred contact<select value={form.preferredContact} onChange={event => update('preferredContact', event.target.value)}><option>Email</option><option>Telephone</option><option>WhatsApp</option></select></label></div><label>What are you planning?<textarea required rows={6} value={form.message} onChange={event => update('message', event.target.value)} placeholder="Tell us about the home, the work and where you are in the process." /></label><label className="checkbox-row"><input type="checkbox" checked={form.consent} onChange={event => update('consent', event.target.checked)} /><span>I agree that Omni Developments can use these details to respond to my enquiry. See our <Link to="/privacy">privacy notice</Link>.</span></label>{status.type !== 'idle' && <div className={`form-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message || (status.type === 'loading' ? 'Sending your enquiry…' : '')}</div>}<button className="button button-dark" disabled={status.type === 'loading'} type="submit">{status.type === 'loading' ? 'Sending…' : 'Send enquiry'} <ArrowRight size={16} /></button></form>;
}

function ContactPage() {
  return <><PageHero eyebrow="Contact Omni" title={<>Let’s talk about <em>your project.</em></>} intro="Start with the details you have. We’ll help you understand the next practical step for your home." image="/images/about-omni-van.webp" /><section className="section section-light"><div className="container contact-layout"><div className="contact-options"><Eyebrow>Project enquiries</Eyebrow><h2>Choose how you would like to <em>get in touch.</em></h2><p>For a structured project conversation, use the form. If you would rather call or message first, the direct links are here.</p><a className="contact-option" href={site.phoneHref}><span className="contact-option-icon"><Phone size={19} /></span><span><strong>{site.phone}</strong><small>Call Omni Developments</small></span><ArrowRight size={16} /></a><a className="contact-option" href={site.whatsappHref} target="_blank" rel="noreferrer"><span className="contact-option-icon green"><MessageCircle size={19} /></span><span><strong>WhatsApp</strong><small>Send a quick project message</small></span><ArrowRight size={16} /></a><a className="contact-option" href={`mailto:${site.email}`}><span className="contact-option-icon"><Mail size={19} /></span><span><strong>{site.email}</strong><small>Send an email enquiry</small></span><ArrowRight size={16} /></a><div className="contact-note"><MapPin size={17} /><span>Working across {site.area}. A specific address is confirmed during the project conversation.</span></div></div><ContactForm /></div></section></>;
}

type QuoteData = { projectType: string; propertyType: string; postcode: string; description: string; stage: string; budget: string; start: string; contactName: string; email: string; phone: string; preferredContact: string; consent: boolean };
const emptyQuote: QuoteData = { projectType: '', propertyType: '', postcode: '', description: '', stage: '', budget: '', start: '', contactName: '', email: '', phone: '', preferredContact: 'Email', consent: false };

function QuoteWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuoteData>(emptyQuote);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'error'; message?: string }>({ type: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const update = (key: keyof QuoteData, value: string | boolean) => setData(current => ({ ...current, [key]: value }));
  const totalSteps = 6;
  const validate = () => {
    if (step === 1 && !data.projectType) return 'Choose the type of work you are considering.';
    if (step === 2 && (!data.propertyType || !data.postcode)) return 'Add your property type and project postcode.';
    if (step === 3 && (!data.description || !data.stage)) return 'Add a short project description and choose the current stage.';
    if (step === 4 && !data.start) return 'Choose your preferred start window.';
    if (step === 6 && (!data.contactName || !data.email || !data.phone || !data.consent)) return 'Complete your contact details and privacy consent.';
    return '';
  };
  const next = () => { const error = validate(); if (error) { setStatus({ type: 'error', message: error }); return; } setStatus({ type: 'idle' }); setStep(current => Math.min(totalSteps, current + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const previous = () => { setStatus({ type: 'idle' }); setStep(current => Math.max(1, current - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const addFiles = (incoming: FileList | null) => { if (!incoming) return; const valid = Array.from(incoming).filter(file => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) && file.size <= 8 * 1024 * 1024); if (valid.length !== incoming.length) setStatus({ type: 'error', message: 'Only JPG, PNG, WebP or PDF files up to 8 MB each are accepted.' }); setFiles(current => [...current, ...valid].slice(0, 8)); };
  const submit = async (event: FormEvent) => { event.preventDefault(); const error = validate(); if (error) { setStatus({ type: 'error', message: error }); return; } if (submittingRef.current) return; submittingRef.current = true; setStatus({ type: 'loading' }); const form = new FormData(); Object.entries(data).forEach(([key, value]) => form.append(key, String(value))); files.forEach(file => form.append('files', file)); try { const response = await fetch('/api/quote', { method: 'POST', body: form }); const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Unable to submit your quote request.'); window.location.href = `/quote/thank-you?ref=${encodeURIComponent(result.reference)}`; } catch (error) { submittingRef.current = false; setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to submit your quote request.' }); } };
  return <div className="quote-wizard"><div className="quote-progress"><div className="quote-progress-top"><span>Step {String(step).padStart(2, '0')} of 06</span><strong>{Math.round((step / totalSteps) * 100)}%</strong></div><div className="progress-track"><span style={{ width: `${(step / totalSteps) * 100}%` }} /></div><div className="progress-steps">{['Work type', 'Property', 'Scope', 'Timeline', 'Files', 'Contact'].map((label, index) => <button type="button" key={label} className={index + 1 === step ? 'active' : index + 1 < step ? 'complete' : ''} onClick={() => index + 1 < step && setStep(index + 1)}><b>{String(index + 1).padStart(2, '0')}</b>{label}</button>)}</div></div>{step === 1 && <WizardStep title="What type of development are you planning?" intro="Select the primary scope of work. You can add more detail in the next step."><div className="option-grid">{quoteTypes.map((type, index) => <button type="button" key={type} className={`option-card ${data.projectType === type ? 'selected' : ''}`} onClick={() => update('projectType', type)}><span className="option-icon"><Icon name={['expand', 'roofing', 'home-edit', 'cooking', 'bathroom', 'sparkles', 'hammer', 'wrench'][index]} size={20} /></span><strong>{type}</strong><small>{['Add space and light to your home.', 'Make better use of roof space.', 'Reconfigure and improve the property.', 'Create a kitchen around daily life.', 'Refresh a bathroom or en-suite.', 'Bring the whole home up to date.', 'Structural work and building repairs.', 'A project that needs a tailored brief.'][index]}</small><span className="radio-dot" /></button>)}</div></WizardStep>}
  {step === 2 && <WizardStep title="Tell us about the property." intro="This helps us understand the setting for the work."><div className="form-grid"><label>Property type<select value={data.propertyType} onChange={event => update('propertyType', event.target.value)}><option value="">Select property type</option><option>Terrace</option><option>Semi-detached</option><option>Detached</option><option>Apartment</option><option>Other</option></select></label><label>Project postcode<input value={data.postcode} onChange={event => update('postcode', event.target.value)} placeholder="e.g. M20 1AA" /></label></div><div className="wizard-callout"><MapPin size={19} /><span>We use your postcode to understand the area for this enquiry. It is not shown publicly.</span></div></WizardStep>}
  {step === 3 && <WizardStep title="What would you like to change?" intro="A useful outline is enough. You can refine the scope later."><label>Project description<textarea rows={7} value={data.description} onChange={event => update('description', event.target.value)} placeholder="What is not working today, and what would you like the home to do better?" /></label><div className="form-grid"><label>Current project stage<select value={data.stage} onChange={event => update('stage', event.target.value)}><option value="">Select stage</option><option>Just an idea</option><option>Exploring options</option><option>Plans or drawings in progress</option><option>Ready to discuss a build</option></select></label><label>Optional budget range<select value={data.budget} onChange={event => update('budget', event.target.value)}><option value="">Prefer not to say</option><option>Under £50,000</option><option>£50,000–£100,000</option><option>£100,000–£150,000</option><option>Over £150,000</option></select></label></div></WizardStep>}
  {step === 4 && <WizardStep title="When would you like to start?" intro="This is an indication only and helps us understand where you are in the journey."><div className="choice-list">{['ASAP', '1–3 months', '3–6 months', '6–12 months', 'Just planning'].map(start => <button type="button" className={data.start === start ? 'selected' : ''} key={start} onClick={() => update('start', start)}><span className="radio-dot" /><strong>{start}</strong><ArrowRight size={16} /></button>)}</div></WizardStep>}
  {step === 5 && <WizardStep title="Add drawings or inspiration." intro="Uploads are optional. Share plans, sketches or photos if they help explain the project."><div className="upload-zone" onClick={() => fileInput.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click(); }} role="button" tabIndex={0}><input ref={fileInput} type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={event => addFiles(event.target.files)} /><Upload size={28} /><strong>Choose files to upload</strong><span>JPG, PNG, WebP or PDF · up to 8 MB each</span></div>{files.length > 0 && <div className="file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><FileText size={16} /><span>{file.name}<small>{Math.round(file.size / 1024)} KB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button></div>)}</div>}<div className="wizard-callout"><ShieldCheck size={19} /><span>Files are checked by type and size before they are accepted. Never upload sensitive information you do not want to share.</span></div></WizardStep>}
  {step === 6 && <WizardStep title="How should we contact you?" intro="Add your details so we can follow up with a genuine response to this enquiry."><div className="form-grid"><label>Full name<input value={data.contactName} onChange={event => update('contactName', event.target.value)} placeholder="Your name" /></label><label>Email address<input type="email" value={data.email} onChange={event => update('email', event.target.value)} placeholder="Your email address" /></label><label>Telephone<input type="tel" value={data.phone} onChange={event => update('phone', event.target.value)} placeholder="Your telephone number" /></label><label>Preferred contact<select value={data.preferredContact} onChange={event => update('preferredContact', event.target.value)}><option>Email</option><option>Telephone</option><option>WhatsApp</option></select></label></div><label className="checkbox-row"><input type="checkbox" checked={data.consent} onChange={event => update('consent', event.target.checked)} /><span>I agree that Omni Developments can use these details to respond to my enquiry. See our <Link to="/privacy">privacy notice</Link>.</span></label></WizardStep>}
  <div className="wizard-footer">{status.message && <div className="form-status error" role="alert">{status.message}</div>}<div className="wizard-actions">{step > 1 && <button className="button button-outline" type="button" onClick={previous}><ArrowLeft size={16} /> Back</button>}{step < totalSteps ? <button className="button button-amber" type="button" onClick={next}>Continue to step {step + 1} <ArrowRight size={16} /></button> : <button className="button button-amber" type="button" disabled={status.type === 'loading'} onClick={submit}>{status.type === 'loading' ? 'Submitting…' : 'Submit quote request'} <ArrowRight size={16} /></button>}</div></div></div>;
}

function WizardStep({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section className="wizard-step"><Eyebrow>Project enquiry</Eyebrow><h2>{title}</h2><p>{intro}</p>{children}</section>;
}

function QuotePage() {
  return <><PageHero eyebrow="Online project estimator" title={<>Request a comprehensive <em>project quote.</em></>} intro="Tell us about your residential vision. We’ll use the information to understand the scope and shape a useful next conversation." /><section className="section quote-page-section"><div className="container quote-page-grid"><QuoteWizard /><aside className="quote-sidebar"><div className="dark-card"><Eyebrow light>Transparent assurance</Eyebrow><h2>Why homeowners start with Omni.</h2><div className="side-point"><Check size={18} /><span><strong>Clear project scope</strong><small>Understand what is being discussed before the work moves forward.</small></span></div><div className="side-point"><MessageCircle size={18} /><span><strong>Direct communication</strong><small>Keep project questions and decisions in the same conversation.</small></span></div><div className="side-point"><ShieldCheck size={18} /><span><strong>Confidential details</strong><small>Your enquiry is handled as private project information.</small></span></div><a className="side-phone" href={site.phoneHref}><Phone size={17} /><span>Prefer to talk?<strong>{site.phone}</strong></span></a></div><div className="sidebar-photo"><SafeImage sourceComponent="App.QuoteSidebar" src="/images/project-renovation-01.webp" alt="Residential property from the supplied photo library" width={960} height={640} /><strong>Have a project in mind?</strong><span>Start with the details you know.</span></div></aside></div></section></>;
}

function QuoteThankYouPage() {
  const params = new URLSearchParams(useLocation().search);
  const reference = params.get('ref');
  return <><section className="thank-you"><div className="container thank-you-inner"><div className="success-icon"><Check size={30} /></div><Eyebrow>Enquiry received</Eyebrow><h1>Thank you. Your project enquiry is <em>on its way.</em></h1><p>We have received the details you submitted. Keep the reference below for your records.</p>{reference && <div className="reference-box"><span>Public enquiry reference</span><strong>{reference}</strong></div>}<div className="hero-actions"><ButtonLink to="/" variant="dark">Back to the homepage</ButtonLink><ButtonLink to="/contact" variant="outline">Contact Omni</ButtonLink></div></div></section></>;
}

function PolicyPage({ type }: { type: 'privacy' | 'cookies' | 'terms' }) {
  const content = { privacy: ['Privacy notice', 'How enquiry details are used', 'We use information submitted through this website to respond to enquiries, manage quote requests and improve the way we communicate about residential projects. We do not publish personal details on this website.'], cookies: ['Cookie notice', 'How this website uses cookies', 'This local build uses only the cookies and browser storage needed for core site behaviour. Any future analytics or marketing cookies should be configured and described here before they are enabled.'], terms: ['Terms of use', 'Using the Omni Developments website', 'The information on this website is general project guidance and does not form a quotation or contract. A project scope, programme and commercial terms are confirmed separately with the owner.'] }[type];
  return <><PageHero eyebrow="Website information" title={<>{content[0]}<br /><em>{content[1]}.</em></>} intro="A concise summary of how this website is intended to work. Owner-approved legal copy should be reviewed before production launch." compact /><section className="section section-light policy-page"><div className="container narrow-copy"><p>{content[2]}</p><h2>Questions?</h2><p>For questions about this website or a project enquiry, please contact {site.email}.</p><ButtonLink to="/contact" variant="dark">Contact Omni</ButtonLink></div></section></>;
}

function NotFound() {
  return <section className="not-found"><div className="container"><Eyebrow>404 / Page not found</Eyebrow><h1>That page has <em>moved on.</em></h1><p>The link you followed does not match a page in this site.</p><ButtonLink to="/" variant="dark">Back to the homepage</ButtonLink></div></section>;
}

function StaffAuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch('/api/admin/summary', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          navigate('/staff/login', { replace: true });
          return;
        }
        if (active) setChecking(false);
      })
      .catch(() => navigate('/staff/login', { replace: true }));
    return () => { active = false; };
  }, [navigate]);

  if (checking) return <main className="admin-auth-check" aria-live="polite">Checking staff access…</main>;
  return <>{children}</>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); navigate('/staff/login'); };
  const nav = [['Dashboard', '/staff', <LayoutDashboard size={17} />], ['Leads', '/staff/leads', <ClipboardList size={17} />], ['Site visits', '/staff/site-visits', <MapPin size={17} />], ['Quotes', '/staff/quotes', <Quote size={17} />], ['Projects', '/staff/projects', <BriefcaseBusiness size={17} />], ['Calendar', '/staff/calendar', <CalendarDays size={17} />], ['Tasks', '/staff/tasks', <Check size={17} />], ['Invoices', '/staff/invoices', <FileText size={17} />]];
  return <StaffAuthGate><div className="admin-shell"><aside className={open ? 'open' : ''}><div className="admin-brand"><Logo dark /><span className="admin-pill">STAFF PORTAL</span></div><nav>{nav.map(([label, href, icon]) => <Link key={href as string} to={href as string} onClick={() => setOpen(false)}>{icon}<span>{label}</span></Link>)}</nav><div className="admin-aside-footer"><ShieldCheck size={16} /><span>Live content only<br /><small>No demo records seeded</small></span></div></aside><div className="admin-main"><header className="admin-header"><button type="button" className="admin-menu" onClick={() => setOpen(!open)} aria-label="Toggle staff navigation"><Menu size={20} /></button><div className="admin-search"><Search size={17} /><input placeholder="Search live records…" /></div><span className="admin-status"><span /> Content workspace</span><StagingMarker /><Link to="/" className="admin-exit">View website <ArrowRight size={15} /></Link><button type="button" className="admin-exit admin-signout" onClick={logout}>Sign out <ArrowRight size={15} /></button></header><main>{children}</main></div></div></StaffAuthGate>;
}

function AdminLoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setMessage(''); try { const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); window.location.href = '/staff'; } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in.'); } };
  return <><a className="skip-link" href="#main-content">Skip to content</a><main id="main-content" className="admin-login"><div className="admin-login-card"><Logo /><Eyebrow>Secure staff portal</Eyebrow><h1>Sign in to the <em>workspace.</em></h1><p>Owner access is protected and requires configured credentials.</p><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input type="password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{message && <div className="form-status error" role="alert">{message}</div>}<button className="button button-dark" type="submit">Sign in <ArrowRight size={16} /></button></form><Link to="/">← Return to public website</Link></div></main></>;
}

function AdminPage({ active = 'Dashboard' }: { active?: string }) {
  const labels: Record<string, string> = { Dashboard: 'Content workspace', Leads: 'Lead pipeline', 'Site visits': 'Site visits', Quotes: 'Quote requests', Projects: 'Project workspace', Calendar: 'Calendar', Tasks: 'Tasks', Invoices: 'Invoices' };
  return <AdminShell><div className="admin-content"><div className="admin-title"><div><Eyebrow>{active}</Eyebrow><h1>{labels[active] || active}</h1><p>Manage approved content and live enquiries from one place.</p></div><button className="button button-outline" type="button" disabled>Database required <ShieldCheck size={16} /></button></div><div className="admin-notice"><ShieldCheck size={18} /><span><strong>Development workspace</strong> Real operational records are not seeded. Connect MySQL and configure staff credentials to enable live management.</span></div><div className="admin-empty-grid"><div className="admin-panel"><div className="panel-heading"><h2>Live records</h2><span>Database connection required</span></div><div className="admin-empty"><ClipboardList size={24} /><h3>No live records to show</h3><p>When the database is configured, this view will show verified {active.toLowerCase()} records.</p></div></div><div className="admin-panel"><div className="panel-heading"><h2>Quick actions</h2><span>Content-safe workflow</span></div><div className="quick-actions"><Link to="/services">Review public services <ArrowRight size={15} /></Link><Link to="/projects">Review project photography <ArrowRight size={15} /></Link><Link to="/contact">Open public contact page <ArrowRight size={15} /></Link><Link to="/quote">Preview quote wizard <ArrowRight size={15} /></Link></div></div></div></div></AdminShell>;
}

function AppRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const routeLabels: Record<string, string> = {
      '/': 'Residential design & build', '/services': 'Design & build services', '/projects': 'Project photography',
      '/how-it-works': 'How it works', '/about': 'About Omni Developments', '/reviews': 'Client reviews',
      '/areas': 'Areas we cover', '/guides': 'Guides & advice', '/contact': 'Contact Omni Developments', '/quote': 'Request a project quote',
    };
    const label = routeLabels[location.pathname] || 'Omni Developments';
    document.title = `${label} | Omni Developments`;
    const description = 'Omni Developments — design-and-build specialists for residential extensions, renovations and structural work across Greater Manchester and Cheshire.';
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) { descriptionTag = document.createElement('meta'); descriptionTag.setAttribute('name', 'description'); document.head.appendChild(descriptionTag); }
    descriptionTag.setAttribute('content', description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', `${window.location.origin}${location.pathname}`);
    let structuredData = document.getElementById('omni-structured-data');
    if (!structuredData) { structuredData = document.createElement('script'); structuredData.id = 'omni-structured-data'; structuredData.setAttribute('type', 'application/ld+json'); document.head.appendChild(structuredData); }
    structuredData.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Omni Developments', description, areaServed: ['Greater Manchester', 'Cheshire'], telephone: site.phone, email: site.email, url: window.location.origin });
    void fetch('/api/site-settings').then((response) => response.ok ? response.json() as Promise<{ stagingMode?: boolean }> : null).then((settings) => {
      const existingRobots = document.querySelector('meta[name="robots"]');
      if (settings?.stagingMode) {
        const robots = existingRobots || document.createElement('meta');
        robots.setAttribute('name', 'robots');
        robots.setAttribute('content', 'noindex, nofollow, noarchive');
        if (!existingRobots) document.head.appendChild(robots);
      } else if (existingRobots) existingRobots.remove();
    }).catch(() => undefined);
  }, [location.pathname]);
  return <Routes><Route path="/" element={<RebuiltLayout><HomePage /></RebuiltLayout>} /><Route path="/services" element={<RebuiltLayout><ServicesPage /></RebuiltLayout>} /><Route path="/services/bathroom-renovations" element={<RebuiltLayout><BathroomRenovationsPage /></RebuiltLayout>} /><Route path="/services/home-extensions" element={<RebuiltLayout><HomeExtensionsPage /></RebuiltLayout>} /><Route path="/services/:slug" element={<RebuiltLayout><ServiceDetailPage /></RebuiltLayout>} /><Route path="/projects" element={<RebuiltLayout><ProjectsPage /></RebuiltLayout>} /><Route path="/projects/:slug" element={<RebuiltLayout><ProjectCaseStudyPage /></RebuiltLayout>} /><Route path="/how-it-works" element={<RebuiltLayout><HowItWorksPage /></RebuiltLayout>} /><Route path="/about" element={<RebuiltLayout><AboutPage /></RebuiltLayout>} /><Route path="/reviews" element={<RebuiltLayout><ReviewsPage /></RebuiltLayout>} /><Route path="/areas" element={<RebuiltLayout><AreasPage /></RebuiltLayout>} /><Route path="/areas/:slug" element={<RebuiltLayout><AreaDetailPage /></RebuiltLayout>} /><Route path="/guides" element={<RebuiltLayout><GuidesPage /></RebuiltLayout>} /><Route path="/guides/:slug" element={<RebuiltLayout><GuideDetailPage /></RebuiltLayout>} /><Route path="/contact" element={<RebuiltLayout><ContactPage /></RebuiltLayout>} /><Route path="/quote" element={<RebuiltLayout><QuotePage /></RebuiltLayout>} /><Route path="/quote/thank-you" element={<QuoteThankYouPage />} /><Route path="/privacy" element={<RebuiltLayout><PolicyPage type="privacy" /></RebuiltLayout>} /><Route path="/cookies" element={<RebuiltLayout><PolicyPage type="cookies" /></RebuiltLayout>} /><Route path="/terms" element={<RebuiltLayout><PolicyPage type="terms" /></RebuiltLayout>} /><Route path="/staff/login" element={<AdminLoginPage />} /><Route path="/staff" element={<AdminPage />} /><Route path="/staff/leads" element={<AdminPage active="Leads" />} /><Route path="/staff/site-visits" element={<AdminPage active="Site visits" />} /><Route path="/staff/quotes" element={<AdminPage active="Quotes" />} /><Route path="/staff/projects" element={<ProjectManagerPage />} /><Route path="/staff/calendar" element={<AdminPage active="Calendar" />} /><Route path="/staff/tasks" element={<AdminPage active="Tasks" />} /><Route path="/staff/invoices" element={<AdminPage active="Invoices" />} /><Route path="*" element={<RebuiltLayout><NotFound /></RebuiltLayout>} /></Routes>;
}

export default function App() { return <BrowserRouter><AppRoutes /></BrowserRouter>; }
