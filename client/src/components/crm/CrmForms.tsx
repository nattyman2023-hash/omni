import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  Invoice, Lead, Quote, STAGE_LABELS, STAGES, Stage, StaffMember, Task, Visit,
  crm, fromLocalInput, parsePounds, penceToInput, toLocalInput, useCrm,
} from './crmApi';

/** Accessible modal built on <dialog>: focus is trapped by the browser and Escape closes it. */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`crm-modal${wide ? ' crm-modal-wide' : ''}`} aria-labelledby="crm-modal-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="crm-modal-head"><h2 id="crm-modal-title">{title}</h2><button type="button" className="crm-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <div className="crm-modal-body">{children}</div>
  </dialog>;
}

export function Field({ label, children, hint, full = false }: { label: string; children: ReactNode; hint?: string; full?: boolean }) {
  return <label className={`crm-field${full ? ' crm-field-full' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function useSubmit(onSaved: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const run = async (event: FormEvent, action: () => Promise<unknown>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try { await action(); onSaved(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save.'); } finally { setSaving(false); }
  };
  return { saving, error, setError, run };
}

function FormActions({ saving, error, onCancel, label }: { saving: boolean; error: string; onCancel: () => void; label: string }) {
  return <>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : label}</button></div>
  </>;
}

export function StaffSelect({ value, onChange, id }: { value: number | null; onChange: (value: number | null) => void; id?: string }) {
  const { data } = useCrm<{ staff: StaffMember[] }>('/staff');
  return <select id={id} value={value === null ? '' : String(value)} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}>
    <option value="">Unassigned</option>
    {data?.staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
  </select>;
}

export function LeadSelect({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { data, loading } = useCrm<{ records: Lead[] }>('/leads');
  return <select required value={value === null ? '' : String(value)} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}>
    <option value="">{loading ? 'Loading leads…' : 'Choose a lead'}</option>
    {data?.records.map(lead => <option key={lead.id} value={lead.id}>{lead.name}{lead.postcode ? ` · ${lead.postcode}` : ''} ({lead.reference})</option>)}
  </select>;
}

/* ---------- Leads ---------- */
type LeadDraft = { name: string; email: string; phone: string; postcode: string; address: string; projectType: string; propertyType: string; budget: string; desiredStart: string; description: string; preferredContact: string; value: string; assignedUserId: number | null; stage: Stage };
const leadDraft = (lead?: Lead): LeadDraft => ({ name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', postcode: lead?.postcode || '', address: lead?.address || '', projectType: lead?.projectType || '', propertyType: lead?.propertyType || '', budget: lead?.budget || '', desiredStart: lead?.desiredStart || '', description: lead?.description || '', preferredContact: lead?.preferredContact || '', value: penceToInput(lead?.valuePence), assignedUserId: lead?.assignedUserId ?? null, stage: lead?.stage || 'new' });

export function LeadForm({ lead, onSaved, onCancel }: { lead?: Lead; onSaved: (lead: Lead) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(() => leadDraft(lead));
  const saved = useRef<Lead | null>(null);
  const { saving, error, setError, run } = useSubmit(() => { if (saved.current) onSaved(saved.current); });
  const set = (key: keyof LeadDraft) => (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    const valuePence = parsePounds(draft.value);
    if (Number.isNaN(valuePence)) { event.preventDefault(); setError('Enter the estimated value as an amount, for example 25000.'); return; }
    const { value: _value, stage, ...fields } = draft;
    const body = { ...fields, valuePence, ...(lead ? {} : { stage }) };
    void run(event, async () => {
      const result = await crm<{ lead: Lead }>(lead ? `/leads/${lead.id}` : '/leads', { method: lead ? 'PATCH' : 'POST', body });
      saved.current = result.lead;
    });
  };
  return <form className="crm-form" onSubmit={submit}>
    <div className="crm-form-grid">
      <Field label="Customer name"><input required maxLength={120} value={draft.name} onChange={set('name')} autoComplete="off" /></Field>
      <Field label="Phone"><input type="tel" maxLength={40} value={draft.phone} onChange={set('phone')} /></Field>
      <Field label="Email"><input type="email" maxLength={190} value={draft.email} onChange={set('email')} /></Field>
      <Field label="Preferred contact"><select value={draft.preferredContact} onChange={set('preferredContact')}><option value="">Not stated</option>{['Phone', 'Email', 'WhatsApp', 'Text'].concat(draft.preferredContact && !['Phone', 'Email', 'WhatsApp', 'Text'].includes(draft.preferredContact) ? [draft.preferredContact] : []).map(option => <option key={option}>{option}</option>)}</select></Field>
      <Field label="Postcode"><input maxLength={20} value={draft.postcode} onChange={set('postcode')} /></Field>
      <Field label="Address"><input maxLength={255} value={draft.address} onChange={set('address')} /></Field>
      <Field label="Project type"><input maxLength={120} value={draft.projectType} onChange={set('projectType')} placeholder="e.g. Rear extension" /></Field>
      <Field label="Property type"><input maxLength={120} value={draft.propertyType} onChange={set('propertyType')} /></Field>
      <Field label="Budget (customer's words)"><input maxLength={100} value={draft.budget} onChange={set('budget')} /></Field>
      <Field label="Desired start"><input maxLength={100} value={draft.desiredStart} onChange={set('desiredStart')} /></Field>
      <Field label="Estimated value (£)" hint="Your estimate, used for pipeline value."><input inputMode="decimal" value={draft.value} onChange={set('value')} placeholder="25000" /></Field>
      <Field label="Assigned to"><StaffSelect value={draft.assignedUserId} onChange={value => setDraft(current => ({ ...current, assignedUserId: value }))} /></Field>
      {!lead && <Field label="Stage"><select value={draft.stage} onChange={set('stage')}>{STAGES.map(stage => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}</select></Field>}
      <Field label="Project details" full><textarea rows={4} maxLength={8000} value={draft.description} onChange={set('description')} /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={lead ? 'Save changes' : 'Add lead'} />
  </form>;
}

/* ---------- Site visits ---------- */
export function VisitForm({ visit, leadId, defaultAddress = '', onSaved, onCancel }: { visit?: Visit; leadId?: number; defaultAddress?: string; onSaved: () => void; onCancel: () => void }) {
  const [lead, setLead] = useState<number | null>(visit?.leadId ?? leadId ?? null);
  const [when, setWhen] = useState(toLocalInput(visit?.scheduledAt));
  const [duration, setDuration] = useState(String(visit?.durationMinutes || 60));
  const [address, setAddress] = useState(visit?.address ?? defaultAddress);
  const [notes, setNotes] = useState(visit?.notes || '');
  const [assigned, setAssigned] = useState<number | null>(visit?.assignedUserId ?? null);
  const { saving, error, run } = useSubmit(onSaved);
  return <form className="crm-form" onSubmit={event => run(event, async () => {
    const body = { scheduledAt: fromLocalInput(when), durationMinutes: Number(duration), address, notes, assignedUserId: assigned };
    if (visit) await crm(`/visits/${visit.id}`, { method: 'PATCH', body });
    else await crm('/visits', { method: 'POST', body: { ...body, leadId: lead } });
  })}>
    <div className="crm-form-grid">
      {!visit && leadId === undefined && <Field label="Lead" full><LeadSelect value={lead} onChange={setLead} /></Field>}
      <Field label="Date and time"><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></Field>
      <Field label="Duration"><select value={duration} onChange={event => setDuration(event.target.value)}>{[30, 45, 60, 90, 120, 180].map(minutes => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes === 60 ? '' : 's'}`}</option>)}</select></Field>
      <Field label="Address" full><input maxLength={255} value={address} onChange={event => setAddress(event.target.value)} placeholder="Leave blank to use the lead's address" /></Field>
      <Field label="Attending"><StaffSelect value={assigned} onChange={setAssigned} /></Field>
      <Field label="Notes" full><textarea rows={3} maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Access, parking, what to measure…" /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={visit ? 'Save visit' : 'Book visit'} />
  </form>;
}

