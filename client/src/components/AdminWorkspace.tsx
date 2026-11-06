import { FormEvent, KeyboardEvent, ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Check, ClipboardList,
  Eye, EyeOff, FileSignature, FileText, LayoutDashboard, LockKeyhole, LogOut, Mail, MapPin, Menu, Quote, Search, ShieldCheck, Users, X,
} from 'lucide-react';
import StagingMarker from './StagingMarker';

type StaffUser = { name: string; email: string; role: string };
type SessionState = { status: 'authenticated'; user: StaffUser } | { status: 'unauthenticated' } | { status: 'unavailable' };

const LOGIN_MESSAGES = {
  incorrect: 'Email or password is incorrect.',
  unavailable: 'The staff system is temporarily unavailable. Please contact the administrator.',
  notConfigured: 'Staff access has not been configured.',
  rateLimited: 'Too many sign-in attempts. Please wait and try again.',
  unexpected: 'We couldn’t sign you in. Please try again.',
} as const;

async function fetchSession(): Promise<SessionState> {
  try {
    const response = await fetch('/api/admin/session', { credentials: 'include', headers: { Accept: 'application/json' } });
    if (response.status === 401) return { status: 'unauthenticated' };
    const payload = await response.json().catch(() => null) as { authenticated?: boolean; user?: StaffUser } | null;
    if (response.ok && payload?.authenticated && payload.user) return { status: 'authenticated', user: payload.user };
    return { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Maps the login response to staff-facing copy. Server text is never shown verbatim, so public-form errors cannot leak in. */
function loginErrorMessage(status: number, serverMessage?: string) {
  if (status === 400 || status === 401) return LOGIN_MESSAGES.incorrect;
  if (status === 429) return LOGIN_MESSAGES.rateLimited;
  if (status === 503) return serverMessage === LOGIN_MESSAGES.notConfigured ? LOGIN_MESSAGES.notConfigured : LOGIN_MESSAGES.unavailable;
  return LOGIN_MESSAGES.unexpected;
}

const StaffUserContext = createContext<StaffUser | null>(null);

function AdminBrand() {
  return <Link className="admin-workspace-brand" to="/" aria-label="Omni Developments home"><span className="admin-workspace-mark" aria-hidden="true">O</span><span><strong>OMNI</strong><small>DEVELOPMENTS</small></span></Link>;
}

function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSession().then((session) => {
      if (!active) return;
      if (session.status === 'authenticated') setUser(session.user);
      else navigate('/staff/login', { replace: true, state: { from: location.pathname } });
    });
    return () => { active = false; };
  }, [navigate, location.pathname]);

  if (!user) return <main className="admin-auth-check" aria-live="polite">Checking staff access…</main>;
  return <StaffUserContext.Provider value={user}>{children}</StaffUserContext.Provider>;
}

const NAV: Array<[string, string, ReactNode]> = [
  ['Dashboard', '/staff', <LayoutDashboard size={17} />],
  ['Leads', '/staff/leads', <ClipboardList size={17} />],
  ['Site visits', '/staff/site-visits', <MapPin size={17} />],
  ['Contacts', '/staff/contacts', <Users size={17} />],
  ['Quotes', '/staff/quotes', <Quote size={17} />],
  ['Contracts', '/staff/contracts', <FileSignature size={17} />],
  ['Projects', '/staff/projects', <BriefcaseBusiness size={17} />],
  ['Calendar', '/staff/calendar', <CalendarDays size={17} />],
  ['Tasks', '/staff/tasks', <Check size={17} />],
  ['Invoices', '/staff/invoices', <FileText size={17} />],
  ['Email', '/staff/email', <Mail size={17} />],
];

