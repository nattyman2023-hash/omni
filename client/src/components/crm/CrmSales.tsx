import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Inbox, Mail, RefreshCw, Reply, Send, Settings as SettingsIcon, Timer } from 'lucide-react';
import { AdminWorkspaceShell, useStaffUser } from '../AdminWorkspace';
import {
  CompanySettings, CrmRequestError, Email, EmailTemplate, Followup, FollowupRunResult, Invoice, Lead, MailSettings, MailSettingsInput, MailStatus, MailTestResult, Quote, SyncResult,
  crm, emailOutcome, formatDay, formatMoney, formatPercent, formatWhen, htmlToText, useCrm,
} from './crmApi';
import { Field, Modal, invoiceIsLocked } from './CrmForms';
import { Empty, ErrorNote, LeadLinkText, Loading, Notice, PageTitle, StatusBadge, errorText } from './CrmUi';

export type NoticeState = null | { tone: 'success' | 'warning' | 'error' | 'info'; message: ReactNode };

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copy this link:', text);
    return false;
  }
}

/* ---------- Sending a quote or invoice ---------- */
function SendDocumentForm({ what, reference, recipient, path, onClose, onDone }: { what: 'quote' | 'invoice'; reference: string; recipient: string; path: string; onClose: () => void; onDone: () => void }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState<Email | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const result = await crm<{ email: Email }>(path, { method: 'POST', body: message.trim() ? { message: message.trim() } : {} });
      setEmail(result.email);
    } catch (reason) {
      setError(errorText(reason, `Could not send the ${what}.`));
    } finally {
      setSending(false);
    }
  };
  if (email) {
    const outcome = emailOutcome(email);
    return <div className="crm-form">
      <Notice tone={outcome.tone}>{outcome.message}</Notice>
      {email.status !== 'sent' && <p className="crm-muted">The email is kept in the mail log{email.status === 'queued' ? ' and can be sent once email is set up' : ''}. See the <Link to="/staff/email">Email page</Link> for the configuration status.</p>}
      <div className="crm-form-actions"><button type="button" className="crm-button" onClick={onDone}>Done</button></div>
    </div>;
  }
  return <form className="crm-form" onSubmit={submit}>
    <p className="crm-muted">{what === 'quote'
      ? <>Emails {reference} as a PDF with a link to review and sign online{recipient ? <> to <strong>{recipient}</strong></> : ' to the lead’s email address'}. A draft quote is marked Sent, and reminders are scheduled until it is signed.</>
      : <>Emails {reference} as a PDF{recipient ? <> to <strong>{recipient}</strong></> : ' to the customer'}. A draft invoice is marked Issued, and payment reminders are scheduled until it is paid.</>}</p>
    <div className="crm-form-grid">
      <Field label="Personal message (optional)" full hint="Added to the standard email template."><textarea rows={4} maxLength={5000} value={message} onChange={event => setMessage(event.target.value)} /></Field>
    </div>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onClose} disabled={sending}>Cancel</button><button type="submit" className="crm-button" disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send email'}</button></div>
  </form>;
}

/* ---------- Raise an invoice from a quote ---------- */
function RaiseInvoiceForm({ quote, onCancel, onCreated }: { quote: Quote; onCancel: () => void; onCreated: (invoice: Invoice) => void }) {
  const [mode, setMode] = useState<'full' | 'stage'>('full');
  const [stageLabel, setStageLabel] = useState('Deposit');
  const [percent, setPercent] = useState('25');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pct = Number(percent);
  const validPercent = /^\d+(\.\d{1,2})?$/.test(percent.trim()) && pct >= 1 && pct <= 100;
  const subtotal = quote.subtotalPence ?? quote.amountPence;
  const vatRate = quote.vatRatePercent ?? 0;
  const stageNet = validPercent ? Math.round(subtotal * pct / 100) : 0;
  const stageTotal = stageNet + Math.round(stageNet * vatRate / 100);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (mode === 'stage' && !validPercent) { setError('Enter a percentage between 1 and 100.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = mode === 'full' ? {} : { stageLabel: stageLabel.trim() || undefined, percent: pct };
      const result = await crm<{ invoice: Invoice }>(`/invoices/from-quote/${quote.id}`, { method: 'POST', body });
      onCreated(result.invoice);
    } catch (reason) {
      setError(errorText(reason, 'Could not create the invoice.'));
    } finally {
      setSaving(false);
    }
  };
  return <form className="crm-form" onSubmit={submit}>
    <fieldset className="crm-choice">
      <legend>What to invoice</legend>
      <label><input type="radio" name="raise-mode" checked={mode === 'full'} onChange={() => setMode('full')} /> <span><strong>Full quote</strong><small>Copies every line and the VAT rate — {formatMoney(quote.amountPence)}</small></span></label>
      <label><input type="radio" name="raise-mode" checked={mode === 'stage'} onChange={() => setMode('stage')} /> <span><strong>Stage payment</strong><small>A percentage of the quote, e.g. a deposit</small></span></label>
    </fieldset>
    {mode === 'stage' && <div className="crm-form-grid">
      <Field label="Stage label"><input maxLength={120} value={stageLabel} onChange={event => setStageLabel(event.target.value)} placeholder="Stage payment" /></Field>
      <Field label="Percent of quote subtotal" hint={validPercent ? `${formatMoney(stageNet)} + VAT${vatRate ? ` (${formatPercent(vatRate)})` : ''} = ${formatMoney(stageTotal)}` : 'Between 1 and 100.'}><input required inputMode="decimal" value={percent} onChange={event => setPercent(event.target.value)} /></Field>
    </div>}
    <p className="crm-muted">The invoice is created as a draft so you can check it before sending.</p>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Creating…' : 'Create draft invoice'}</button></div>
  </form>;
}

/* ---------- Per-quote actions ---------- */
export function QuoteMeta({ quote }: { quote: Quote }) {
  const parts = [
    quote.version > 1 ? `Version ${quote.version}` : '',
    quote.signedAt ? `Signed by ${quote.signedName || 'the customer'} on ${formatDay(quote.signedAt)}` : '',
    !quote.signedAt && (quote.emailedAt || quote.sentAt) ? `Sent ${formatDay(quote.emailedAt || quote.sentAt)}` : '',
    quote.vatPence ? `inc. ${formatMoney(quote.vatPence)} VAT` : '',
  ].filter(Boolean);
  return parts.length ? <small className="crm-doc-meta">{parts.join(' · ')}</small> : null;
}

type QuoteDialog = null | 'send' | 'invoice';

