import { FormEvent, useEffect, useState } from 'react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import { api, Badge, emptyLine, formatDate, gbp, itemsToLines, LineItemsEditor, PageHeader, statusTone, toItemsPayload } from './CrmShared';
import type { LineItem } from './CrmShared';

type ContactOption = { id: number; contact_name: string; company_name: string | null; email: string | null };

type Quote = {
  id: number;
  quote_reference: string;
  contact_id: number;
  version: number;
  title: string;
  status: string;
  sign_status: string;
  issue_date: string | null;
  valid_until: string | null;
  subtotal_pence: number;
  vat_rate: string | number;
  vat_pence: number;
  discount_pence: number;
  total_pence: number;
  sent_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  item_count: number;
};

type QuoteItem = { description: string; quantity: number | string; unit_price_pence: number; amount_pence: number };

type QuoteForm = {
  contactId: string; title: string; description: string; issueDate: string; validUntil: string;
  vatRate: string; discount: string; terms: string; notes: string; items: LineItem[];
};

const today = () => new Date().toISOString().slice(0, 10);

const blankQuote = (): QuoteForm => ({
  contactId: '', title: '', description: '', issueDate: today(), validUntil: '',
  vatRate: '0', discount: '0', terms: 'Payment terms as agreed. Quotation valid for 30 days.', notes: '',
  items: [{ ...emptyLine }],
});

