import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  CONTACT_TYPES, CONTACT_TYPE_LABELS, CompanySettings, ContactType, Invoice, InvoiceStatus, Lead, LineItem, Quote, QuoteStatus, STAGE_LABELS, STAGES, Stage, StaffMember, Task, Visit,
  addDays, crm, formatMoney, formatPercent, formatQuantity, fromLocalInput, leadAddress, lineTotals, parsePounds, penceToInput, toLocalInput, todayIso, useCrm,
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

export function ContactTypeSelect({ value, onChange, id }: { value: ContactType; onChange: (value: ContactType) => void; id?: string }) {
  return <select id={id} value={value} onChange={event => onChange(event.target.value as ContactType)}>{CONTACT_TYPES.map(type => <option key={type} value={type}>{CONTACT_TYPE_LABELS[type]}</option>)}</select>;
}

/* ---------- Leads ---------- */
type LeadDraft = { name: string; email: string; phone: string; postcode: string; address: string; projectType: string; propertyType: string; budget: string; desiredStart: string; description: string; preferredContact: string; value: string; assignedUserId: number | null; stage: Stage; companyName: string; contactType: ContactType };
const leadDraft = (lead?: Lead): LeadDraft => ({ companyName: lead?.companyName || '', contactType: lead?.contactType || 'prospect', name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '', postcode: lead?.postcode || '', address: lead?.address || '', projectType: lead?.projectType || '', propertyType: lead?.propertyType || '', budget: lead?.budget || '', desiredStart: lead?.desiredStart || '', description: lead?.description || '', preferredContact: lead?.preferredContact || '', value: penceToInput(lead?.valuePence), assignedUserId: lead?.assignedUserId ?? null, stage: lead?.stage || 'new' });

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
      <Field label="Company (optional)"><input maxLength={190} value={draft.companyName} onChange={set('companyName')} autoComplete="off" /></Field>
      <Field label="Contact type"><ContactTypeSelect value={draft.contactType} onChange={contactType => setDraft(current => ({ ...current, contactType }))} /></Field>
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

/* ---------- Line items (quotes and invoices) ---------- */
type ItemRow = { key: number; description: string; quantity: string; unitPrice: string };
type ItemsInput = Array<{ description: string; quantity: number; unitPricePence: number }>;
let nextRowKey = 0;
const toRow = (item?: Partial<LineItem>): ItemRow => ({ key: ++nextRowKey, description: item?.description || '', quantity: item?.quantity !== undefined ? formatQuantity(item.quantity) : '1', unitPrice: penceToInput(item?.unitPricePence) });
const isBlankRow = (row: ItemRow) => !row.description.trim() && !row.unitPrice.trim() && (!row.quantity.trim() || row.quantity.trim() === '1');

/** Up to 2 decimals, greater than zero; NaN otherwise. */
function parseQuantity(value: string) {
  const cleaned = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0) return Number.NaN;
  return Number(cleaned);
}

/** VAT % 0–100 with up to 2 decimals; null when blank, NaN when invalid. */
function parseVat(value: string) {
  const cleaned = value.replace(/[%\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) > 100) return Number.NaN;
  return Number(cleaned);
}

/**
 * Editable line items plus VAT. Records saved before line items existed (or with a single
 * line) open as one row, so they edit cleanly. New records take the company default VAT.
 */
