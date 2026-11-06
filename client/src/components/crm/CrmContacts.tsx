import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, ContactType, Lead, STAGE_LABELS, crm, formatDay, useCrm } from './crmApi';
import { ContactTypeSelect, Field, Modal } from './CrmForms';
import { Empty, ErrorNote, Loading, PageTitle, StatusBadge, errorText } from './CrmUi';

/** Every person or company in the CRM. Leads stay the single customer record; this is a people-first view of them. */
export function ContactsPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<ContactType | ''>('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, error, loading } = useCrm<{ records: Lead[] }>(`/leads${type ? `?type=${type}` : ''}`);
  const needle = query.trim().toLowerCase();
  const digits = needle.replace(/[^\d]/g, '');
  const contacts = (data?.records || []).filter(lead => !needle
    || [lead.name, lead.email, lead.companyName, lead.reference].join(' ').toLowerCase().includes(needle)
    || (digits.length >= 3 && (lead.phone || '').replace(/[^\d]/g, '').includes(digits)));

  return <AdminWorkspaceShell search={{ value: query, onChange: setQuery, label: 'Search contacts by name, company, email or phone…' }}><div className="admin-content">
    <PageTitle eyebrow="Contacts" title="Contacts" intro="Everyone in the CRM — customers, prospects and suppliers — whatever stage they are at." actions={<button type="button" className="crm-button" onClick={() => setCreating(true)}><Plus size={16} /> Add contact</button>} />
    <ErrorNote message={error} />
    <div className="crm-tabs" role="tablist" aria-label="Filter by contact type">
      <button type="button" role="tab" aria-selected={type === ''} onClick={() => setType('')}>All</button>
      {CONTACT_TYPES.map(option => <button type="button" role="tab" key={option} aria-selected={type === option} onClick={() => setType(option)}>{CONTACT_TYPE_LABELS[option]}</button>)}
    </div>
    <section className="admin-panel crm-panel">
      {loading && !data ? <Loading /> : !contacts.length
        ? <Empty icon={<Users size={22} />} title={data?.records.length ? 'No matching contacts' : 'No contacts yet'}>{data?.records.length ? 'Try another search or type.' : 'Website enquiries appear here automatically. You can also add a contact by hand.'}</Empty>
        : <div className="crm-table-wrap"><table className="crm-table crm-contacts-table"><thead><tr><th>Name</th><th>Company</th><th>Type</th><th>Email</th><th>Phone</th><th>Stage</th><th>Added</th></tr></thead><tbody>
          {contacts.map(lead => <tr key={lead.id} className="crm-row-link" onClick={() => navigate(`/staff/leads/${lead.id}`)}>
            <td><Link to={`/staff/leads/${lead.id}`} onClick={event => event.stopPropagation()}><strong>{lead.name}</strong></Link><small>{lead.reference}</small></td>
            <td>{lead.companyName || '—'}</td>
            <td><StatusBadge status={`type-${lead.contactType || 'prospect'}`} label={CONTACT_TYPE_LABELS[lead.contactType] || 'Prospect'} /></td>
            <td>{lead.email ? <a href={`mailto:${lead.email}`} onClick={event => event.stopPropagation()}>{lead.email}</a> : '—'}</td>
            <td>{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} onClick={event => event.stopPropagation()}>{lead.phone}</a> : '—'}</td>
            <td><span className={`crm-badge crm-stage-${lead.stage}`}>{STAGE_LABELS[lead.stage] || lead.stage}</span></td>
            <td>{formatDay(lead.createdAt)}</td>
          </tr>)}
        </tbody></table></div>}
    </section>
    {creating && <Modal title="Add contact" wide onClose={() => setCreating(false)}><ContactForm onCancel={() => setCreating(false)} onSaved={lead => navigate(`/staff/leads/${lead.id}`)} /></Modal>}
  </div></AdminWorkspaceShell>;
}

type ContactDraft = { name: string; companyName: string; contactType: ContactType; email: string; phone: string; address: string; postcode: string; description: string };

export function ContactForm({ onSaved, onCancel }: { onSaved: (lead: Lead) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ContactDraft>({ name: '', companyName: '', contactType: 'prospect', email: '', phone: '', address: '', postcode: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof ContactDraft) => (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    // Mirrors the API: a name plus at least one way to get in touch.
    if (!draft.name.trim()) { setError('Enter the contact’s name.'); return; }
    if (!draft.email.trim() && !draft.phone.trim()) { setError('Add an email address or a phone number so the contact can be reached.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = { ...Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])), source: 'manual' };
      const result = await crm<{ lead: Lead }>('/leads', { method: 'POST', body });
      onSaved(result.lead);
    } catch (reason) {
      setError(errorText(reason, 'Could not add the contact.'));
    } finally {
      setSaving(false);
    }
  };
  return <form className="crm-form" onSubmit={submit} noValidate>
    <div className="crm-form-grid">
      <Field label="Name"><input required maxLength={120} value={draft.name} onChange={set('name')} autoComplete="off" /></Field>
      <Field label="Company (optional)"><input maxLength={190} value={draft.companyName} onChange={set('companyName')} autoComplete="off" /></Field>
      <Field label="Contact type"><ContactTypeSelect value={draft.contactType} onChange={contactType => setDraft(current => ({ ...current, contactType }))} /></Field>
      <Field label="Email" hint="Email or phone is required."><input type="email" maxLength={190} value={draft.email} onChange={set('email')} autoComplete="off" /></Field>
      <Field label="Phone"><input type="tel" maxLength={40} value={draft.phone} onChange={set('phone')} autoComplete="off" /></Field>
      <Field label="Postcode"><input maxLength={20} value={draft.postcode} onChange={set('postcode')} /></Field>
      <Field label="Address" full><input maxLength={255} value={draft.address} onChange={set('address')} /></Field>
      <Field label="Notes" full><textarea rows={3} maxLength={8000} value={draft.description} onChange={set('description')} placeholder="How you know them, what they need…" /></Field>
    </div>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : 'Add contact'}</button></div>
  </form>;
}