/* ---------- Tasks ---------- */
export function TaskForm({ task, leadId, onSaved, onCancel }: { task?: Task; leadId?: number; onSaved: () => void; onCancel: () => void }) {
  const [lead, setLead] = useState<number | null>(task?.leadId ?? leadId ?? null);
  const [title, setTitle] = useState(task?.title || '');
  const [due, setDue] = useState(toLocalInput(task?.dueAt));
  const [notes, setNotes] = useState(task?.notes || '');
  const [assigned, setAssigned] = useState<number | null>(task?.assignedUserId ?? null);
  const { saving, error, run } = useSubmit(onSaved);
  return <form className="crm-form" onSubmit={event => run(event, async () => {
    const body = { title, dueAt: fromLocalInput(due), notes, assignedUserId: assigned };
    if (task) await crm(`/tasks/${task.id}`, { method: 'PATCH', body });
    else await crm('/tasks', { method: 'POST', body: { ...body, leadId: lead } });
  })}>
    <div className="crm-form-grid">
      <Field label="Task" full><input required maxLength={190} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Call back with revised price" /></Field>
      {!task && leadId === undefined && <Field label="Lead (optional)" full><OptionalLeadSelect value={lead} onChange={setLead} /></Field>}
      <Field label="Due"><input type="datetime-local" value={due} onChange={event => setDue(event.target.value)} /></Field>
      <Field label="Assigned to"><StaffSelect value={assigned} onChange={setAssigned} /></Field>
      <Field label="Notes" full><textarea rows={3} maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={task ? 'Save task' : 'Add task'} />
  </form>;
}

function OptionalLeadSelect({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const { data } = useCrm<{ records: Lead[] }>('/leads');
  return <select value={value === null ? '' : String(value)} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}>
    <option value="">Not linked to a lead</option>
    {data?.records.map(lead => <option key={lead.id} value={lead.id}>{lead.name} ({lead.reference})</option>)}
  </select>;
}

