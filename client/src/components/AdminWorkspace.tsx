import { FormEvent, KeyboardEvent, ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Check, ClipboardList,
  Eye, EyeOff, FileText, LayoutDashboard, LockKeyhole, LogOut, MapPin, Menu, Quote, Search, ShieldCheck, Users, X,
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

/** The signed-in staff member, so pages can vary by role (the team screen is owner/administrator only). */
export function useStaffUser() {
  return useContext(StaffUserContext);
}

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

const NAV: Array<[string, string, ReactNode, string[]?]> = [
  ['Dashboard', '/staff', <LayoutDashboard size={17} />],
  ['Leads', '/staff/leads', <ClipboardList size={17} />],
  ['Site visits', '/staff/site-visits', <MapPin size={17} />],
  ['Tasks', '/staff/tasks', <Check size={17} />],
  ['Quotes', '/staff/quotes', <Quote size={17} />],
  ['Invoices', '/staff/invoices', <FileText size={17} />],
  ['Calendar', '/staff/calendar', <CalendarDays size={17} />],
  ['Projects', '/staff/projects', <BriefcaseBusiness size={17} />],
  ['Team', '/staff/team', <Users size={17} />, ['owner', 'admin']],
];

const isActive = (pathname: string, href: string) => (href === '/staff' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

function ShellFrame({ children, search }: { children: ReactNode; search?: { value: string; onChange: (value: string) => void; label: string } }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useContext(StaffUserContext);
  // Role-restricted sections (Team) are hidden from staff accounts instead of failing when opened.
  const navigation = NAV.filter(([, , , roles]) => !roles || Boolean(user && roles.includes(user.role)));
  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    navigate('/staff/login', { replace: true });
  };

  return <div className="admin-shell">
    <aside className={open ? 'open' : ''} id="staff-navigation">
      <div className="admin-brand"><AdminBrand /><span className="admin-pill">STAFF PORTAL</span></div>
      <nav aria-label="Staff workspace">{navigation.map(([label, href, icon]) => <Link className={isActive(location.pathname, href) ? 'active' : ''} aria-current={isActive(location.pathname, href) ? 'page' : undefined} key={href} to={href} onClick={() => setOpen(false)}>{icon}<span>{label}</span></Link>)}</nav>
      <div className="admin-aside-footer"><ShieldCheck size={16} /><span>Omni CRM<br /><small>Live database records</small></span></div>
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
            <li><Check size={15} aria-hidden="true" /> Leads pipeline, site visits and follow-ups</li>
            <li><Check size={15} aria-hidden="true" /> Quotes and invoices</li>
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