export function QuoteActions({ quote, onEdit, onChanged, onRevised, onNotice }: { quote: Quote; onEdit: () => void; onChanged: () => void; onRevised: (quote: Quote) => void; onNotice: (notice: NoticeState) => void }) {
  const [dialog, setDialog] = useState<QuoteDialog>(null);
  const [busy, setBusy] = useState(false);
  const canSend = quote.status === 'draft' || quote.status === 'sent';
  const canRevise = quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'declined';
  const canInvoice = quote.status === 'accepted' || quote.status === 'sent';

  const revise = async () => {
    if (!window.confirm(`Create a new version of ${quote.reference}? This version will be marked Amended and its signing link will stop working.`)) return;
    setBusy(true);
    onNotice(null);
    try {
      const result = await crm<{ quote: Quote }>(`/quotes/${quote.id}/revise`, { method: 'POST', body: {} });
      onNotice({ tone: 'success', message: `${result.quote.reference} created as a draft. Make your changes, then email it to the customer.` });
      onRevised(result.quote);
    } catch (reason) {
      onNotice({ tone: 'error', message: errorText(reason, 'Could not revise the quote.') });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!quote.signingUrl) return;
    const copied = await copyText(quote.signingUrl);
    if (copied) onNotice({ tone: 'success', message: `Signing link for ${quote.reference} copied.` });
  };

  return <div className="crm-doc-actions">
    <button type="button" className="crm-link-button" onClick={onEdit}>Edit</button>
    <a className="crm-link-button" href={`/api/admin/crm/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`View PDF of ${quote.reference} (opens in a new tab)`}>PDF</a>
    {canSend && <button type="button" className="crm-link-button" onClick={() => setDialog('send')}>{quote.emailedAt || quote.status === 'sent' ? 'Email again' : 'Email to customer'}</button>}
    {quote.signingUrl && <button type="button" className="crm-link-button" onClick={() => void copy()}>Copy signing link</button>}
    {canRevise && <button type="button" className="crm-link-button" onClick={() => void revise()} disabled={busy}>{busy ? 'Revising…' : 'Revise'}</button>}
    {canInvoice && <button type="button" className="crm-link-button" onClick={() => setDialog('invoice')}>Raise invoice</button>}
    {dialog === 'send' && <Modal title={`Email ${quote.reference}`} onClose={() => { setDialog(null); onChanged(); }}><SendDocumentForm what="quote" reference={quote.reference} recipient={quote.customerEmail} path={`/quotes/${quote.id}/send`} onClose={() => setDialog(null)} onDone={() => { setDialog(null); onChanged(); }} /></Modal>}
    {dialog === 'invoice' && <Modal title={`Raise an invoice from ${quote.reference}`} onClose={() => setDialog(null)}><RaiseInvoiceForm quote={quote} onCancel={() => setDialog(null)} onCreated={invoice => { setDialog(null); onNotice({ tone: 'success', message: <>{invoice.reference} created as a draft for {formatMoney(invoice.amountPence)}. <Link to="/staff/invoices">Open invoices</Link></> }); onChanged(); }} /></Modal>}
  </div>;
}

/* ---------- Per-invoice actions ---------- */
export function InvoiceMeta({ invoice }: { invoice: Invoice }) {
  const parts = [
    invoice.stageLabel,
    invoice.sentAt ? `Emailed ${formatDay(invoice.sentAt)}` : '',
    invoice.vatPence ? `inc. ${formatMoney(invoice.vatPence)} VAT` : '',
  ].filter(Boolean);
  return parts.length ? <small className="crm-doc-meta">{parts.join(' · ')}</small> : null;
}

export function InvoiceActions({ invoice, onEdit, onChanged, onNotice }: { invoice: Invoice; onEdit: () => void; onChanged: () => void; onNotice: (notice: NoticeState) => void }) {
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = invoice.status === 'draft' || invoice.status === 'issued';
  const markPaid = async () => {
    setBusy(true);
    onNotice(null);
    try {
      await crm(`/invoices/${invoice.id}`, { method: 'PATCH', body: { status: 'paid' } });
      onNotice({ tone: 'success', message: `${invoice.reference} marked as paid. Any payment reminders have been cancelled.` });
      onChanged();
    } catch (reason) {
      onNotice({ tone: 'error', message: errorText(reason, 'Could not mark the invoice as paid.') });
    } finally {
      setBusy(false);
    }
  };
  const reopen = async () => {
    if (!window.confirm(`Reopen ${invoice.reference}? It goes back to Issued so it can be corrected, and is no longer counted as paid.`)) return;
    setBusy(true);
    onNotice(null);
    try {
      await crm(`/invoices/${invoice.id}`, { method: 'PATCH', body: { status: 'issued' } });
      onNotice({ tone: 'success', message: `${invoice.reference} reopened. Edit it, then email the corrected copy if needed.` });
      onChanged();
    } catch (reason) {
      onNotice({ tone: 'error', message: errorText(reason, 'Could not reopen the invoice.') });
    } finally {
      setBusy(false);
    }
  };
  return <div className="crm-doc-actions">
    <button type="button" className="crm-link-button" onClick={onEdit}>{invoiceIsLocked(invoice) ? 'View / notes' : 'Edit'}</button>
    {invoice.status === 'paid' && <button type="button" className="crm-link-button" onClick={() => void reopen()} disabled={busy}>Reopen</button>}
    <a className="crm-link-button" href={`/api/admin/crm/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`View PDF of ${invoice.reference} (opens in a new tab)`}>PDF</a>
    {open && <button type="button" className="crm-link-button" onClick={() => setSending(true)}>{invoice.sentAt ? 'Email again' : 'Email invoice'}</button>}
    {open && <button type="button" className="crm-link-button" onClick={() => void markPaid()} disabled={busy}>{busy ? 'Saving…' : 'Mark paid'}</button>}
    {sending && <Modal title={`Email ${invoice.reference}`} onClose={() => { setSending(false); onChanged(); }}><SendDocumentForm what="invoice" reference={invoice.reference} recipient={invoice.customerEmail} path={`/invoices/${invoice.id}/send`} onClose={() => setSending(false)} onDone={() => { setSending(false); onChanged(); }} /></Modal>}
  </div>;
}

/* ---------- Emails ---------- */
/** Subject, recipient and quoted text for replying to (or following up) an email. */
export function replyDraft(email: Email) {
  const inbound = email.direction === 'inbound';
  const subject = /^re:/i.test(email.subject.trim()) ? email.subject.trim() : `Re: ${email.subject.trim() || '(no subject)'}`;
  const when = email.receivedAt || email.sentAt || email.createdAt;
  const quoted = htmlToText(email.body).split('\n').map(line => `> ${line}`).join('\n');
  const intro = `${when ? `On ${formatWhen(when)}, ` : ''}${inbound ? email.from : 'we'} wrote:`;
  return { to: inbound ? email.from : email.to, subject: subject.slice(0, 190), body: `\n\n${intro}\n${quoted}`.slice(0, 20000) };
}