/* ---------- Quotes ---------- */
export function QuoteForm({ quote, leadId, onSaved, onCancel }: { quote?: Quote; leadId?: number; onSaved: () => void; onCancel: () => void }) {
  const [lead, setLead] = useState<number | null>(quote?.leadId ?? leadId ?? null);
  const [title, setTitle] = useState(quote?.title || '');
  const [amount, setAmount] = useState(penceToInput(quote?.amountPence));
  const [validUntil, setValidUntil] = useState(quote?.validUntil || '');
  const [notes, setNotes] = useState(quote?.notes || '');
  const [status, setStatus] = useState<Quote['status']>(quote?.status || 'draft');
  const { saving, error, setError, run } = useSubmit(onSaved);
  return <form className="crm-form" onSubmit={event => {
    const amountPence = parsePounds(amount);
    if (amountPence === null || Number.isNaN(amountPence)) { event.preventDefault(); setError('Enter the quote amount, for example 18500.'); return; }
    void run(event, async () => {
      const body = { title, amountPence, validUntil: validUntil || null, notes, status };
      if (quote) await crm(`/quotes/${quote.id}`, { method: 'PATCH', body });
      else await crm('/quotes', { method: 'POST', body: { ...body, leadId: lead } });
    });
  }}>
    <div className="crm-form-grid">
      {!quote && leadId === undefined && <Field label="Lead" full><LeadSelect value={lead} onChange={setLead} /></Field>}
      <Field label="Work quoted" full><input required maxLength={190} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Single-storey rear extension" /></Field>
      <Field label="Amount (£)"><input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="18500" /></Field>
      <Field label="Valid until"><input type="date" value={validUntil} onChange={event => setValidUntil(event.target.value)} /></Field>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value as Quote['status'])}><option value="draft">Draft</option><option value="sent">Sent to customer</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></Field>
      <Field label="Notes / inclusions" full><textarea rows={4} maxLength={8000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={quote ? 'Save quote' : 'Create quote'} />
  </form>;
}

/* ---------- Invoices ---------- */
export function InvoiceForm({ invoice, leadId, quotes = [], onSaved, onCancel }: { invoice?: Invoice; leadId?: number; quotes?: Quote[]; onSaved: () => void; onCancel: () => void }) {
  const [lead, setLead] = useState<number | null>(invoice?.leadId ?? leadId ?? null);
  const [quoteId, setQuoteId] = useState<number | null>(invoice?.quoteId ?? null);
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [amount, setAmount] = useState(penceToInput(invoice?.amountPence));
  const [dueAt, setDueAt] = useState(invoice?.dueAt || '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [status, setStatus] = useState<Invoice['status']>(invoice?.status || 'draft');
  const { saving, error, setError, run } = useSubmit(onSaved);
  const pickQuote = (value: string) => {
    const id = value ? Number(value) : null;
    setQuoteId(id);
    const quote = quotes.find(item => item.id === id);
    if (quote && !amount) setAmount(penceToInput(quote.amountPence));
  };
  return <form className="crm-form" onSubmit={event => {
    const amountPence = parsePounds(amount);
    if (amountPence === null || Number.isNaN(amountPence)) { event.preventDefault(); setError('Enter the invoice amount.'); return; }
    void run(event, async () => {
      const body = { amountPence, dueAt: dueAt || null, notes, status, ...(customerName ? { customerName } : {}) };
      if (invoice) await crm(`/invoices/${invoice.id}`, { method: 'PATCH', body });
      else await crm('/invoices', { method: 'POST', body: { ...body, leadId: lead, quoteId } });
    });
  }}>
    <div className="crm-form-grid">
      {!invoice && leadId === undefined && <Field label="Lead" full><OptionalLeadSelect value={lead} onChange={setLead} /></Field>}
      {!invoice && quotes.length > 0 && <Field label="For quote" full><select value={quoteId === null ? '' : String(quoteId)} onChange={event => pickQuote(event.target.value)}><option value="">Not linked to a quote</option>{quotes.map(quote => <option key={quote.id} value={quote.id}>{quote.reference} · {quote.title}</option>)}</select></Field>}
      <Field label="Customer name" hint={invoice ? undefined : 'Leave blank to use the lead name.'}><input maxLength={190} value={customerName} onChange={event => setCustomerName(event.target.value)} required={Boolean(invoice) || lead === null} /></Field>
      <Field label="Amount (£)"><input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="5000" /></Field>
      <Field label="Due date"><input type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} /></Field>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value as Invoice['status'])}><option value="draft">Draft</option><option value="issued">Issued</option><option value="paid">Paid</option><option value="void">Void</option></select></Field>
      <Field label="Notes" full><textarea rows={3} maxLength={8000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="e.g. Stage payment 1 of 3" /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={invoice ? 'Save invoice' : 'Create invoice'} />
  </form>;
}