function useLineItems(existing: { items?: LineItem[]; amountPence: number; vatRatePercent?: number; description: string } | null) {
  const [rows, setRows] = useState<ItemRow[]>(() => {
    if (existing?.items?.length) return existing.items.map(item => toRow(item));
    if (existing) return [toRow({ description: existing.description, quantity: 1, unitPricePence: existing.amountPence })];
    return [toRow()];
  });
  const [vat, setVatValue] = useState(existing ? String(existing.vatRatePercent ?? 0) : '');
  const vatTouched = useRef(Boolean(existing));
  const settings = useCrm<{ settings: CompanySettings }>(existing ? null : '/settings');
  useEffect(() => {
    if (!vatTouched.current && settings.data?.settings) setVatValue(String(settings.data.settings.defaultVatRatePercent ?? 0));
  }, [settings.data]);
  const setVat = (value: string) => { vatTouched.current = true; setVatValue(value); };

  /** Replace the rows (e.g. copying a quote onto a new invoice). */
  const replace = (items: LineItem[], vatRatePercent: number) => {
    setRows(items.length ? items.map(item => toRow(item)) : [toRow()]);
    setVat(String(vatRatePercent ?? 0));
  };

  /** Valid payload, or a message explaining what to fix. */
  const validate = (): string | { items: ItemsInput; vatRatePercent: number | null } => {
    const filled = rows.filter(row => !isBlankRow(row));
    if (!filled.length) return 'Add at least one line item with a description and price.';
    const items: ItemsInput = [];
    for (const [index, row] of filled.entries()) {
      const label = `Line ${index + 1}`;
      if (!row.description.trim()) return `${label}: add a description.`;
      const quantity = parseQuantity(row.quantity);
      if (Number.isNaN(quantity)) return `${label}: enter a quantity greater than 0 (up to 2 decimal places).`;
      const unitPricePence = parsePounds(row.unitPrice);
      if (unitPricePence === null || Number.isNaN(unitPricePence)) return `${label}: enter a unit price in pounds, for example 1250.`;
      items.push({ description: row.description.trim(), quantity, unitPricePence });
    }
    const vatRatePercent = parseVat(vat);
    if (Number.isNaN(vatRatePercent)) return 'Enter VAT as a percentage between 0 and 100, for example 20.';
    return { items, vatRatePercent };
  };

  const isEmpty = rows.every(isBlankRow);
  return { rows, setRows, vat, setVat, replace, validate, isEmpty, settings: settings.data?.settings };
}

type LineItemsState = ReturnType<typeof useLineItems>;

export function LineItemsEditor({ lines, disabled = false, caption = 'Line items' }: { lines: LineItemsState; disabled?: boolean; caption?: string }) {
  const { rows, setRows, vat, setVat } = lines;
  const update = (key: number, field: 'description' | 'quantity' | 'unitPrice', value: string) => setRows(current => current.map(row => row.key === key ? { ...row, [field]: value } : row));
  const remove = (key: number) => setRows(current => current.length > 1 ? current.filter(row => row.key !== key) : [toRow()]);
  const add = () => setRows(current => [...current, toRow()]);
  const amounts = rows.map(row => {
    const quantity = parseQuantity(row.quantity);
    const unit = parsePounds(row.unitPrice);
    return Number.isNaN(quantity) || unit === null || Number.isNaN(unit) ? null : Math.round(quantity * unit);
  });
  const vatValue = parseVat(vat);
  const vatOk = vatValue !== null && !Number.isNaN(vatValue);
  const totals = lineTotals(amounts.map(amount => ({ quantity: 1, unitPricePence: amount ?? 0 })), vatOk ? vatValue : 0);

  return <fieldset className="crm-items" disabled={disabled}>
    <legend>{caption}</legend>
    <div className="crm-items-head" aria-hidden="true"><span>Description</span><span>Qty</span><span>Unit price (£)</span><span>Amount</span><span /></div>
    <ol className="crm-items-rows">
      {rows.map((row, index) => <li key={row.key} className="crm-items-row">
        <label className="crm-items-desc"><span className="crm-items-label">Description, line {index + 1}</span><input maxLength={500} value={row.description} onChange={event => update(row.key, 'description', event.target.value)} placeholder="e.g. Supply and fit steel beam" /></label>
        <label className="crm-items-qty"><span className="crm-items-label">Qty</span><input inputMode="decimal" value={row.quantity} onChange={event => update(row.key, 'quantity', event.target.value)} aria-label={`Quantity, line ${index + 1}`} /></label>
        <label className="crm-items-price"><span className="crm-items-label">Unit price (£)</span><input inputMode="decimal" value={row.unitPrice} onChange={event => update(row.key, 'unitPrice', event.target.value)} placeholder="0.00" aria-label={`Unit price in pounds, line ${index + 1}`} /></label>
        <output className="crm-items-amount" aria-label={`Amount, line ${index + 1}`}>{amounts[index] === null ? '—' : formatMoney(amounts[index])}</output>
        {!disabled && <button type="button" className="crm-icon-button crm-items-remove" onClick={() => remove(row.key)} aria-label={`Remove line ${index + 1}`}><Trash2 size={15} /></button>}
      </li>)}
    </ol>
    {!disabled && <button type="button" className="crm-button crm-button-ghost crm-button-small crm-items-add" onClick={add}><Plus size={14} /> Add line</button>}
    <div className="crm-items-footer">
      <label className="crm-items-vat"><span>VAT %</span><input inputMode="decimal" value={vat} onChange={event => setVat(event.target.value)} placeholder="20" /></label>
      <dl className="crm-items-totals" aria-live="polite">
        <div><dt>Subtotal</dt><dd>{formatMoney(totals.subtotalPence)}</dd></div>
        <div><dt>VAT{vatOk ? ` (${formatPercent(vatValue)})` : ''}</dt><dd>{formatMoney(totals.vatPence)}</dd></div>
        <div className="crm-items-grand"><dt>Total</dt><dd>{formatMoney(totals.totalPence)}</dd></div>
      </dl>
    </div>
  </fieldset>;
}