export function EmailItem({ email, showLead = false, onReply }: { email: Email; showLead?: boolean; onReply?: (email: Email) => void }) {
  const inbound = email.direction === 'inbound';
  const when = email.receivedAt || email.sentAt || email.createdAt;
  const text = htmlToText(email.body);
  return <li className="crm-email-item">
    <span className={`crm-email-dir crm-email-${email.direction}`} aria-hidden="true">{inbound ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span>
    <div>
      <strong>{email.subject || '(no subject)'}</strong>
      <span>{inbound ? `From ${email.from}` : `To ${email.to}`}{when ? ` · ${formatWhen(when)}` : ''}{showLead && email.leadId ? <> · <LeadLinkText id={email.leadId} name={email.leadName} /></> : null}</span>
      {email.error && email.status !== 'sent' && email.status !== 'received' && <p className="crm-email-error">{email.error}</p>}
      {text && <details className="crm-email-body"><summary>Show message</summary><p>{text}</p></details>}
    </div>
    <div className="crm-row-actions">
      <span className="sr-only">{inbound ? 'Received email' : 'Sent email'}, status</span><StatusBadge status={email.status} />
      {onReply && <button type="button" className="crm-button crm-button-ghost crm-button-small" onClick={() => onReply(email)} aria-label={`${inbound ? 'Reply to' : 'Follow up on'} “${email.subject || 'no subject'}”`}><Reply size={14} /> {inbound ? 'Reply' : 'Follow up'}</button>}
    </div>
  </li>;
}

export function ComposeEmailForm({ leadId, defaultTo = '', replyTo, onSent, onCancel }: { leadId?: number; defaultTo?: string; replyTo?: Email; onSent?: (email: Email) => void; onCancel?: () => void }) {
  const draft = replyTo ? replyDraft(replyTo) : null;
  const leads = useCrm<{ records: Lead[] }>(leadId === undefined && !replyTo ? '/leads' : null);
  const [lead, setLead] = useState<number | null>(leadId ?? replyTo?.leadId ?? null);
  const [to, setTo] = useState(draft?.to || defaultTo);
  const [subject, setSubject] = useState(draft?.subject || '');
  const [body, setBody] = useState(draft?.body || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Email | null>(null);
  const pickLead = (value: string) => {
    const id = value ? Number(value) : null;
    const previous = leads.data?.records.find(item => item.id === lead);
    const next = leads.data?.records.find(item => item.id === id);
    setLead(id);
    if (next?.email && (!to.trim() || to === previous?.email)) setTo(next.email);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const response = await crm<{ email: Email }>('/emails', { method: 'POST', body: { ...(lead ? { leadId: lead } : {}), ...(replyTo ? { replyToEmailId: replyTo.id } : {}), to: to.trim(), subject, body } });
      setResult(response.email);
      setSubject('');
      setBody('');
      onSent?.(response.email);
    } catch (reason) {
      setError(errorText(reason, 'Could not send the email.'));
    } finally {
      setSending(false);
    }
  };
  const outcome = result ? emailOutcome(result) : null;
  return <form className="crm-form" onSubmit={submit}>
    {outcome && <Notice tone={outcome.tone}>{outcome.message}</Notice>}
    <div className="crm-form-grid">
      {leadId === undefined && !replyTo && <Field label="Lead (optional)" hint="Links the email to the lead’s timeline and fills in their address."><select value={lead === null ? '' : String(lead)} onChange={event => pickLead(event.target.value)}>
        <option value="">{leads.loading ? 'Loading leads…' : 'Not linked to a lead'}</option>
        {leads.data?.records.map(item => <option key={item.id} value={item.id}>{item.name} ({item.reference}){item.email ? '' : ' · no email'}</option>)}
      </select></Field>}
      <Field label="To" full={leadId !== undefined || Boolean(replyTo)}><input required type="email" maxLength={190} value={to} onChange={event => setTo(event.target.value)} autoComplete="off" /></Field>
      <Field label="Subject" full><input required maxLength={190} value={subject} onChange={event => setSubject(event.target.value)} /></Field>
      <Field label="Message" full hint="Plain text. Line breaks are kept."><textarea required rows={8} maxLength={20000} value={body} onChange={event => setBody(event.target.value)} /></Field>
    </div>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions">
      {onCancel && <button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={sending}>{result ? 'Close' : 'Cancel'}</button>}
      <button type="submit" className="crm-button" disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send email'}</button>
    </div>
  </form>;
}

/** Plain-English explanation of what is missing from the email configuration. */
export function mailStatusIssues(status: MailStatus) {
  const issues: Array<{ tone: 'warning' | 'info'; text: string }> = [];
  if (!status.smtpConfigured) issues.push({ tone: 'warning', text: 'Email sending isn’t set up yet — messages are saved as queued and nothing reaches customers. Enter the Zoho Mail details under Settings → Email (Zoho Mail).' });
  else if (!status.outboundEnabled) issues.push({ tone: 'warning', text: 'Email sending is switched off (OUTBOUND_MESSAGES_ENABLED) — messages are saved as queued and nothing reaches customers.' });
  if (!status.imapConfigured) issues.push({ tone: 'info', text: 'Inbox sync isn’t set up, so customer replies won’t appear in the CRM. Add the IMAP settings to pull them in.' });
  else if (!status.imapAvailable) issues.push({ tone: 'warning', text: 'Inbox sync is configured but the PHP imap extension isn’t enabled on the server, so replies can’t be pulled in.' });
  if (!status.cronConfigured) issues.push({ tone: 'info', text: 'No scheduled job is set up (CRM_CRON_SECRET), so follow-ups only run while staff are using the CRM or when you press “Run follow-ups now”.' });
  return issues;
}

export function MailStatusBanner({ status, error, onOpenSetup }: { status: MailStatus | null; error: string; onOpenSetup?: () => void }) {
  if (error) return <Notice tone="warning">Couldn’t check the email configuration: {error}</Notice>;
  if (!status) return null;
  const issues = mailStatusIssues(status);
  if (!issues.length) return <Notice tone="success">Email is fully set up: sending, inbox sync and scheduled follow-ups are all working.</Notice>;
  const tone = issues.some(issue => issue.tone === 'warning') ? 'warning' : 'info';
  return <Notice tone={tone}><strong>Email setup</strong><ul className="crm-notice-list">{issues.map(issue => <li key={issue.text}>{issue.text}</li>)}</ul>
    <div className="crm-notice-actions">
      <Link className="crm-button crm-button-ghost crm-button-small" to="/staff/settings#email-settings">Set up Zoho Mail in Settings</Link>
      {onOpenSetup && <button type="button" className="crm-button crm-button-ghost crm-button-small" onClick={onOpenSetup}>Setup steps &amp; tests</button>}
    </div></Notice>;
}

/* ---------- Zoho Mail setup and connection tests ---------- */
/** Exactly the non-secret settings from docs/CRM_SALES.md (Zoho Mail, UK data centre). */
const ZOHO_CONFIG = `'OUTBOUND_MESSAGES_ENABLED' => 'true',
'SMTP_HOST' => 'smtppro.zoho.uk', 'SMTP_PORT' => '465', 'SMTP_SECURE' => 'ssl',
'SMTP_USER' => 'admin@omnidevelopment.co.uk', 'SMTP_PASSWORD' => '<Zoho app-specific password>',
'EMAIL_FROM' => 'admin@omnidevelopment.co.uk', 'EMAIL_FROM_NAME' => 'Omni Developments',
'IMAP_HOST' => 'imappro.zoho.uk', 'IMAP_PORT' => '993', 'IMAP_USER' => 'admin@omnidevelopment.co.uk',
'IMAP_PASSWORD' => '<same app-specific password>', 'IMAP_MAILBOX' => 'INBOX',`;

const TEST_STAGE_LABELS: Record<MailTestResult['stage'], string> = { config: 'Configuration', connect: 'Connecting to the mail server', tls: 'Secure connection (TLS)', auth: 'Signing in', send: 'Sending', done: 'Finished' };

function TestResult({ result }: { result: MailTestResult }) {
  return <Notice tone={result.ok ? 'success' : 'error'}>
    <strong>{result.ok ? 'Passed' : `Failed at: ${TEST_STAGE_LABELS[result.stage] || result.stage}`}</strong>
    {result.message && <> — {result.message}</>}
    <span className="crm-test-stage">Stage: <code>{result.stage}</code></span>
  </Notice>;
}

/** "Send test email" and "Test inbox connection", shared by the Email page and Settings. */
export function MailTests({ onTested, idPrefix = 'mail' }: { onTested?: () => void; idPrefix?: string }) {
  const user = useStaffUser();
  const [to, setTo] = useState(user?.email || '');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<MailTestResult | null>(null);
  const [sendError, setSendError] = useState('');
  const [checking, setChecking] = useState(false);
  const [imapResult, setImapResult] = useState<MailTestResult | null>(null);
  const [imapError, setImapError] = useState('');

  const sendTest = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setSendResult(null);
    setSendError('');
    try {
      const { result } = await crm<{ result: MailTestResult }>('/mail-test', { method: 'POST', body: { to: to.trim() } });
      setSendResult(result);
      onTested?.();
    } catch (reason) {
      setSendError(errorText(reason, 'Could not run the test.'));
    } finally {
      setSending(false);
    }
  };
  const testInbox = async () => {
    setChecking(true);
    setImapResult(null);
    setImapError('');
    try {
      const { result } = await crm<{ result: MailTestResult }>('/imap-test', { method: 'POST', body: {} });
      setImapResult(result);
    } catch (reason) {
      setImapError(errorText(reason, 'Could not run the test.'));
    } finally {
      setChecking(false);
    }
  };
  return <div className="crm-setup-tests">
    <form className="crm-form" onSubmit={sendTest} aria-labelledby={`${idPrefix}-send-test`}>
      <h3 id={`${idPrefix}-send-test`}>Send test email</h3>
      <p className="crm-muted">Sends a short message through the SMTP settings and reports exactly where it stops if something is wrong.</p>
      <div className="crm-inline-form">
        <Field label="Send to"><input required type="email" maxLength={190} value={to} onChange={event => setTo(event.target.value)} autoComplete="email" /></Field>
        <button type="submit" className="crm-button" disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send test email'}</button>
      </div>
      <div aria-live="polite">{sendResult && <TestResult result={sendResult} />}{sendError && <Notice tone="error">{sendError}</Notice>}</div>
    </form>
    <div className="crm-form">
      <h3>Test inbox connection</h3>
      <p className="crm-muted">Signs in to the mailbox over IMAP without importing anything.</p>
      <button type="button" className="crm-button crm-button-ghost" onClick={() => void testInbox()} disabled={checking}><Inbox size={15} /> {checking ? 'Testing…' : 'Test inbox connection'}</button>
      <div aria-live="polite">{imapResult && <TestResult result={imapResult} />}{imapError && <Notice tone="error">{imapError}</Notice>}</div>
    </div>
  </div>;
}

