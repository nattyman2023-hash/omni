import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* Small presentational pieces shared by every CRM screen. */

export function PageTitle({ eyebrow, title, intro, actions }: { eyebrow: string; title: string; intro?: string; actions?: ReactNode }) {
  return <div className="admin-title crm-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{intro && <p>{intro}</p>}</div>{actions && <div className="crm-title-actions">{actions}</div>}</div>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`crm-badge crm-status-${status}`}>{label || status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

export function ErrorNote({ message }: { message: string }) {
  return message ? <div className="form-status error crm-error" role="alert">{message}</div> : null;
}

/** Inline result banner: success / warning / error / info. */
export function Notice({ tone, children, onDismiss }: { tone: 'success' | 'warning' | 'error' | 'info'; children: ReactNode; onDismiss?: () => void }) {
  return <div className={`crm-notice crm-notice-${tone}`} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>
    <div>{children}</div>
    {onDismiss && <button type="button" className="crm-link-button" onClick={onDismiss}>Dismiss</button>}
  </div>;
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="admin-empty crm-empty">{icon}<h3>{title}</h3><p>{children}</p></div>;
}

export function Loading() {
  return <div className="admin-empty crm-empty" aria-live="polite"><p>Loading…</p></div>;
}

export function LeadLinkText({ id, name, reference }: { id: number | null; name: string; reference?: string }) {
  if (!id) return <span className="crm-muted">No lead</span>;
  return <Link className="crm-lead-link" to={`/staff/leads/${id}`}>{name || reference || 'Lead'}</Link>;
}

export const errorText = (reason: unknown, fallback: string) => (reason instanceof Error && reason.message ? reason.message : fallback);