/* ---------- Customer block (quotes and invoices) ---------- */
type CustomerDraft = { customerName: string; customerCompany: string; customerAddress: string; customerEmail: string };
const customerFromLead = (lead: Lead): CustomerDraft => ({ customerName: lead.name || '', customerCompany: lead.companyName || '', customerAddress: leadAddress(lead), customerEmail: lead.email || '' });

/**
 * Customer details printed on the document. New documents are pre-filled from the chosen
 * lead (and follow it if the lead changes) until staff edit a field themselves.
 */
function useCustomer(record: Partial<CustomerDraft> | undefined, lead: Lead | undefined) {
  const [customer, setCustomer] = useState<CustomerDraft>(() => record
    ? { customerName: record.customerName || '', customerCompany: record.customerCompany || '', customerAddress: record.customerAddress || '', customerEmail: record.customerEmail || '' }
    : lead ? customerFromLead(lead) : { customerName: '', customerCompany: '', customerAddress: '', customerEmail: '' });
  const touched = useRef(Boolean(record));
  useEffect(() => {
    if (!touched.current && lead) setCustomer(customerFromLead(lead));
  }, [lead]);
  const set = (key: keyof CustomerDraft) => (event: { target: { value: string } }) => { touched.current = true; setCustomer(current => ({ ...current, [key]: event.target.value })); };
  /** Fields for the request body: every field when editing, only filled ones when creating (the server defaults the rest from the lead). */
  const body = (editing: boolean) => editing ? { ...customer } : Object.fromEntries(Object.entries(customer).filter(([, value]) => value.trim())) as Partial<CustomerDraft>;
  return { customer, set, body };
}

function CustomerFields({ state, disabled = false }: { state: ReturnType<typeof useCustomer>; disabled?: boolean }) {
  const { customer, set } = state;
  return <fieldset className="crm-subfieldset crm-field-full" disabled={disabled}>
    <legend>Customer details</legend>
    <p className="crm-muted">Printed on the PDF. Filled in from the lead — change them here if this document should show something different.</p>
    <div className="crm-form-grid">
      <Field label="Customer name"><input maxLength={190} value={customer.customerName} onChange={set('customerName')} autoComplete="off" /></Field>
      <Field label="Company"><input maxLength={190} value={customer.customerCompany} onChange={set('customerCompany')} autoComplete="off" /></Field>
      <Field label="Customer email" hint="Where the document is emailed."><input type="email" maxLength={190} value={customer.customerEmail} onChange={set('customerEmail')} autoComplete="off" /></Field>
      <Field label="Customer address" full><textarea rows={3} maxLength={500} value={customer.customerAddress} onChange={set('customerAddress')} /></Field>
    </div>
  </fieldset>;
}