function MailSetupPanel({ status, onTested }: { status: MailStatus | null; onTested: () => void }) {
  const user = useStaffUser();
  const canEdit = !user || user.role === 'owner' || user.role === 'admin';
  const [copied, setCopied] = useState(false);
  const sendingReady = Boolean(status?.smtpConfigured && status.outboundEnabled);
  const inboxReady = Boolean(status?.imapConfigured && status.imapAvailable);
  const needsSetup = !status || !sendingReady || !inboxReady;
  const copy = async () => { if (await copyText(ZOHO_CONFIG)) setCopied(true); };
  const check = (ok: boolean) => <span className={`crm-setup-state ${ok ? 'crm-setup-ok' : 'crm-setup-missing'}`}>{ok ? 'Ready' : 'Not set up'}</span>;

  return <div className="crm-setup">
    <section className="admin-panel crm-panel" aria-labelledby="setup-status"><div className="panel-heading"><h2 id="setup-status">Status</h2></div>
      {!status ? <Loading /> : <ul className="crm-related">
        <li><div><strong>Sending email (SMTP)</strong><span>{!status.smtpConfigured ? 'No SMTP settings yet — emails are saved as queued.' : !status.outboundEnabled ? 'Configured, but OUTBOUND_MESSAGES_ENABLED is off — emails are saved as queued.' : 'Emails from the CRM are delivered.'}</span></div><div className="crm-row-actions">{check(sendingReady)}</div></li>
        <li><div><strong>Inbox sync (IMAP)</strong><span>{!status.imapConfigured ? 'No IMAP settings yet — replies are not pulled in.' : !status.imapAvailable ? 'Configured, but the PHP imap extension is not enabled on the server.' : 'Replies are pulled in by Sync inbox and the scheduled job.'}</span></div><div className="crm-row-actions">{check(inboxReady)}</div></li>
        <li><div><strong>Scheduled job (cron)</strong><span>{status.cronConfigured ? 'Follow-ups and inbox sync run on a schedule.' : 'Optional. Without it, follow-ups run while staff use the CRM.'}</span></div><div className="crm-row-actions">{check(status.cronConfigured)}</div></li>
      </ul>}
    </section>

    {needsSetup && <section className="admin-panel crm-panel" aria-labelledby="setup-zoho"><div className="panel-heading"><h2 id="setup-zoho">Set up with Zoho Mail</h2></div>
      <div className="crm-panel-body crm-setup-body">
        <p>omnidevelopment.co.uk uses Zoho Mail on Zoho’s <strong>UK</strong> data centre.</p>
        <ol className="crm-steps">
          <li><strong>Turn on IMAP in Zoho Mail.</strong> Settings → Mail Accounts → IMAP → enable IMAP access.</li>
          <li><strong>Create an app-specific password.</strong> At accounts.zoho.uk → Security → App passwords. Use it instead of the account password (needed when two-factor sign-in is on, which is recommended).</li>
          <li><strong>Enter it in the CRM:</strong> {canEdit
            ? <Link to="/staff/settings#email-settings">Settings → Email (Zoho Mail)</Link>
            : <>an owner or administrator can do this under Settings → Email (Zoho Mail)</>} is pre-filled with the Zoho UK server details — paste the app password, turn outbound email on and save.</li>
          <li><code>EMAIL_FROM</code> must be the signed-in mailbox (or one of its verified aliases) — Zoho refuses to send as any other address.</li>
          {status && !status.cronConfigured && <li><strong>Optional:</strong> set <code>CRM_CRON_SECRET</code> (32+ random characters) in the server config and add a Hostinger cron job every 15 minutes: <code>{'curl -fsS "https://crm.omnidevelopment.co.uk/api/cron/crm?key=…" > /dev/null'}</code></li>}
        </ol>
        <details className="crm-submission">
          <summary>Prefer the server config file instead?</summary>
          <p className="crm-muted">Settings in <code>omni-crm-config.php</code> (one level above <code>public_html</code>; copy <code>php/api/config.example.php</code>) take priority over the Settings page. Replace the two password placeholders with the app-specific password:</p>
          <div className="crm-config-block"><pre tabIndex={0} aria-label="Zoho Mail configuration"><code>{ZOHO_CONFIG}</code></pre><button type="button" className="crm-button crm-button-ghost crm-button-small" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy settings'}</button></div>
        </details>
        <p className="crm-muted">Then use the tests below to confirm each part works.</p>
      </div>
    </section>}

    <section className="admin-panel crm-panel" aria-labelledby="setup-tests"><div className="panel-heading"><h2 id="setup-tests">Connection tests</h2></div>
      <div className="crm-panel-body"><MailTests onTested={onTested} idPrefix="email-page" /></div>
    </section>
  </div>;
}

