import { FormEvent, useEffect, useState } from 'react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import { api, Badge, formatDate, PageHeader, statusTone } from './CrmShared';

type Contact = {
  id: number;
  reference: string;
  contact_name: string;
  company_name: string | null;
  email: string | null;
  telephone: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  is_lead: number;
  contact_type: string;
  lead_stage: string;
  source: string | null;
  notes: string | null;
  tags: string | null;
  created_at: string;
};

type FormState = {
  contactName: string; companyName: string; email: string; telephone: string; addressLine1: string; city: string; postcode: string;
  contactType: string; leadStage: string; isLead: boolean; source: string; notes: string; tags: string;
};

const blankForm: FormState = {
  contactName: '', companyName: '', email: '', telephone: '', addressLine1: '', city: '', postcode: '',
  contactType: 'lead', leadStage: 'new', isLead: true, source: 'Website', notes: '', tags: '',
};

const CONTACT_TYPES = ['lead', 'prospect', 'customer', 'supplier', 'partner', 'other'];
const LEAD_STAGES = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'];

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const payload = await api<{ records: Contact[] }>('/api/admin/contacts');
      setContacts(payload.records);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Contacts could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setForm(blankForm); setEditingId(null); setShowForm(true); setNotice(''); };

  const openEdit = (contact: Contact) => {
    setForm({
      contactName: contact.contact_name, companyName: contact.company_name || '', email: contact.email || '', telephone: contact.telephone || '',
      addressLine1: contact.address_line1 || '', city: contact.city || '', postcode: contact.postcode || '',
      contactType: contact.contact_type, leadStage: contact.lead_stage, isLead: Boolean(contact.is_lead),
      source: contact.source || '', notes: contact.notes || '', tags: contact.tags || '',
    });
    setEditingId(contact.id);
    setShowForm(true);
    setNotice('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify(form);
      if (editingId) await api(`/api/admin/contacts/${editingId}`, { method: 'PATCH', body });
      else await api('/api/admin/contacts', { method: 'POST', body });
      setNotice(editingId ? 'Contact updated.' : 'Contact created.');
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The contact could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contact: Contact) => {
    if (!window.confirm(`Delete ${contact.contact_name}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/contacts/${contact.id}`, { method: 'DELETE' });
      setNotice('Contact deleted.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The contact could not be deleted.');
    }
  };

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? contacts.filter(contact => [contact.contact_name, contact.company_name, contact.email, contact.reference, contact.telephone].join(' ').toLowerCase().includes(needle))
    : contacts;

  return <AdminWorkspaceShell><div className="admin-content">
    <PageHeader eyebrow="Sales" title="Contacts" intro="Every lead and customer in one place. Quotes, invoices and emails all link back to a contact." action={<button type="button" className="button button-dark crm-small" onClick={openNew}>New contact</button>} />
    {error && <div className="form-status error" role="alert">{error}</div>}
    {notice && <div className="form-status crm-success" role="status">{notice}</div>}
    {showForm && <section className="admin-panel crm-form-panel" aria-labelledby="contact-form-title">
      <div className="panel-heading"><h2 id="contact-form-title">{editingId ? 'Edit contact' : 'New contact'}</h2><button type="button" className="crm-icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div>
      <form className="crm-form" onSubmit={submit}>
        <label>Contact name<input required value={form.contactName} onChange={event => setForm({ ...form, contactName: event.target.value })} /></label>
        <label>Company<input value={form.companyName} onChange={event => setForm({ ...form, companyName: event.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
        <label>Telephone<input value={form.telephone} onChange={event => setForm({ ...form, telephone: event.target.value })} /></label>
        <label>Address<input value={form.addressLine1} onChange={event => setForm({ ...form, addressLine1: event.target.value })} /></label>
        <label>City<input value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></label>
        <label>Postcode<input value={form.postcode} onChange={event => setForm({ ...form, postcode: event.target.value })} /></label>
        <label>Type<select value={form.contactType} onChange={event => setForm({ ...form, contactType: event.target.value })}>{CONTACT_TYPES.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
        <label>Lead stage<select value={form.leadStage} onChange={event => setForm({ ...form, leadStage: event.target.value })}>{LEAD_STAGES.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
        <label>Source<input value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} /></label>
        <label className="crm-checkbox"><input type="checkbox" checked={form.isLead} onChange={event => setForm({ ...form, isLead: event.target.checked })} /> This contact is still a lead</label>
        <label className="crm-wide">Notes<textarea rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
        <div className="crm-actions"><button type="submit" className="button button-dark crm-small" disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</button><button type="button" className="button button-outline crm-small" onClick={() => setShowForm(false)}>Cancel</button></div>
      </form>
    </section>}
    <section className="admin-panel admin-records-panel" aria-busy={loading}>
      <div className="panel-heading"><h2>Contacts</h2><span>{loading ? 'Loading…' : `${visible.length} of ${contacts.length}`}</span></div>
      <label className="crm-search"><span className="sr-only">Search contacts</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, email or reference" /></label>
      {loading ? <div className="admin-empty"><p>Loading contacts…</p></div>
        : visible.length === 0 ? <div className="admin-empty"><p>No contacts yet. Add your first lead or customer.</p></div>
        : <div className="crm-table" role="table">
            <div className="crm-row crm-row-head" role="row"><span>Name</span><span>Contact</span><span>Type</span><span>Stage</span><span>Added</span><span /></div>
            {visible.map(contact => <div className="crm-row" role="row" key={contact.id}>
              <span><strong>{contact.contact_name}</strong>{contact.company_name && <small>{contact.company_name}</small>}</span>
              <span>{contact.email || '—'}<small>{contact.telephone || contact.reference}</small></span>
              <span><Badge>{contact.contact_type}</Badge></span>
              <span><Badge tone={statusTone(contact.lead_stage)}>{contact.lead_stage}</Badge></span>
              <span>{formatDate(contact.created_at)}</span>
              <span className="crm-row-actions"><button type="button" className="crm-link" onClick={() => openEdit(contact)}>Edit</button><button type="button" className="crm-link crm-link-danger" onClick={() => void remove(contact)}>Delete</button></span>
            </div>)}
          </div>}
    </section>
  </div></AdminWorkspaceShell>;
}