/** The lead a new document is for: the one passed in, or the chosen one from the leads list. */
function useChosenLead(leadId: number | null, given: Lead | undefined, creating: boolean) {
  const list = useCrm<{ records: Lead[] }>(creating && !given ? '/leads' : null);
  if (given && given.id === leadId) return given;
  return list.data?.records.find(item => item.id === leadId);
}

/* ---------- Quotes ---------- */
export const quoteIsLocked = (quote?: Pick<Quote, 'status'>) => quote?.status === 'accepted' || quote?.status === 'amended';

export function QuoteForm({ quote, leadId, lead: givenLead, onSaved, onCancel }: { quote?: Quote; leadId?: number; lead?: Lead; onSaved: () => void; onCancel: () => void }) {
  const locked = quoteIsLocked(quote);
  const [lead, setLead] = useState<number | null>(quote?.leadId ?? leadId ?? null);
  const chosenLead = useChosenLead(lead, givenLead, !quote);
  const customer = useCustomer(quote, chosenLead);
  const [title, setTitle] = useState(quote?.title || '');
  const lines = useLineItems(quote ? { items: quote.items, amountPence: quote.amountPence, vatRatePercent: quote.vatRatePercent, description: quote.title } : null);
  const [quoteDate, setQuoteDate] = useState(quote ? quote.quoteDate || '' : todayIso());
  const [validUntil, setValidUntil] = useState(quote?.validUntil || '');
  const [notes, setNotes] = useState(quote?.notes || '');
  const [terms, setTerms] = useState(quote?.terms || '');
  const [status, setStatus] = useState<QuoteStatus>(quote?.status || 'draft');
  const { saving, error, setError, run } = useSubmit(onSaved);
  return <form className="crm-form" onSubmit={event => {
    const body: Record<string, unknown> = { title, validUntil: validUntil || null, notes, ...customer.body(Boolean(quote)) };
    if (quoteDate || quote) body.quoteDate = quoteDate || null;
    if (!quote || status !== quote.status) body.status = status;
    if (!locked) {
      const parsed = lines.validate();
      if (typeof parsed === 'string') { event.preventDefault(); setError(parsed); return; }
      body.items = parsed.items;
      if (parsed.vatRatePercent !== null) body.vatRatePercent = parsed.vatRatePercent;
      // A new quote with blank terms takes the standard terms from Settings.
      if (quote || terms.trim()) body.terms = terms;
    }
    void run(event, async () => {
      if (quote) await crm(`/quotes/${quote.id}`, { method: 'PATCH', body });
      else await crm('/quotes', { method: 'POST', body: { ...body, leadId: lead } });
    });
  }}>
    {locked && <p className="crm-locked-note" role="note">{quote?.status === 'amended' ? 'This quote has been replaced by a revision, so its items, VAT and terms can no longer change.' : 'This quote has been signed. Revise it to change the items, VAT or terms.'}</p>}
    <div className="crm-form-grid">
      {!quote && leadId === undefined && <Field label="Lead" full><LeadSelect value={lead} onChange={setLead} /></Field>}
      <Field label="Work quoted" full><input required maxLength={190} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Single-storey rear extension" /></Field>
      <CustomerFields state={customer} />
      <Field label="Quote date"><input type="date" value={quoteDate} onChange={event => setQuoteDate(event.target.value)} /></Field>
      <Field label="Valid until"><input type="date" value={validUntil} onChange={event => setValidUntil(event.target.value)} /></Field>
      <div className="crm-field-full"><LineItemsEditor lines={lines} disabled={locked} /></div>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value as QuoteStatus)} disabled={quote?.status === 'amended'}><option value="draft">Draft</option><option value="sent">Sent to customer</option><option value="accepted">Accepted</option><option value="declined">Declined</option>{quote?.status === 'amended' && <option value="amended">Amended (revised)</option>}</select></Field>
      <Field label="Notes / inclusions" full><textarea rows={3} maxLength={8000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
      <Field label="Terms" full hint={quote ? undefined : 'Leave blank to use the standard quote terms from Settings.'}><textarea rows={4} maxLength={20000} value={terms} onChange={event => setTerms(event.target.value)} disabled={locked} /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={quote ? 'Save quote' : 'Create quote'} />
  </form>;
}