type EmailTab = 'log' | 'compose' | 'templates' | 'followups' | 'setup';
const EMAIL_TABS: Array<[EmailTab, string]> = [['log', 'Mail log'], ['compose', 'Compose'], ['templates', 'Templates'], ['followups', 'Follow-ups'], ['setup', 'Setup & tests']];

export function EmailPage() {
  const [tab, setTab] = useState<EmailTab>('log');
  const mailStatus = useCrm<{ status: MailStatus }>('/mail-status');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [syncing, setSyncing] = useState(false);
  const [logVersion, setLogVersion] = useState(0);
  // Pull in new customer replies whenever the page opens. Quiet: only speaks up when something arrived.
  useEffect(() => {
    let live = true;
    crm<{ result: SyncResult }>('/emails/sync', { method: 'POST', body: {} }).then(({ result }) => {
      if (!live || result.status !== 'ok') return;
      setLogVersion(value => value + 1);
      if (result.imported > 0) setNotice({ tone: 'success', message: `${result.imported} new message${result.imported === 1 ? '' : 's'} pulled in from the inbox.` });
    }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  const sync = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const { result } = await crm<{ result: SyncResult }>('/emails/sync', { method: 'POST', body: {} });
      const tone = result.status === 'ok' ? 'success' : result.status === 'failed' ? 'error' : 'warning';
      const fallback = result.status === 'ok' ? `Inbox synced: ${result.imported} new message${result.imported === 1 ? '' : 's'}.` : result.status === 'not-configured' ? 'Inbox sync isn’t set up yet.' : result.status === 'unavailable' ? 'Inbox sync isn’t available on this server.' : 'The inbox could not be synced.';
      setNotice({ tone, message: result.message || fallback });
      setLogVersion(value => value + 1);
    } catch (reason) {
      setNotice({ tone: 'error', message: errorText(reason, 'Could not sync the inbox.') });
    } finally {
      setSyncing(false);
    }
  };
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Email" title="Email" intro="Every email sent from the CRM or received from a customer, the templates used for quotes and invoices, and automatic follow-ups." actions={<>
      <button type="button" className="crm-button crm-button-ghost" onClick={() => void sync()} disabled={syncing}><RefreshCw size={15} /> {syncing ? 'Syncing…' : 'Sync inbox'}</button>
      <button type="button" className="crm-button" onClick={() => setTab('compose')}><Mail size={15} /> Compose</button>
    </>} />
    <div className="crm-stack"><MailStatusBanner status={mailStatus.data?.status || null} error={mailStatus.error} onOpenSetup={tab === 'setup' ? undefined : () => setTab('setup')} />{notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice>}</div>
    <div className="crm-tabs" role="tablist" aria-label="Email sections">{EMAIL_TABS.map(([value, label]) => <button type="button" role="tab" key={value} id={`email-tab-${value}`} aria-controls="email-panel" aria-selected={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
    <div id="email-panel" role="tabpanel" aria-labelledby={`email-tab-${tab}`}>
      {tab === 'log' && <MailLog version={logVersion} />}
      {tab === 'compose' && <section className="admin-panel crm-panel"><div className="panel-heading"><h2>New email</h2></div><div className="crm-panel-body"><ComposeEmailForm onSent={() => setLogVersion(value => value + 1)} /></div></section>}
      {tab === 'templates' && <TemplatesEditor />}
      {tab === 'followups' && <FollowupsPanel />}
      {tab === 'setup' && <MailSetupPanel status={mailStatus.data?.status || null} onTested={() => setLogVersion(value => value + 1)} />}
    </div>
  </div></AdminWorkspaceShell>;
}

function MailLog({ version }: { version: number }) {
  const [direction, setDirection] = useState<'' | 'outbound' | 'inbound'>('');
  const { data, error, loading, reload } = useCrm<{ records: Email[] }>(`/emails${direction ? `?direction=${direction}` : ''}`);
  useEffect(() => { if (version) reload(); }, [version, reload]);
  const records = data?.records || [];
  const [replying, setReplying] = useState<Email | null>(null);
  return <>
    {replying && <Modal title={replying.direction === 'inbound' ? `Reply to ${replying.from}` : `Follow up with ${replying.to}`} wide onClose={() => { setReplying(null); reload(); }}>
      <ComposeEmailForm replyTo={replying} onCancel={() => { setReplying(null); reload(); }} />
    </Modal>}
    <div className="crm-toggle crm-filter" role="group" aria-label="Show">{([['', 'All'], ['outbound', 'Sent'], ['inbound', 'Received']] as const).map(([value, label]) => <button type="button" key={value || 'all'} aria-pressed={direction === value} onClick={() => setDirection(value)}>{label}</button>)}</div>
    <ErrorNote message={error} />
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !records.length ? <Empty icon={<Inbox size={22} />} title="No emails yet">Emails sent from the CRM, and replies pulled in by Sync inbox, appear here.</Empty>
      : <ul className="crm-related crm-email-list">{records.map(email => <EmailItem key={email.id} email={email} showLead onReply={setReplying} />)}</ul>}</section>
  </>;
}

function TemplatesEditor() {
  const { data, error, loading, setData } = useCrm<{ templates: EmailTemplate[] }>('/email-templates');
  if (loading && !data) return <Loading />;
  return <>
    <ErrorNote message={error} />
    <p className="crm-muted crm-intro-note">These emails are sent automatically when you email a quote or invoice, when a quote is signed and as reminders. Placeholders in double braces are replaced with the customer’s details when the email is sent.</p>
    <div className="crm-template-grid">{(data?.templates || []).map(template => <TemplateCard key={template.key} template={template} onSaved={saved => setData(current => current && { templates: current.templates.map(item => item.key === saved.key ? saved : item) })} />)}</div>
  </>;
}

function TemplateCard({ template, onSaved }: { template: EmailTemplate; onSaved: (template: EmailTemplate) => void }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.isActive);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<NoticeState>(null);
  const dirty = subject !== template.subject || body !== template.body || isActive !== template.isActive;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const result = await crm<{ template: EmailTemplate }>(`/email-templates/${encodeURIComponent(template.key)}`, { method: 'PATCH', body: { subject, body, isActive } });
      onSaved(result.template);
      setStatus({ tone: 'success', message: 'Template saved.' });
    } catch (reason) {
      setStatus({ tone: 'error', message: errorText(reason, 'Could not save the template.') });
    } finally {
      setSaving(false);
    }
  };
  const id = `template-${template.key}`;
  return <section className="admin-panel crm-panel" aria-labelledby={`${id}-title`}>
    <div className="panel-heading"><h2 id={`${id}-title`}>{template.name || template.key}</h2><code className="crm-code">{template.key}</code></div>
    <form className="crm-form crm-panel-body" onSubmit={submit}>
      <div className="crm-form-grid">
        <Field label="Subject" full><input required maxLength={190} value={subject} onChange={event => setSubject(event.target.value)} /></Field>
        <Field label="Body" full><textarea rows={8} maxLength={20000} value={body} onChange={event => setBody(event.target.value)} /></Field>
      </div>
      {template.placeholders.length > 0 && <div className="crm-placeholders"><span>Placeholders</span><ul>{template.placeholders.map(placeholder => <li key={placeholder}><code>{placeholder.startsWith('{{') ? placeholder : `{{${placeholder}}}`}</code></li>)}</ul></div>}
      <label className="crm-checkbox"><input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} /> <span>Active — send this email automatically</span></label>
      {status && <Notice tone={status.tone}>{status.message}</Notice>}
      <div className="crm-form-actions"><button type="submit" className="crm-button" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save template'}</button></div>
    </form>
  </section>;
}