function ShellFrame({ children, search }: { children: ReactNode; search?: { value: string; onChange: (value: string) => void; label: string } }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useContext(StaffUserContext);
  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    navigate('/staff/login', { replace: true });
  };

  return <div className="admin-shell">
    <aside className={open ? 'open' : ''} id="staff-navigation">
      <div className="admin-brand"><AdminBrand /><span className="admin-pill">STAFF PORTAL</span></div>
      <nav aria-label="Staff workspace">{NAV.map(([label, href, icon]) => <Link className={location.pathname === href ? 'active' : ''} aria-current={location.pathname === href ? 'page' : undefined} key={href} to={href} onClick={() => setOpen(false)}>{icon}<span>{label}</span></Link>)}</nav>
      <div className="admin-aside-footer"><ShieldCheck size={16} /><span>Live database records<br /><small>No demo records are shown</small></span></div>
    </aside>
    <div className="admin-main">
      <header className="admin-header">
        <button type="button" className="admin-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close staff navigation' : 'Open staff navigation'} aria-expanded={open} aria-controls="staff-navigation">{open ? <X size={20} /> : <Menu size={20} />}</button>
        {search ? <label className="admin-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{search.label}</span><input type="search" value={search.value} onChange={event => search.onChange(event.target.value)} placeholder={search.label} /></label> : <span className="admin-header-spacer" />}
        {user && <span className="admin-status" title={user.email}><span aria-hidden="true" /> {user.name}</span>}
        <StagingMarker />
        <Link to="/" className="admin-exit">View website <ArrowRight size={15} /></Link>
        <button type="button" className="admin-exit admin-signout" onClick={logout}>Sign out <LogOut size={15} /></button>
      </header>
      <main id="main-content">{children}</main>
    </div>
  </div>;
}

export function AdminWorkspaceShell({ children, search }: { children: ReactNode; search?: { value: string; onChange: (value: string) => void; label: string } }) {
  return <AuthGate><ShellFrame search={search}>{children}</ShellFrame></AuthGate>;
}

export function OperationalAdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const destination = from && from.startsWith('/staff') && from !== '/staff/login' ? from : '/staff';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [systemUnavailable, setSystemUnavailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetchSession().then((session) => {
      if (!active) return;
      if (session.status === 'authenticated') navigate(destination, { replace: true });
      else setSystemUnavailable(session.status === 'unavailable');
    });
    return () => { active = false; };
  }, [navigate, destination]);

  useEffect(() => { if (message) alertRef.current?.focus(); }, [message]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password }) });
      const payload = await response.json().catch(() => ({})) as { authenticated?: boolean; message?: string };
      if (!response.ok || payload.authenticated !== true) {
        setSystemUnavailable(response.status === 503);
        setMessage(response.ok ? LOGIN_MESSAGES.unexpected : loginErrorMessage(response.status, payload.message));
        return;
      }
      setPassword('');
      navigate(destination, { replace: true });
    } catch {
      setMessage(LOGIN_MESSAGES.unexpected);
    } finally {
      setLoading(false);
    }
  };

  const capsCheck = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'));

  return <><a className="skip-link" href="#staff-login-form">Skip to sign-in form</a><main id="main-content" className="admin-login">
    <div className="admin-login-layout">
      <section className="admin-login-intro" aria-label="About the staff workspace">
        <AdminBrand />
        <div>
          <span className="eyebrow eyebrow-light">Omni staff workspace</span>
          <h1>Enquiries and projects, <em>kept in one place.</em></h1>
          <p>Secure access for authorised Omni staff to review enquiries, quote requests and approved project content.</p>
          <ul className="admin-login-points">
            <li><Check size={15} aria-hidden="true" /> Website enquiries and quote requests</li>
            <li><Check size={15} aria-hidden="true" /> Project gallery management</li>
            <li><Check size={15} aria-hidden="true" /> Signed-in sessions expire after 8 hours</li>
          </ul>
        </div>
        <div className="admin-login-support"><ShieldCheck size={20} aria-hidden="true" /><span><strong>Having trouble signing in?</strong><small>Contact the site administrator. Never share your password by email or support message.</small></span></div>
      </section>
      <section className="admin-login-card" aria-labelledby="staff-login-title">
        <span className="admin-login-lock" aria-hidden="true"><LockKeyhole size={20} /></span>
        <h2 id="staff-login-title">Staff sign in</h2>
        <p>Use your authorised Omni staff account.</p>
        {systemUnavailable && !message && <div className="admin-system-status" role="status"><AlertTriangle size={16} aria-hidden="true" /><span>The staff service is currently unavailable. Please contact the administrator.</span></div>}
        <form id="staff-login-form" onSubmit={submit} aria-busy={loading}>
          <label htmlFor="staff-email">Email address</label>
          <input id="staff-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={loading} value={email} onChange={event => setEmail(event.target.value)} aria-describedby={message ? 'staff-login-error' : undefined} />
          <label htmlFor="staff-password">Password</label>
          <div className="password-field">
            <input id="staff-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={loading} value={password} onChange={event => setPassword(event.target.value)} onKeyUp={capsCheck} onKeyDown={capsCheck} onBlur={() => setCapsLock(false)} aria-describedby={[capsLock ? 'staff-caps-lock' : '', message ? 'staff-login-error' : ''].filter(Boolean).join(' ') || undefined} />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="staff-password" disabled={loading}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {capsLock && <p className="caps-lock" id="staff-caps-lock" role="status"><AlertTriangle size={13} aria-hidden="true" /> Caps Lock is on.</p>}
          {message && <div className="form-status error" id="staff-login-error" role="alert" tabIndex={-1} ref={alertRef}>{message}</div>}
          <button className="button button-dark" disabled={loading} type="submit">{loading ? <><span className="admin-spinner" aria-hidden="true" /> Signing in…</> : <>Sign in <ArrowRight size={16} aria-hidden="true" /></>}</button>
        </form>
        <Link className="admin-login-return" to="/"><ArrowLeft size={14} aria-hidden="true" /> Return to the website</Link>
      </section>
    </div>
  </main></>;
}

