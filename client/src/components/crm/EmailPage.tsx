import { FormEvent, useEffect, useState } from 'react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import { api, Badge, formatDate, PageHeader, statusTone } from './CrmShared';

type Tab = 'outbox' | 'inbound' | 'templates' | 'followups';

type EmailRecord = {
  id: number; direction: string; from_address: string; to_address: string; subject: string; body: string | null;
  status: string; template_key: string | null; created_at: string; contact_name: string | null;
};
type TemplateRecord = { template_key: string; name: string; subject: string; body: string; is_active: number };
type Followup = { id: number; document_type: string; document_id: number; contact_name: string | null; template_key: string; due_at: string; status: string; attempts: number; max_attempts: number };
type ContactOption = { id: number; contact_name: string; email: string | null };

const TABS: Array<[Tab, string]> = [['outbox', 'Sent'], ['inbound', 'Inbox'], ['templates', 'Templates'], ['followups', 'Follow-ups']];

export function EmailPage() {
  const [tab, setTab] = useState<Tab>('outbox');
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [compose, setCompose] = useState({ to: '', subject: '', body: '', contactId: '' });
  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'templates') {
        const payload = await api<{ records: TemplateRecord[] }>('/api/admin/email-templates');
        setTemplates(payload.records);
      } else if (tab === 'followups') {
        const payload = await api<{ records: Followup[] }>('/api/admin/followups');
        setFollowups(payload.records);
      } else {
        const payload = await api<{ records: EmailRecord[] }>(`/api/admin/emails?direction=${tab}`);
        setEmails(payload.records);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The mailbox could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab]);
  useEffect(() => {
    void api<{ records: ContactOption[] }>('/api/admin/contacts')
      .then(payload => setContacts(payload.records.filter(contact => contact.email)))
      .catch(() => undefined);
  }, []);

  const chooseContact = (id: string) => {
    const contact = contacts.find(item => String(item.id) === id);
    setCompose(current => ({ ...current, contactId: id, to: contact?.email || current.to }));
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = await api<{ outcome: { status: string } }>('/api/admin/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          to: compose.to,
          subject: compose.subject,
          body: `<p>${compose.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br />')}</p>`,
          ...(compose.contactId ? { contactId: Number(compose.contactId) } : {}),
        }),
      });
      setNotice(payload.outcome.status === 'sent' ? 'Email sent.' : 'Email queued in the log. Add SMTP settings to deliver it.');
      setCompose({ to: '', subject: '', body: '', contactId: '' });
      if (tab === 'outbox') await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The email could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await api<{ result: { status: string; fetched: number; stored: number } }>('/api/admin/emails/sync', { method: 'POST', body: '{}' });
      setNotice(payload.result.status === 'not-configured'
        ? 'IMAP is not configured yet. Add the IMAP settings to pull replies into the inbox.'
        : `Mailbox synced: ${payload.result.fetched} read, ${payload.result.stored} new.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The mailbox could not be synced.');
    } finally {
      setBusy(false);
    }
  };

  const runFollowups = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = await api<{ result: { processed: number; sent: number; failed: number } }>('/api/admin/followups/run', { method: 'POST', body: '{}' });
      setNotice(`Follow-ups checked: ${payload.result.processed}; sent ${payload.result.sent}, failed ${payload.result.failed}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Follow-ups could not be run.');
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/email-templates/${encodeURIComponent(editing.template_key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ subject: templateForm.subject, body: templateForm.body }),
      });
      setNotice('Template updated.');
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The template could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return <AdminWorkspaceShell><div className="admin-content">
    <PageHeader eyebrow="Sales" title="Email" intro="Send email from your domain, pull replies into the inbox, edit the automated templates and review follow-ups." action={<button type="button" className="button button-dark crm-small" onClick={() => void sync()} disabled={busy}>Sync inbox</button>} />
    {error && <div className="form-status error" role="alert">{error}</div>}
    {notice && <div className="form-status crm-success" role="status">{notice}</div>}
    <section className="admin-panel crm-form-panel" aria-labelledby="compose-title">
      <div className="panel-heading"><h2 id="compose-title">Compose email</h2><span>Sent with SMTP from your domain</span></div>
      <form className="crm-form" onSubmit={send}>
        <label>Contact (optional)<select value={compose.contactId} onChange={event => chooseContact(event.target.value)}><option value="">Choose a contact…</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.contact_name} — {contact.email}</option>)}</select></label>
        <label>To<input required type="email" value={compose.to} onChange={event => setCompose({ ...compose, to: event.target.value })} placeholder="customer@example.com" /></label>
        <label className="crm-wide">Subject<input required value={compose.subject} onChange={event => setCompose({ ...compose, subject: event.target.value })} /></label>
        <label className="crm-wide">Message<textarea required rows={5} value={compose.body} onChange={event => setCompose({ ...compose, body: event.target.value })} /></label>
        <div className="crm-actions"><button type="submit" className="button button-dark crm-small" disabled={busy}>{busy ? 'Sending…' : 'Send email'}</button></div>
      </form>
    </section>
    <div className="crm-tabs" role="tablist" aria-label="Email sections">{TABS.map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => { setTab(key); setNotice(''); setEditing(null); }}>{label}</button>)}</div>
    {(tab === 'outbox' || tab === 'inbound') && <section className="admin-panel admin-records-panel" aria-busy={loading}>
      <div className="panel-heading"><h2>{tab === 'inbound' ? 'Inbox' : 'Sent email'}</h2><span>{loading ? 'Loading…' : `${emails.length} message${emails.length === 1 ? '' : 's'}`}</span></div>
      {loading ? <div className="admin-empty"><p>Loading messages…</p></div>
        : emails.length === 0 ? <div className="admin-empty"><p>{tab === 'inbound' ? 'No received email yet. Use Sync inbox to check the mailbox.' : 'No sent email yet.'}</p></div>
        : <div className="crm-table crm-table-email" role="table">
            <div className="crm-row crm-row-head" role="row"><span>Subject</span><span>{tab === 'inbound' ? 'From' : 'To'}</span><span>Status</span><span>When</span></div>
            {emails.map(email => <details className="crm-email" key={email.id}>
              <summary className="crm-row">
                <span><strong>{email.subject}</strong><small>{email.contact_name || email.template_key || ''}</small></span>
                <span>{tab === 'inbound' ? email.from_address : email.to_address}</span>
                <span><Badge tone={statusTone(email.status)}>{email.status}</Badge></span>
                <span>{formatDate(email.created_at, true)}</span>
              </summary>
              <pre className="crm-email-body">{(email.body || '').slice(0, 4000) || 'No plain-text body stored.'}</pre>
            </details>)}
          </div>}
    </section>}
    {tab === 'templates' && <section className="admin-panel admin-records-panel">
      <div className="panel-heading"><h2>Email templates</h2><span>Placeholders: contact.firstName, quote.reference, sign.link</span></div>
      {editing && <form className="crm-form crm-form-editor" onSubmit={saveTemplate}>
        <div className="panel-heading"><h3>{editing.name}</h3><button type="button" className="crm-icon-button" onClick={() => setEditing(null)} aria-label="Close template editor">×</button></div>
        <label className="crm-wide">Subject<input value={templateForm.subject} onChange={event => setTemplateForm({ ...templateForm, subject: event.target.value })} /></label>
        <label className="crm-wide">Body (HTML)<textarea rows={8} value={templateForm.body} onChange={event => setTemplateForm({ ...templateForm, body: event.target.value })} /></label>
        <div className="crm-actions"><button type="submit" className="button button-dark crm-small" disabled={busy}>{busy ? 'Saving…' : 'Save template'}</button><button type="button" className="button button-outline crm-small" onClick={() => setEditing(null)}>Cancel</button></div>
      </form>}
      <div className="crm-table crm-table-templates" role="table">
        <div className="crm-row crm-row-head" role="row"><span>Template</span><span>Subject</span><span>Active</span><span /></div>
        {templates.map(template => <div className="crm-row" key={template.template_key}>
          <span><strong>{template.name}</strong><small>{template.template_key}</small></span>
          <span>{template.subject}</span>
          <span><Badge tone={template.is_active ? 'ok' : 'bad'}>{template.is_active ? 'active' : 'off'}</Badge></span>
          <span className="crm-row-actions"><button type="button" className="crm-link" onClick={() => { setEditing(template); setTemplateForm({ subject: template.subject, body: template.body }); }}>Edit</button></span>
        </div>)}
      </div>
    </section>}
    {tab === 'followups' && <section className="admin-panel admin-records-panel">
      <div className="panel-heading"><h2>Scheduled follow-ups</h2><div className="crm-heading-actions"><button type="button" className="button button-outline crm-small" onClick={() => void runFollowups()} disabled={busy}>Run due now</button><span>{followups.length} scheduled</span></div></div>
      {followups.length === 0 ? <div className="admin-empty"><p>Follow-ups appear here after a quotation or invoice is emailed. Unsigned quotes and unpaid invoices are chased automatically every few days.</p></div>
        : <div className="crm-table" role="table">
            <div className="crm-row crm-row-head" role="row"><span>Document</span><span>Contact</span><span>Template</span><span>Due</span><span>Status</span><span>Attempts</span></div>
            {followups.map(job => <div className="crm-row" key={job.id}>
              <span><strong>{job.document_type} #{job.document_id}</strong></span>
              <span>{job.contact_name || '—'}</span>
              <span>{job.template_key}</span>
              <span>{formatDate(job.due_at, true)}</span>
              <span><Badge tone={statusTone(job.status)}>{job.status}</Badge></span>
              <span>{job.attempts}/{job.max_attempts}</span>
            </div>)}
          </div>}
    </section>}
  </div></AdminWorkspaceShell>;
}