const FOLLOWUP_TEMPLATE_LABELS: Record<string, string> = { quote_reminder: 'Quote reminder', invoice_reminder: 'Payment reminder' };

function FollowupsPanel() {
  const { data, error, loading, reload } = useCrm<{ records: Followup[] }>('/followups');
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const run = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const { result } = await crm<{ result: FollowupRunResult }>('/followups/run', { method: 'POST', body: {} });
      const total = result.sent + result.failed + result.cancelled;
      setNotice({ tone: result.failed ? 'warning' : 'success', message: total ? `Follow-ups run: ${result.sent} sent, ${result.failed} failed, ${result.cancelled} cancelled.` : 'Follow-ups run: nothing was due.' });
      reload();
    } catch (reason) {
      setNotice({ tone: 'error', message: errorText(reason, 'Could not run follow-ups.') });
    } finally {
      setRunning(false);
    }
  };
  const records = data?.records || [];
  return <>
    <div className="crm-panel-toolbar"><p className="crm-muted">Unsigned quotes and unpaid invoices are chased automatically every 3 days, up to 3 times, until they are signed or paid.</p><button type="button" className="crm-button crm-button-ghost" onClick={() => void run()} disabled={running}><Timer size={15} /> {running ? 'Running…' : 'Run follow-ups now'}</button></div>
    {notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice>}
    <ErrorNote message={error} />
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !records.length ? <Empty icon={<Timer size={22} />} title="No follow-ups">Reminders are scheduled when you email a quote or invoice.</Empty>
      : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Document</th><th>Customer</th><th>Reminder</th><th>Next due</th><th>Sent</th><th>Status</th></tr></thead><tbody>
        {records.map(item => <tr key={item.id}>
          <td><strong>{item.documentReference}</strong><small>{item.documentType === 'quote' ? 'Quote' : 'Invoice'}</small></td>
          <td><LeadLinkText id={item.leadId} name={item.leadName} /></td>
          <td>{FOLLOWUP_TEMPLATE_LABELS[item.templateKey] || item.templateKey}</td>
          <td>{item.status === 'pending' ? formatWhen(item.dueAt) || '—' : '—'}</td>
          <td>{item.attempts} of {item.maxAttempts}{item.lastSentAt && <small>Last {formatDay(item.lastSentAt)}</small>}</td>
          <td><StatusBadge status={item.status} /></td>
        </tr>)}
      </tbody></table></div>}</section>
  </>;
}

/* ---------- Settings ---------- */
type SettingsDraft = Record<keyof CompanySettings, string>;
const toDraft = (settings: CompanySettings): SettingsDraft => ({
  companyName: settings.companyName || '', companyAddress: settings.companyAddress || '', companyEmail: settings.companyEmail || '', companyPhone: settings.companyPhone || '', companyVatNumber: settings.companyVatNumber || '',
  companyNumber: settings.companyNumber || '', companyWebsite: settings.companyWebsite || '',
  bankAccountName: settings.bankAccountName || '', bankName: settings.bankName || '', bankSortCode: settings.bankSortCode || '', bankAccountNumber: settings.bankAccountNumber || '',
  paymentTermsDays: String(settings.paymentTermsDays ?? ''), defaultVatRatePercent: String(settings.defaultVatRatePercent ?? ''), quoteTerms: settings.quoteTerms || '',
});