type CrmRecord = Record<string, string | number | null>;
type PageKey = 'Dashboard' | 'Leads' | 'Site visits' | 'Quotes' | 'Calendar' | 'Tasks' | 'Invoices';

const PAGES: Record<PageKey, { title: string; endpoint: string; intro: string; empty: string }> = {
  Dashboard: { title: 'Staff dashboard', endpoint: 'summary', intro: 'An overview of live enquiries, quote requests and published project content.', empty: '' },
  Leads: { title: 'Website enquiries', endpoint: 'leads', intro: 'Contact-form enquiries submitted through the website, newest first.', empty: 'Enquiries sent from the website contact form will appear here.' },
  'Site visits': { title: 'Site visits', endpoint: 'site-visits', intro: 'Scheduled and completed site visits.', empty: 'No site visits have been recorded yet.' },
  Quotes: { title: 'Quote requests', endpoint: 'quotes', intro: 'Quote requests submitted through the website, including any uploaded files.', empty: 'Quote requests from the website quote form will appear here.' },
  Calendar: { title: 'Calendar', endpoint: 'calendar', intro: 'Upcoming and past calendar events.', empty: 'No calendar events have been recorded yet.' },
  Tasks: { title: 'Tasks', endpoint: 'tasks', intro: 'Follow-up tasks for the team.', empty: 'No tasks have been recorded yet.' },
  Invoices: { title: 'Invoices', endpoint: 'invoices', intro: 'Invoice records held in the database.', empty: 'No invoices have been recorded yet.' },
};

function formatDate(value: unknown, withTime = true) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

function describeRecord(active: PageKey, record: CrmRecord) {
  const text = (key: string) => (record[key] === null || record[key] === undefined || record[key] === '' ? '' : String(record[key]));
  switch (active) {
    case 'Leads': return { title: text('name'), meta: [text('reference'), text('email'), text('phone'), text('preferredContact') && `Prefers ${text('preferredContact')}`], body: text('message'), date: formatDate(record.createdAt) };
    case 'Quotes': return { title: text('contactName'), meta: [text('reference'), text('projectType'), text('postcode'), text('email'), text('phone'), Number(record.fileCount) ? `${record.fileCount} file${Number(record.fileCount) === 1 ? '' : 's'}` : ''], body: [text('description'), [text('propertyType'), text('stage'), text('budget') && `Budget: ${text('budget')}`, text('desiredStart') && `Start: ${text('desiredStart')}`].filter(Boolean).join(' · ')].filter(Boolean).join('\n\n'), date: formatDate(record.createdAt) };
    case 'Site visits': return { title: `Site visit ${formatDate(record.scheduled_at)}`, meta: [text('status')], body: text('notes'), date: formatDate(record.created_at) };
    case 'Calendar': return { title: text('title'), meta: [formatDate(record.starts_at), record.ends_at ? `until ${formatDate(record.ends_at)}` : ''], body: text('notes'), date: formatDate(record.created_at) };
    case 'Tasks': return { title: text('title'), meta: [text('status'), record.due_at ? `Due ${formatDate(record.due_at)}` : ''], body: text('notes'), date: formatDate(record.created_at) };
    case 'Invoices': return { title: `${text('invoice_reference')} · ${text('customer_name')}`, meta: [new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(record.amount_pence || 0) / 100), text('status'), record.due_at ? `Due ${formatDate(record.due_at, false)}` : ''], body: '', date: formatDate(record.created_at) };
    default: return { title: text('reference') || 'Record', meta: [], body: '', date: '' };
  }
}