/* ---------- Invoices ---------- */
/** Paid and void invoices are read-only except notes and status. */
export const invoiceIsLocked = (invoice?: Pick<Invoice, 'status'>) => invoice?.status === 'paid' || invoice?.status === 'void';

/** Whole days 0–365; NaN otherwise, null when blank. */
function parseTerms(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned) || Number(cleaned) > 365) return Number.NaN;
  return Number(cleaned);
}

export function InvoiceForm({ invoice, leadId, lead: givenLead, quotes = [], onSaved, onCancel }: { invoice?: Invoice; leadId?: number; lead?: Lead; quotes?: Quote[]; onSaved: () => void; onCancel: () => void }) {
  const locked = invoiceIsLocked(invoice);
  const [lead, setLead] = useState<number | null>(invoice?.leadId ?? leadId ?? null);
  const chosenLead = useChosenLead(lead, givenLead, !invoice);
  const customer = useCustomer(invoice, chosenLead);
  const [quoteId, setQuoteId] = useState<number | null>(invoice?.quoteId ?? null);
  const lines = useLineItems(invoice ? { items: invoice.items, amountPence: invoice.amountPence, vatRatePercent: invoice.vatRatePercent, description: invoice.stageLabel || invoice.notes || 'Invoice' } : null);
  const [stageLabel, setStageLabel] = useState(invoice?.stageLabel || '');
  const [poNumber, setPoNumber] = useState(invoice?.poNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(invoice ? invoice.invoiceDate || '' : todayIso());
  const [supplyDate, setSupplyDate] = useState(invoice?.supplyDate || '');
  const [terms, setTermsValue] = useState(invoice?.paymentTermsDays === null || invoice?.paymentTermsDays === undefined ? '' : String(invoice.paymentTermsDays));
  const termsTouched = useRef(Boolean(invoice));
  const [dueAt, setDueAtValue] = useState(invoice?.dueAt || '');
  // The due date follows invoice date + terms until staff pick one themselves.
  const dueTouched = useRef(Boolean(invoice?.dueAt) && invoice?.dueAt !== addDays(invoice?.invoiceDate || '', Number(invoice?.paymentTermsDays ?? Number.NaN)));
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status || 'draft');
  const { saving, error, setError, run } = useSubmit(onSaved);

  useEffect(() => {
    const days = lines.settings?.paymentTermsDays;
    if (!termsTouched.current && days !== undefined && days !== null) setTermsValue(String(days));
  }, [lines.settings]);
  useEffect(() => {
    if (dueTouched.current) return;
    const days = parseTerms(terms);
    if (invoiceDate && days !== null && !Number.isNaN(days)) setDueAtValue(addDays(invoiceDate, days));
  }, [invoiceDate, terms]);
  const setTerms = (value: string) => { termsTouched.current = true; setTermsValue(value); };
  const setDueAt = (value: string) => { dueTouched.current = Boolean(value); setDueAtValue(value); };

  const pickQuote = (value: string) => {
    const id = value ? Number(value) : null;
    setQuoteId(id);
    const quote = quotes.find(item => item.id === id);
    if (!quote || !lines.isEmpty) return;
    if (quote.items?.length) lines.replace(quote.items, quote.vatRatePercent);
    else lines.replace([{ description: quote.title, quantity: 1, unitPricePence: quote.amountPence, amountPence: quote.amountPence }], 0);
  };
  const resendNote = invoice?.status === 'issued' && invoice.sentAt;
  return <form className="crm-form" onSubmit={event => {
    const body: Record<string, unknown> = { notes };
    if (!invoice || status !== invoice.status) body.status = status;
    if (!locked) {
      const parsed = lines.validate();
      if (typeof parsed === 'string') { event.preventDefault(); setError(parsed); return; }
      const days = parseTerms(terms);
      if (Number.isNaN(days)) { event.preventDefault(); setError('Payment terms must be a whole number of days between 0 and 365.'); return; }
      if (!invoice && !customer.customer.customerName.trim() && lead === null) { event.preventDefault(); setError('Enter the customer name, or choose a lead.'); return; }
      Object.assign(body, customer.body(Boolean(invoice)), { items: parsed.items, stageLabel, poNumber, invoiceDate: invoiceDate || null, supplyDate: supplyDate || null, dueAt: dueAt || null });
      if (parsed.vatRatePercent !== null) body.vatRatePercent = parsed.vatRatePercent;
      if (days !== null) body.paymentTermsDays = days;
    }
    void run(event, async () => {
      if (invoice) await crm(`/invoices/${invoice.id}`, { method: 'PATCH', body });
      else await crm('/invoices', { method: 'POST', body: { ...body, leadId: lead, quoteId } });
    });
  }}>
    {locked && <p className="crm-locked-note" role="note">This invoice is {invoice?.status === 'paid' ? 'paid' : 'void'}, so only the notes and status can change.{invoice?.status === 'paid' ? ' Set the status back to Issued (or use Reopen) to correct it.' : ''}</p>}
    {resendNote && <p className="crm-locked-note crm-resend-note" role="note">This invoice has already been emailed. Saving changes clears its sent date — email the corrected copy to the customer afterwards.</p>}
    <div className="crm-form-grid">
      {!invoice && leadId === undefined && <Field label="Lead" full><OptionalLeadSelect value={lead} onChange={setLead} /></Field>}
      {!invoice && quotes.length > 0 && <Field label="For quote" full hint="Choosing a quote copies its items when no lines have been entered yet."><select value={quoteId === null ? '' : String(quoteId)} onChange={event => pickQuote(event.target.value)}><option value="">Not linked to a quote</option>{quotes.map(quote => <option key={quote.id} value={quote.id}>{quote.reference} · {quote.title}</option>)}</select></Field>}
      <CustomerFields state={customer} disabled={locked} />
      <fieldset className="crm-subfieldset crm-field-full" disabled={locked}>
        <legend>Invoice details</legend>
        <div className="crm-form-grid">
          <Field label="Invoice date"><input type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} /></Field>
          <Field label="Supply date (tax point)" hint="Optional. Only if different from the invoice date."><input type="date" value={supplyDate} onChange={event => setSupplyDate(event.target.value)} /></Field>
          <Field label="Payment terms (days)"><input inputMode="numeric" value={terms} onChange={event => setTerms(event.target.value)} placeholder="14" /></Field>
          <Field label="Due date" hint={dueTouched.current ? 'Set by hand.' : 'Worked out from the invoice date and terms.'}><input type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} /></Field>
          <Field label="Stage label" hint="Optional, e.g. Deposit or Stage 2 of 3."><input maxLength={120} value={stageLabel} onChange={event => setStageLabel(event.target.value)} /></Field>
          <Field label="PO number" hint="Optional, the customer's purchase order."><input maxLength={80} value={poNumber} onChange={event => setPoNumber(event.target.value)} /></Field>
        </div>
      </fieldset>
      <div className="crm-field-full"><LineItemsEditor lines={lines} disabled={locked} /></div>
      <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value as InvoiceStatus)}><option value="draft">Draft</option><option value="issued">Issued</option><option value="paid">Paid</option><option value="void">Void</option></select></Field>
      <Field label="Notes" full><textarea rows={3} maxLength={8000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
    </div>
    <FormActions saving={saving} error={error} onCancel={onCancel} label={invoice ? 'Save invoice' : 'Create invoice'} />
  </form>;
}