export function SettingsPage() {
  const user = useStaffUser();
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const roleCanEdit = !user || user.role === 'owner' || user.role === 'admin';
  const readOnly = forbidden || !roleCanEdit;

  useEffect(() => {
    let live = true;
    crm<{ settings: CompanySettings }>('/settings')
      .then(result => { if (live) setDraft(toDraft(result.settings)); })
      .catch(reason => { if (live) setLoadError(reason instanceof CrmRequestError && reason.status === 403 ? 'Only owners and administrators can view company settings.' : errorText(reason, 'Could not load the settings.')); });
    return () => { live = false; };
  }, []);

  const set = (key: keyof CompanySettings) => (event: { target: { value: string } }) => setDraft(current => current && { ...current, [key]: event.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || saving || readOnly) return;
    const paymentTermsDays = Number(draft.paymentTermsDays);
    const defaultVatRatePercent = Number(draft.defaultVatRatePercent);
    if (!/^\d+$/.test(draft.paymentTermsDays.trim()) || paymentTermsDays > 365) { setNotice({ tone: 'error', message: 'Payment terms must be a whole number of days between 0 and 365.' }); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(draft.defaultVatRatePercent.trim()) || defaultVatRatePercent > 100) { setNotice({ tone: 'error', message: 'Default VAT must be a percentage between 0 and 100, for example 20.' }); return; }
    setSaving(true);
    setNotice(null);
    try {
      const result = await crm<{ settings: CompanySettings }>('/settings', { method: 'PATCH', body: { ...draft, paymentTermsDays, defaultVatRatePercent } });
      setDraft(toDraft(result.settings));
      setNotice({ tone: 'success', message: 'Settings saved. New PDFs will use these details.' });
    } catch (reason) {
      if (reason instanceof CrmRequestError && reason.status === 403) { setForbidden(true); setNotice(null); }
      else setNotice({ tone: 'error', message: errorText(reason, 'Could not save the settings.') });
    } finally {
      setSaving(false);
    }
  };

  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Settings" title="Company settings" intro="Your company, VAT and bank details are printed on quote and invoice PDFs and used in customer emails." />
    <ErrorNote message={loadError} />
    {readOnly && draft && <Notice tone="info">Only owners and administrators can change these settings. Ask one of them if something needs updating.</Notice>}
    {!draft && !loadError ? <Loading /> : draft && <form className="crm-form crm-settings" onSubmit={submit}>
      <fieldset disabled={readOnly || saving} className="crm-settings-fieldset">
        <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Company</h2></div><div className="crm-panel-body crm-form-grid">
          <Field label="Company name"><input maxLength={190} value={draft.companyName} onChange={set('companyName')} /></Field>
          <Field label="VAT number" hint="Leave blank if you are not VAT registered."><input maxLength={40} value={draft.companyVatNumber} onChange={set('companyVatNumber')} /></Field>
          <Field label="Email"><input type="email" maxLength={190} value={draft.companyEmail} onChange={set('companyEmail')} /></Field>
          <Field label="Phone"><input type="tel" maxLength={40} value={draft.companyPhone} onChange={set('companyPhone')} /></Field>
          <Field label="Company number" hint="Companies House registration number, if a limited company."><input maxLength={20} value={draft.companyNumber} onChange={set('companyNumber')} /></Field>
          <Field label="Website"><input type="url" inputMode="url" maxLength={190} value={draft.companyWebsite} onChange={set('companyWebsite')} placeholder="https://" /></Field>
          <Field label="Address" full><textarea rows={3} maxLength={1000} value={draft.companyAddress} onChange={set('companyAddress')} /></Field>
        </div></section>
        <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Bank details</h2><span className="crm-muted">Printed on invoices</span></div><div className="crm-panel-body crm-form-grid">
          <Field label="Account name"><input maxLength={190} value={draft.bankAccountName} onChange={set('bankAccountName')} /></Field>
          <Field label="Bank"><input maxLength={190} value={draft.bankName} onChange={set('bankName')} /></Field>
          <Field label="Sort code"><input maxLength={20} inputMode="numeric" value={draft.bankSortCode} onChange={set('bankSortCode')} placeholder="00-00-00" /></Field>
          <Field label="Account number"><input maxLength={20} inputMode="numeric" value={draft.bankAccountNumber} onChange={set('bankAccountNumber')} /></Field>
        </div></section>
        <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Quotes and invoices</h2><SettingsIcon size={18} aria-hidden="true" /></div><div className="crm-panel-body crm-form-grid">
          <Field label="Payment terms (days)" hint="Due date for new invoices when they are issued."><input inputMode="numeric" value={draft.paymentTermsDays} onChange={set('paymentTermsDays')} /></Field>
          <Field label="Default VAT %" hint="Used for new quotes and invoices."><input inputMode="decimal" value={draft.defaultVatRatePercent} onChange={set('defaultVatRatePercent')} /></Field>
          <Field label="Standard quote terms" full hint="Added to new quotes. Each quote keeps its own copy."><textarea rows={8} maxLength={20000} value={draft.quoteTerms} onChange={set('quoteTerms')} /></Field>
        </div></section>
      </fieldset>
      {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
      {!readOnly && <div className="crm-form-actions"><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>}
    </form>}
    <MailSettingsSection canEdit={roleCanEdit} />
  </div></AdminWorkspaceShell>;
}

/* ---------- Email (Zoho Mail) settings ---------- */
/** Zoho Mail UK defaults (docs/CRM_SALES.md), used for any field that is still empty. */
const ZOHO_DEFAULTS = {
  smtpHost: 'smtppro.zoho.uk', smtpPort: '465', smtpSecure: 'ssl' as MailSettings['smtpSecure'], smtpUser: 'admin@omnidevelopment.co.uk',
  emailFrom: 'admin@omnidevelopment.co.uk', emailFromName: 'Omni Developments',
  imapHost: 'imappro.zoho.uk', imapPort: '993', imapUser: 'admin@omnidevelopment.co.uk', imapMailbox: 'INBOX',
};

type MailDraft = {
  outboundEnabled: boolean; smtpHost: string; smtpPort: string; smtpSecure: MailSettings['smtpSecure']; smtpUser: string;
  emailFrom: string; emailFromName: string; emailReplyTo: string;
  imapHost: string; imapPort: string; imapUser: string; imapMailbox: string; signingBaseUrl: string;
};
const MAIL_TEXT_KEYS = ['smtpHost', 'smtpUser', 'emailFrom', 'emailFromName', 'emailReplyTo', 'imapHost', 'imapUser', 'imapMailbox', 'signingBaseUrl'] as const;

function toMailDraft(settings: MailSettings): MailDraft {
  const fromConfig = (key: string) => settings.source?.[key] === 'config';
  const pick = (key: keyof typeof ZOHO_DEFAULTS, value: string | number | null | undefined) => {
    const text = value === null || value === undefined || value === 0 ? '' : String(value);
    return text || fromConfig(key) ? text : ZOHO_DEFAULTS[key];
  };
  return {
    outboundEnabled: Boolean(settings.outboundEnabled),
    smtpHost: pick('smtpHost', settings.smtpHost), smtpPort: pick('smtpPort', settings.smtpPort),
    smtpSecure: (settings.smtpSecure || ZOHO_DEFAULTS.smtpSecure) as MailSettings['smtpSecure'], smtpUser: pick('smtpUser', settings.smtpUser),
    emailFrom: pick('emailFrom', settings.emailFrom), emailFromName: pick('emailFromName', settings.emailFromName), emailReplyTo: settings.emailReplyTo || '',
    imapHost: pick('imapHost', settings.imapHost), imapPort: pick('imapPort', settings.imapPort), imapUser: pick('imapUser', settings.imapUser),
    imapMailbox: pick('imapMailbox', settings.imapMailbox), signingBaseUrl: settings.signingBaseUrl || '',
  };
}

const validPort = (value: string) => /^\d{1,5}$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 65535;

function MailSettingsSection({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<MailSettings | null>(null);
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [forbidden, setForbidden] = useState(!canEdit);
  const [password, setPassword] = useState('');
  const [separateImap, setSeparateImap] = useState(false);
  const [imapPassword, setImapPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    if (!canEdit) return;
    let live = true;
    crm<{ settings: MailSettings }>('/mail-settings')
      .then(result => { if (live) { setSettings(result.settings); setDraft(toMailDraft(result.settings)); } })
      .catch(reason => {
        if (!live) return;
        if (reason instanceof CrmRequestError && reason.status === 403) setForbidden(true);
        else setLoadError(errorText(reason, 'Could not load the email settings.'));
      });
    return () => { live = false; };
  }, [canEdit]);

  // Arriving from the Email page's "Set up Zoho Mail" link scrolls straight here.
  useEffect(() => {
    if ((draft || forbidden) && window.location.hash === '#email-settings') document.getElementById('email-settings')?.scrollIntoView({ block: 'start' });
  }, [Boolean(draft), forbidden]);

  const fromConfig = (key: string) => settings?.source?.[key] === 'config';
  const configHint = 'Set in the server config file.';
  const set = (key: keyof MailDraft) => (event: { target: { value: string } }) => { setSaved(false); setDraft(current => current && { ...current, [key]: event.target.value }); };
  const smtpPasswordLocked = fromConfig('smtpPassword');
  const imapPasswordLocked = fromConfig('imapPassword');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !settings || saving) return;
    if (!fromConfig('smtpPort') && !validPort(draft.smtpPort)) { setNotice({ tone: 'error', message: 'The SMTP port must be a number between 1 and 65535 (Zoho uses 465).' }); return; }
    if (!fromConfig('imapPort') && !validPort(draft.imapPort)) { setNotice({ tone: 'error', message: 'The IMAP port must be a number between 1 and 65535 (Zoho uses 993).' }); return; }
    const body: MailSettingsInput = {};
    if (!fromConfig('outboundEnabled')) body.outboundEnabled = draft.outboundEnabled;
    if (!fromConfig('smtpSecure')) body.smtpSecure = draft.smtpSecure;
    if (!fromConfig('smtpPort')) body.smtpPort = Number(draft.smtpPort);
    if (!fromConfig('imapPort')) body.imapPort = Number(draft.imapPort);
    for (const key of MAIL_TEXT_KEYS) if (!fromConfig(key)) body[key] = draft[key].trim();
    // One Zoho app password serves both SMTP and IMAP unless a separate IMAP password is given. '' keeps the saved one.
    if (!smtpPasswordLocked) body.smtpPassword = password;
    if (!imapPasswordLocked) body.imapPassword = separateImap ? imapPassword : password;
    setSaving(true);
    setNotice(null);
    try {
      const result = await crm<{ settings: MailSettings }>('/mail-settings', { method: 'PATCH', body });
      setSettings(result.settings);
      setDraft(toMailDraft(result.settings));
      setPassword('');
      setImapPassword('');
      setSaved(true);
      setNotice({ tone: 'success', message: 'Email settings saved. Run the tests below to check that Zoho accepts them.' });
    } catch (reason) {
      if (reason instanceof CrmRequestError && reason.status === 403) setForbidden(true);
      else setNotice({ tone: 'error', message: errorText(reason, 'Could not save the email settings.') });
    } finally {
      setSaving(false);
    }
  };

  const heading = <div className="panel-heading"><h2 id="email-settings-title">Email (Zoho Mail)</h2><Mail size={18} aria-hidden="true" /></div>;
  if (forbidden) return <section id="email-settings" className="admin-panel crm-panel crm-settings-mail" aria-labelledby="email-settings-title">{heading}
    <div className="crm-panel-body"><p className="crm-muted">Only owners and administrators can view or change the email connection. Ask one of them to set up Zoho Mail.</p></div></section>;

  const field = (key: keyof MailDraft, label: string, input: ReactNode, hint?: string, full = false) => <Field label={label} hint={fromConfig(key) ? configHint : hint} full={full}>{input}</Field>;
  const text = (key: (typeof MAIL_TEXT_KEYS)[number], label: string, options: { type?: string; hint?: string; placeholder?: string; full?: boolean } = {}) =>
    field(key, label, <input type={options.type || 'text'} maxLength={190} value={draft?.[key] || ''} onChange={set(key)} readOnly={fromConfig(key)} disabled={fromConfig(key)} placeholder={options.placeholder} autoComplete="off" />, options.hint, options.full);

  return <section id="email-settings" className="admin-panel crm-panel crm-settings-mail" aria-labelledby="email-settings-title">{heading}
    <div className="crm-panel-body">
      <ErrorNote message={loadError} />
      <ol className="crm-steps">
        <li><strong>Turn on IMAP in Zoho Mail:</strong> Settings → Mail Accounts → IMAP → enable IMAP access.</li>
        <li><strong>Create an app password:</strong> accounts.zoho.uk → Security → App passwords. Paste it below — use it instead of your normal Zoho password.</li>
        <li>Check the details below (already filled in for Zoho UK), turn outbound email on and save. Then send a test email.</li>
      </ol>
      {!draft && !loadError ? <Loading /> : draft && <form className="crm-form" onSubmit={submit}>
        <fieldset className="crm-settings-fieldset" disabled={saving}>
          <label className="crm-switch">
            <input type="checkbox" role="switch" checked={draft.outboundEnabled} onChange={event => { setSaved(false); setDraft(current => current && { ...current, outboundEnabled: event.target.checked }); }} disabled={fromConfig('outboundEnabled')} aria-describedby="outbound-hint" />
            <span><strong>Outbound email on</strong><small id="outbound-hint">{fromConfig('outboundEnabled') ? configHint : draft.outboundEnabled ? 'Quotes, invoices and reminders are emailed to customers.' : 'Off: emails are saved as queued and nothing is sent.'}</small></span>
          </label>

          <fieldset className="crm-subfieldset"><legend>Zoho app password</legend>
            <div className="crm-form-grid">
              <Field label={separateImap ? 'App password for sending (SMTP)' : 'Zoho app password'} hint={smtpPasswordLocked ? configHint : settings?.smtpPasswordSet ? 'Password saved ✓ — leave blank to keep it.' : 'Not saved yet. Used for sending and for the inbox.'}>
                <input type="password" autoComplete="new-password" maxLength={200} value={password} onChange={event => { setSaved(false); setPassword(event.target.value); }} disabled={smtpPasswordLocked} placeholder={settings?.smtpPasswordSet ? '••••••••  (saved)' : ''} />
              </Field>
              {separateImap && <Field label="App password for the inbox (IMAP)" hint={imapPasswordLocked ? configHint : settings?.imapPasswordSet ? 'Password saved ✓ — leave blank to keep it.' : 'Not saved yet.'}>
                <input type="password" autoComplete="new-password" maxLength={200} value={imapPassword} onChange={event => { setSaved(false); setImapPassword(event.target.value); }} disabled={imapPasswordLocked} placeholder={settings?.imapPasswordSet ? '••••••••  (saved)' : ''} />
              </Field>}
            </div>
            <label className="crm-checkbox"><input type="checkbox" checked={separateImap} onChange={event => setSeparateImap(event.target.checked)} /> <span>Use a different password for IMAP</span></label>
            {(settings?.smtpPasswordSet || settings?.imapPasswordSet) && <p className="crm-saved-flags">{settings.smtpPasswordSet && <span>Sending password saved ✓</span>}{settings.imapPasswordSet && <span>Inbox password saved ✓</span>}</p>}
          </fieldset>

          <fieldset className="crm-subfieldset"><legend>Sending (SMTP)</legend>
            <div className="crm-form-grid">
              {text('smtpHost', 'SMTP server')}
              {field('smtpPort', 'Port', <input inputMode="numeric" value={draft.smtpPort} onChange={set('smtpPort')} disabled={fromConfig('smtpPort')} />)}
              {field('smtpSecure', 'Security', <select value={draft.smtpSecure} onChange={set('smtpSecure')} disabled={fromConfig('smtpSecure')}><option value="ssl">SSL (port 465)</option><option value="tls">STARTTLS (port 587)</option><option value="none">None</option></select>)}
              {text('smtpUser', 'Mailbox (username)', { type: 'email' })}
              {text('emailFrom', 'From address', { type: 'email', hint: 'Must be the mailbox above or one of its Zoho aliases.' })}
              {text('emailFromName', 'From name')}
              {text('emailReplyTo', 'Reply-to (optional)', { type: 'email' })}
            </div>
          </fieldset>

          <fieldset className="crm-subfieldset"><legend>Inbox (IMAP)</legend>
            <div className="crm-form-grid">
              {text('imapHost', 'IMAP server')}
              {field('imapPort', 'Port', <input inputMode="numeric" value={draft.imapPort} onChange={set('imapPort')} disabled={fromConfig('imapPort')} />)}
              {text('imapUser', 'Mailbox (username)', { type: 'email' })}
              {text('imapMailbox', 'Folder')}
            </div>
          </fieldset>

          <fieldset className="crm-subfieldset"><legend>Signing links</legend>
            <div className="crm-form-grid">{text('signingBaseUrl', 'Signing link address', { type: 'url', placeholder: 'https://crm.omnidevelopment.co.uk', hint: 'The web address used in quote signing links. Leave blank to use the site address.', full: true })}</div>
          </fieldset>
        </fieldset>
        {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
        <div className="crm-form-actions"><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : 'Save email settings'}</button></div>
      </form>}
      {(saved || settings?.smtpPasswordSet) && <div className="crm-settings-tests"><h3>Check the connection</h3><MailTests idPrefix="settings" /></div>}
    </div>
  </section>;
}