export function ContractsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<QuoteForm>(blankQuote());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [contactPayload, quotePayload] = await Promise.all([
        api<{ records: ContactOption[] }>('/api/admin/contacts'),
        api<{ records: Quote[] }>('/api/admin/contracts'),
      ]);
      setContacts(contactPayload.records);
      setQuotes(quotePayload.records);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Contracts could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setForm(blankQuote()); setEditingId(null); setShowForm(true); setNotice(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.contactId) { setError('Choose a contact for this quotation.'); return; }
    const items = toItemsPayload(form.items);
    if (!items.length) { setError('Add at least one line item.'); return; }
    setSaving(true);
    setError('');
    const body = JSON.stringify({
      contactId: Number(form.contactId),
      title: form.title,
      description: form.description,
      issueDate: form.issueDate,
      validUntil: form.validUntil,
      vatRate: Number(form.vatRate) || 0,
      discountPence: Math.round((Number(form.discount) || 0) * 100),
      terms: form.terms,
      notes: form.notes,
      items,
    });
    try {
      if (editingId) await api(`/api/admin/contracts/${editingId}`, { method: 'PATCH', body });
      else await api('/api/admin/contracts', { method: 'POST', body });
      setNotice(editingId ? 'Quotation updated.' : 'Quotation created.');
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The quotation could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (quote: Quote) => {
    try {
      const payload = await api<{ quote: Quote & { description: string | null; terms: string | null; notes: string | null }; items: QuoteItem[] }>(`/api/admin/contracts/${quote.id}`);
      setForm({
        contactId: String(payload.quote.contact_id),
        title: payload.quote.title,
        description: payload.quote.description || '',
        issueDate: payload.quote.issue_date || today(),
        validUntil: payload.quote.valid_until || '',
        vatRate: String(payload.quote.vat_rate),
        discount: ((payload.quote.discount_pence || 0) / 100).toFixed(2),
        terms: payload.quote.terms || '',
        notes: payload.quote.notes || '',
        items: payload.items.length ? itemsToLines(payload.items) : [{ ...emptyLine }],
      });
      setEditingId(quote.id);
      setShowForm(true);
      setNotice('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The quotation could not be opened.');
    }
  };

  const send = async (quote: Quote) => {
    setBusyId(quote.id);
    setError('');
    try {
      const payload = await api<{ outcome: { status: string } }>(`/api/admin/contracts/${quote.id}/send`, { method: 'POST', body: '{}' });
      setNotice(payload.outcome.status === 'sent'
        ? `Quotation ${quote.quote_reference} emailed with the signing link.`
        : payload.outcome.status === 'not-configured'
          ? 'Email is not configured yet — the message is queued in the email log. Add SMTP settings to send it.'
          : 'The quotation could not be emailed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The quotation could not be emailed.');
    } finally {
      setBusyId(null);
    }
  };

  const revise = async (quote: Quote) => {
    setBusyId(quote.id);
    setError('');
    try {
      const payload = await api<{ quote: Quote }>(`/api/admin/contracts/${quote.id}/revise`, { method: 'POST', body: '{}' });
      setNotice(`Revision ${payload.quote.quote_reference} created from ${quote.quote_reference}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The revision could not be created.');
    } finally {
      setBusyId(null);
    }
  };

  const raiseInvoice = async (quote: Quote) => {
    const input = window.prompt(`Stage payment percentage for ${quote.quote_reference} (1-100)`, '100');
    if (input === null) return;
    const percentage = Number(input);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      setError('Enter a stage percentage between 1 and 100.');
      return;
    }
    setBusyId(quote.id);
    setError('');
    try {
      const payload = await api<{ invoice: { invoice_reference: string } }>(`/api/admin/invoices/from-quote/${quote.id}`, { method: 'POST', body: JSON.stringify({ stagePercentage: percentage }) });
      setNotice(`Invoice ${payload.invoice.invoice_reference} created from ${quote.quote_reference}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invoice could not be created.');
    } finally {
      setBusyId(null);
    }
  };

  return <AdminWorkspaceShell><div className="admin-content">
    <PageHeader eyebrow="Sales" title="Contracts & quotations" intro="Build line-item quotations, send them for signature, chase unsigned contracts and raise stage-payment invoices." action={<button type="button" className="button button-dark crm-small" onClick={openNew}>New quotation</button>} />
    {error && <div className="form-status error" role="alert">{error}</div>}
    {notice && <div className="form-status crm-success" role="status">{notice}</div>}
    {showForm && <section className="admin-panel crm-form-panel" aria-labelledby="quote-form-title">
      <div className="panel-heading"><h2 id="quote-form-title">{editingId ? 'Edit quotation' : 'New quotation'}</h2><button type="button" className="crm-icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
      <form className="crm-form" onSubmit={submit}>
        <label className="crm-wide">Contact<select required value={form.contactId} onChange={event => setForm({ ...form, contactId: event.target.value })}><option value="">Choose a contact…</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.contact_name}{contact.company_name ? ` — ${contact.company_name}` : ''}</option>)}</select></label>
        <label className="crm-wide">Title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Extension and internal renovation" /></label>
        <label>Issue date<input type="date" value={form.issueDate} onChange={event => setForm({ ...form, issueDate: event.target.value })} /></label>
        <label>Valid until<input type="date" value={form.validUntil} onChange={event => setForm({ ...form, validUntil: event.target.value })} /></label>
        <label>VAT rate (%)<input inputMode="decimal" value={form.vatRate} onChange={event => setForm({ ...form, vatRate: event.target.value })} /></label>
        <label>Discount (£)<input inputMode="decimal" value={form.discount} onChange={event => setForm({ ...form, discount: event.target.value })} /></label>
        <label className="crm-wide">Description<textarea rows={2} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <div className="crm-wide"><span className="crm-field-label">Line items</span><LineItemsEditor items={form.items} onChange={items => setForm({ ...form, items })} /></div>
        <label className="crm-wide">Terms<textarea rows={2} value={form.terms} onChange={event => setForm({ ...form, terms: event.target.value })} /></label>
        <label className="crm-wide">Notes<textarea rows={2} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="crm-actions"><button type="submit" className="button button-dark crm-small" disabled={saving}>{saving ? 'Saving…' : 'Save quotation'}</button><button type="button" className="button button-outline crm-small" onClick={() => setShowForm(false)}>Cancel</button></div>
      </form>
    </section>}
    <section className="admin-panel admin-records-panel" aria-busy={loading}>
      <div className="panel-heading"><h2>Quotations & contracts</h2><span>{loading ? 'Loading…' : `${quotes.length} record${quotes.length === 1 ? '' : 's'}`}</span></div>
      {loading ? <div className="admin-empty"><p>Loading quotations…</p></div>
        : quotes.length === 0 ? <div className="admin-empty"><p>No quotations yet. Create one and send it for signature.</p></div>
        : <div className="crm-table crm-table-quotes" role="table">
            <div className="crm-row crm-row-head" role="row"><span>Quotation</span><span>Contact</span><span>Total</span><span>Status</span><span>Signing</span><span /></div>
            {quotes.map(quote => <div className="crm-row" role="row" key={quote.id}>
              <span><strong>{quote.quote_reference}{quote.version > 1 ? ` · v${quote.version}` : ''}</strong><small>{quote.title}</small></span>
              <span>{quote.contact_name || '—'}<small>{quote.contact_email || ''}</small></span>
              <span>{gbp(quote.total_pence)}<small>{formatDate(quote.issue_date, false)}</small></span>
              <span><Badge tone={statusTone(quote.status)}>{quote.status}</Badge></span>
              <span><Badge tone={statusTone(quote.sign_status)}>{quote.sign_status.replace('_', ' ')}</Badge>{quote.signed_at && <small>{formatDate(quote.signed_at, true)}</small>}</span>
              <span className="crm-row-actions">
                <button type="button" className="crm-link" onClick={() => void openEdit(quote)}>Edit</button>
                <button type="button" className="crm-link" onClick={() => void send(quote)} disabled={busyId === quote.id}>{busyId === quote.id ? 'Working…' : 'Send'}</button>
                <button type="button" className="crm-link" onClick={() => void revise(quote)} disabled={busyId === quote.id}>Revise</button>
                <button type="button" className="crm-link" onClick={() => void raiseInvoice(quote)} disabled={busyId === quote.id}>Invoice</button>
              </span>
            </div>)}
          </div>}
    </section>
  </div></AdminWorkspaceShell>;
}


