import { FormEvent, useEffect, useState } from 'react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import { api, Badge, emptyLine, formatDate, gbp, itemsToLines, LineItemsEditor, PageHeader, statusTone, toItemsPayload } from './CrmShared';
import type { LineItem } from './CrmShared';

type Invoice = {
  id: number;
  invoice_reference: string;
  customer_name: string;
  customer_email: string | null;
  title: string | null;
  status: string;
  issue_date: string | null;
  due_at: string | null;
  subtotal_pence: number;
  vat_rate: string | number;
  vat_pence: number;
  discount_pence: number;
  total_pence: number;
  paid_at: string | null;
  item_count: number;
  created_at: string;
};

type InvoiceItem = { description: string; quantity: number | string; unit_price_pence: number; amount_pence: number };
type ContactOption = { id: number; contact_name: string; company_name: string | null; email: string | null };

type InvoiceForm = {
  contactId: string; customerName: string; customerEmail: string; customerAddress: string; title: string;
  issueDate: string; dueAt: string; vatRate: string; discount: string; paymentTerms: string; notes: string; items: LineItem[];
};

const today = () => new Date().toISOString().slice(0, 10);

const blankInvoice = (): InvoiceForm => ({
  contactId: '', customerName: '', customerEmail: '', customerAddress: '', title: '',
  issueDate: today(), dueAt: '', vatRate: '0', discount: '0', paymentTerms: 'Payment due within 7 days.', notes: '',
  items: [{ ...emptyLine }],
});

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<InvoiceForm>(blankInvoice());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [invoicePayload, contactPayload] = await Promise.all([
        api<{ records: Invoice[] }>('/api/admin/invoices'),
        api<{ records: ContactOption[] }>('/api/admin/contacts'),
      ]);
      setInvoices(invoicePayload.records);
      setContacts(contactPayload.records);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invoices could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setForm(blankInvoice()); setEditingId(null); setShowForm(true); setNotice(''); };

  const chooseContact = (id: string) => {
    const contact = contacts.find(item => String(item.id) === id);
    setForm(current => ({
      ...current,
      contactId: id,
      customerName: current.customerName || contact?.contact_name || '',
      customerEmail: current.customerEmail || contact?.email || '',
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const items = toItemsPayload(form.items);
    if (!items.length) { setError('Add at least one line item.'); return; }
    setSaving(true);
    setError('');
    const body = JSON.stringify({
      ...(form.contactId ? { contactId: Number(form.contactId) } : {}),
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerAddress: form.customerAddress,
      title: form.title,
      issueDate: form.issueDate,
      dueAt: form.dueAt,
      vatRate: Number(form.vatRate) || 0,
      discountPence: Math.round((Number(form.discount) || 0) * 100),
      paymentTerms: form.paymentTerms,
      notes: form.notes,
      items,
    });
    try {
      if (editingId) await api(`/api/admin/invoices/${editingId}`, { method: 'PATCH', body });
      else await api('/api/admin/invoices', { method: 'POST', body });
      setNotice(editingId ? 'Invoice updated.' : 'Invoice created.');
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invoice could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (invoice: Invoice) => {
    try {
      const payload = await api<{ invoice: Invoice & { customer_address: string | null; payment_terms: string | null; notes: string | null; contact_id: number | null }; items: InvoiceItem[] }>(`/api/admin/invoices/${invoice.id}`);
      setForm({
        contactId: payload.invoice.contact_id ? String(payload.invoice.contact_id) : '',
        customerName: payload.invoice.customer_name,
        customerEmail: payload.invoice.customer_email || '',
        customerAddress: payload.invoice.customer_address || '',
        title: payload.invoice.title || '',
        issueDate: payload.invoice.issue_date || today(),
        dueAt: payload.invoice.due_at || '',
        vatRate: String(payload.invoice.vat_rate),
        discount: ((payload.invoice.discount_pence || 0) / 100).toFixed(2),
        paymentTerms: payload.invoice.payment_terms || '',
        notes: payload.invoice.notes || '',
        items: payload.items.length ? itemsToLines(payload.items) : [{ ...emptyLine }],
      });
      setEditingId(invoice.id);
      setShowForm(true);
      setNotice('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invoice could not be opened.');
    }
  };

  const send = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    setError('');
    try {
      const payload = await api<{ outcome: { status: string } }>(`/api/admin/invoices/${invoice.id}/send`, { method: 'POST', body: '{}' });
      setNotice(payload.outcome.status === 'sent'
        ? `Invoice ${invoice.invoice_reference} emailed with the PDF attached.`
        : payload.outcome.status === 'not-configured'
          ? 'Email is not configured yet — the message is queued in the email log. Add SMTP settings to send it.'
          : 'The invoice could not be emailed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invoice could not be emailed.');
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (invoice: Invoice) => {
    setBusyId(invoice.id);
    setError('');
    try {
      await api(`/api/admin/invoices/${invoice.id}/paid`, { method: 'POST', body: '{}' });
      setNotice(`Invoice ${invoice.invoice_reference} marked as paid.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invoice could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  return <AdminWorkspaceShell><div className="admin-content">
    <PageHeader eyebrow="Sales" title="Invoices" intro="Raise line-item invoices (including stage payments), email them with a PDF and track payment." action={<button type="button" className="button button-dark crm-small" onClick={openNew}>New invoice</button>} />
    {error && <div className="form-status error" role="alert">{error}</div>}
    {notice && <div className="form-status crm-success" role="status">{notice}</div>}
    {showForm && <section className="admin-panel crm-form-panel" aria-labelledby="invoice-form-title">
      <div className="panel-heading"><h2 id="invoice-form-title">{editingId ? 'Edit invoice' : 'New invoice'}</h2><button type="button" className="crm-icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
      <form className="crm-form" onSubmit={submit}>
        <label className="crm-wide">Link to contact (optional)<select value={form.contactId} onChange={event => chooseContact(event.target.value)}><option value="">No linked contact</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.contact_name}{contact.company_name ? ` — ${contact.company_name}` : ''}</option>)}</select></label>
        <label>Customer name<input required value={form.customerName} onChange={event => setForm({ ...form, customerName: event.target.value })} /></label>
        <label>Customer email<input type="email" value={form.customerEmail} onChange={event => setForm({ ...form, customerEmail: event.target.value })} /></label>
        <label className="crm-wide">Customer address<textarea rows={2} value={form.customerAddress} onChange={event => setForm({ ...form, customerAddress: event.target.value })} /></label>
        <label className="crm-wide">Title<input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Stage 2 payment — 68 Woodham Road" /></label>
        <label>Issue date<input type="date" value={form.issueDate} onChange={event => setForm({ ...form, issueDate: event.target.value })} /></label>
        <label>Due date<input type="date" value={form.dueAt} onChange={event => setForm({ ...form, dueAt: event.target.value })} /></label>
        <label>VAT rate (%)<input inputMode="decimal" value={form.vatRate} onChange={event => setForm({ ...form, vatRate: event.target.value })} /></label>
        <label>Discount (£)<input inputMode="decimal" value={form.discount} onChange={event => setForm({ ...form, discount: event.target.value })} /></label>
        <div className="crm-wide"><span className="crm-field-label">Line items</span><LineItemsEditor items={form.items} onChange={items => setForm({ ...form, items })} /></div>
        <label className="crm-wide">Payment terms<textarea rows={2} value={form.paymentTerms} onChange={event => setForm({ ...form, paymentTerms: event.target.value })} /></label>
        <label className="crm-wide">Notes<textarea rows={2} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="crm-actions"><button type="submit" className="button button-dark crm-small" disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</button><button type="button" className="button button-outline crm-small" onClick={() => setShowForm(false)}>Cancel</button></div>
      </form>
    </section>}
    <section className="admin-panel admin-records-panel" aria-busy={loading}>
      <div className="panel-heading"><h2>Invoices</h2><span>{loading ? 'Loading…' : `${invoices.length} record${invoices.length === 1 ? '' : 's'}`}</span></div>
      {loading ? <div className="admin-empty"><p>Loading invoices…</p></div>
        : invoices.length === 0 ? <div className="admin-empty"><p>No invoices yet. Create one directly or raise it from a signed quotation.</p></div>
        : <div className="crm-table crm-table-invoices" role="table">
            <div className="crm-row crm-row-head" role="row"><span>Invoice</span><span>Customer</span><span>Total</span><span>Status</span><span>Due</span><span /></div>
            {invoices.map(invoice => <div className="crm-row" role="row" key={invoice.id}>
              <span><strong>{invoice.invoice_reference}</strong><small>{invoice.title || `${invoice.item_count} line item${invoice.item_count === 1 ? '' : 's'}`}</small></span>
              <span>{invoice.customer_name}<small>{invoice.customer_email || ''}</small></span>
              <span>{gbp(invoice.total_pence)}<small>VAT {gbp(invoice.vat_pence)}</small></span>
              <span><Badge tone={statusTone(invoice.status)}>{invoice.status}</Badge>{invoice.paid_at && <small>Paid {formatDate(invoice.paid_at, false)}</small>}</span>
              <span>{formatDate(invoice.due_at, false) || '—'}</span>
              <span className="crm-row-actions">
                <button type="button" className="crm-link" onClick={() => void openEdit(invoice)}>Edit</button>
                <button type="button" className="crm-link" onClick={() => void send(invoice)} disabled={busyId === invoice.id}>{busyId === invoice.id ? 'Working…' : 'Send'}</button>
                {invoice.status !== 'paid' && <button type="button" className="crm-link" onClick={() => void markPaid(invoice)} disabled={busyId === invoice.id}>Mark paid</button>}
              </span>
            </div>)}
          </div>}
    </section>
  </div></AdminWorkspaceShell>;
}