export function OperationalAdminPage({ active = 'Dashboard' }: { active?: PageKey }) {
  const page = PAGES[active];
  const navigate = useNavigate();
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setQuery('');
    void fetch(`/api/admin/${page.endpoint}`, { credentials: 'include', headers: { Accept: 'application/json' } }).then(async (response) => {
      if (response.status === 401) { navigate('/staff/login', { replace: true, state: { from: window.location.pathname } }); return; }
      const payload = await response.json().catch(() => ({})) as { records?: CrmRecord[] } & Record<string, number>;
      if (!response.ok) throw new Error(response.status === 503 ? LOGIN_MESSAGES.unavailable : 'Live records could not be loaded. Please refresh the page.');
      if (!mounted) return;
      if (active === 'Dashboard') setSummary(payload);
      else setRecords(Array.isArray(payload.records) ? payload.records : []);
    }).catch((reason) => mounted && setError(reason instanceof Error ? reason.message : 'Live records could not be loaded.')).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [active, page.endpoint, navigate]);

  const described = records.map(record => ({ record, view: describeRecord(active, record) }));
  const needle = query.trim().toLowerCase();
  const visible = needle ? described.filter(({ view }) => [view.title, ...view.meta, view.body].join(' ').toLowerCase().includes(needle)) : described;
  const search = active === 'Dashboard' ? undefined : { value: query, onChange: setQuery, label: `Search ${page.title.toLowerCase()}` };

  return <AdminWorkspaceShell search={search}><div className="admin-content">
    <div className="admin-title"><div><span className="eyebrow">{active}</span><h1>{page.title}</h1><p>{page.intro}</p></div><span className="admin-database-state"><ShieldCheck size={16} aria-hidden="true" /> Live database</span></div>
    {error && <div className="form-status error" role="alert">{error}</div>}
    {active === 'Dashboard'
      ? <div className="admin-dashboard-grid">
          {([['contacts', 'Website enquiries', '/staff/leads'], ['quotes', 'Quote requests', '/staff/quotes'], ['projects', 'Project records', '/staff/projects']] as const).map(([key, label, href]) => <Link className="admin-stat-card" to={href} key={key}><span>{label}</span><strong>{loading || error ? '—' : Number(summary[key] || 0)}</strong><small>View {label.toLowerCase()} <ArrowRight size={13} aria-hidden="true" /></small></Link>)}
          <div className="admin-panel admin-quick-panel"><div className="panel-heading"><h2>Quick actions</h2></div><div className="quick-actions"><Link to="/staff/leads">Review enquiries <ArrowRight size={15} /></Link><Link to="/staff/quotes">Review quote requests <ArrowRight size={15} /></Link><Link to="/staff/projects">Manage projects <ArrowRight size={15} /></Link><Link to="/">View public website <ArrowRight size={15} /></Link></div></div>
        </div>
      : <section className="admin-panel admin-records-panel" aria-labelledby="records-heading" aria-busy={loading}>
          <div className="panel-heading"><h2 id="records-heading">{page.title}</h2><span>{loading ? 'Loading…' : needle ? `${visible.length} of ${records.length} records` : `${records.length} record${records.length === 1 ? '' : 's'}`}</span></div>
          {loading ? <div className="admin-empty"><p>Loading live records…</p></div>
            : !error && records.length === 0 ? <div className="admin-empty"><ClipboardList size={24} aria-hidden="true" /><h3>Nothing here yet</h3><p>{page.empty}</p></div>
            : needle && visible.length === 0 ? <div className="admin-empty"><Search size={24} aria-hidden="true" /><h3>No matching records</h3><p>Try a different name, email or reference.</p></div>
            : <div className="admin-record-list">{visible.map(({ record, view }, index) => <article key={String(record.id ?? record.reference ?? index)}><div><h3>{view.title || 'Untitled record'}</h3><p className="admin-record-meta">{view.meta.filter(Boolean).join(' · ')}</p></div>{view.body && <p className="admin-record-body">{view.body}</p>}{view.date && <time>{view.date}</time>}</article>)}</div>}
        </section>}
  </div></AdminWorkspaceShell>;
}
