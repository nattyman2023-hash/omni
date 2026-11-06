import { DragEvent, FormEvent, ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, LayoutGrid, List,
  Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Quote as QuoteIcon, StickyNote, Trash2, Undo2, Users,
} from 'lucide-react';
import { AdminWorkspaceShell } from '../AdminWorkspace';
import {
  Activity, CONTACT_TYPE_LABELS, Email, Invoice, Lead, LeadDetail, Quote, ROLE_LABELS, SOURCE_LABELS, STAGE_LABELS, STAGES, Stage, Summary, Task, TeamMember, TeamRole, Visit,
  crm, formatAgo, formatBytes, formatDay, formatMoney, formatWhen, useCrm,
} from './crmApi';
import { Field, InvoiceForm, LeadForm, Modal, QuoteForm, TaskForm, VisitForm } from './CrmForms';
import { Empty, ErrorNote, LeadLinkText, Loading, Notice, PageTitle, StatusBadge } from './CrmUi';
import { ComposeEmailForm, EmailItem, InvoiceActions, InvoiceMeta, NoticeState, QuoteActions, QuoteMeta } from './CrmSales';

/* ---------- shared bits ---------- */
/** After editing an invoice that was already emailed, remind staff to send the corrected copy. */
const resendNotice = (before?: Invoice): NoticeState => (before && before.status === 'issued' && before.sentAt
  ? { tone: 'info', message: `${before.reference} was changed after it had been emailed. Use “Email invoice” to send the corrected copy to the customer.` }
  : null);

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={`crm-badge crm-stage-${stage}`}>{STAGE_LABELS[stage] || stage}</span>;
}

const isOverdue = (task: Task) => task.status === 'open' && Boolean(task.dueAt) && new Date(String(task.dueAt)).getTime() < Date.now();
const isInvoiceOverdue = (invoice: Invoice) => invoice.status === 'issued' && Boolean(invoice.dueAt) && String(invoice.dueAt) < new Date().toISOString().slice(0, 10);

/** Signed-in CSV download link that keeps the current filters. */
function csvLink(path: 'leads.csv' | 'invoices.csv', params: Record<string, string>) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return `/api/admin/crm/${path}${search ? `?${search}` : ''}`;
}

/* ---------- Dashboard ---------- */
export function CrmDashboardPage() {
  const { data, error, loading } = useCrm<Summary>('/summary');
  const stat = (label: string, value: ReactNode, href: string, note?: ReactNode) => <Link className="admin-stat-card crm-stat" to={href}><span>{label}</span><strong>{loading || !data ? '—' : value}</strong><small>{note || <>View <ArrowRight size={13} aria-hidden="true" /></>}</small></Link>;
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Dashboard" title="Today at Omni" intro="New enquiries, upcoming site visits, follow-ups and money in the pipeline." actions={<Link className="crm-button" to="/staff/leads?new=1"><Plus size={16} /> New lead</Link>} />
    <ErrorNote message={error} />
    <div className="crm-stat-grid">
      {stat('New leads this week', data?.newThisWeek, '/staff/leads?stage=new', data ? `${data.stages.new} waiting for first contact` : undefined)}
      {stat('Open leads', data?.openLeads, '/staff/leads', data?.pipelineValuePence ? `${formatMoney(data.pipelineValuePence)} estimated` : undefined)}
      {stat('Quotes awaiting answer', formatMoney(data?.quotesSentPence || 0), '/staff/quotes', data ? `${formatMoney(data.quotesAcceptedPence)} accepted` : undefined)}
      {stat('Invoices outstanding', formatMoney(data?.invoicesOutstandingPence || 0), '/staff/invoices', data?.overdueInvoices ? <span className="crm-warn">{data.overdueInvoices} overdue</span> : data ? `${formatMoney(data.invoicesPaidPence)} paid` : undefined)}
      {stat('Open tasks', data?.openTaskCount, '/staff/tasks', data?.overdueTasks ? <span className="crm-warn">{data.overdueTasks} overdue</span> : undefined)}
      {stat('Win rate', data?.conversionRate === null || data?.conversionRate === undefined ? '—' : `${data.conversionRate}%`, '/staff/leads?stage=won', data ? `${data.stages.won} won · ${data.stages.lost} lost` : undefined)}
    </div>

    {data && <section className="admin-panel crm-panel crm-pipeline-strip" aria-label="Leads by stage">
      {STAGES.map(stage => <Link key={stage} to={`/staff/leads?stage=${stage}`} className={`crm-pipeline-step crm-stage-${stage}`}><strong>{data.stages[stage]}</strong><span>{STAGE_LABELS[stage]}</span></Link>)}
    </section>}

    <div className="crm-dashboard-columns">
      <section className="admin-panel crm-panel" aria-labelledby="dash-new"><div className="panel-heading"><h2 id="dash-new">New leads to contact</h2><Link to="/staff/leads?stage=new">All new</Link></div>
        {loading ? <Loading /> : !data?.newLeads.length ? <Empty icon={<ClipboardList size={22} />} title="All caught up">Every lead has been contacted.</Empty>
          : <ul className="crm-rows">{data.newLeads.map(lead => <li key={lead.id}><Link to={`/staff/leads/${lead.id}`}><strong>{lead.name}</strong><span>{[lead.projectType, lead.postcode].filter(Boolean).join(' · ') || SOURCE_LABELS[lead.source]}</span></Link><time>{formatAgo(lead.createdAt)}</time></li>)}</ul>}
      </section>
      <section className="admin-panel crm-panel" aria-labelledby="dash-visits"><div className="panel-heading"><h2 id="dash-visits">Upcoming site visits</h2><Link to="/staff/site-visits">All visits</Link></div>
        {loading ? <Loading /> : !data?.upcomingVisits.length ? <Empty icon={<MapPin size={22} />} title="No visits booked">Book a visit from a lead's page.</Empty>
          : <ul className="crm-rows">{data.upcomingVisits.map(visit => <li key={visit.id}><Link to={`/staff/leads/${visit.leadId}`}><strong>{visit.leadName}</strong><span>{visit.address || 'Address not set'}</span></Link><time>{formatWhen(visit.scheduledAt)}</time></li>)}</ul>}
      </section>
      <section className="admin-panel crm-panel" aria-labelledby="dash-tasks"><div className="panel-heading"><h2 id="dash-tasks">Follow-ups</h2><Link to="/staff/tasks">All tasks</Link></div>
        {loading ? <Loading /> : !data?.openTasks.length ? <Empty icon={<Check size={22} />} title="No open tasks">Nothing to chase right now.</Empty>
          : <ul className="crm-rows">{data.openTasks.map(task => <li key={task.id} className={isOverdue(task) ? 'crm-overdue' : ''}><Link to={task.leadId ? `/staff/leads/${task.leadId}` : '/staff/tasks'}><strong>{task.title}</strong><span>{task.leadName || 'General'}</span></Link><time>{task.dueAt ? `${isOverdue(task) ? 'Overdue · ' : ''}${formatWhen(task.dueAt)}` : 'No due date'}</time></li>)}</ul>}
      </section>
      <section className="admin-panel crm-panel" aria-labelledby="dash-activity"><div className="panel-heading"><h2 id="dash-activity">Recent activity</h2></div>
        {loading ? <Loading /> : !data?.recentActivity.length ? <Empty icon={<StickyNote size={22} />} title="No activity yet">Notes, calls and stage changes will show here.</Empty>
          : <ul className="crm-rows">{data.recentActivity.map(item => <li key={item.id}><Link to={`/staff/leads/${item.leadId}`}><strong>{item.leadName}</strong><span>{item.body}</span></Link><time>{formatAgo(item.createdAt)}</time></li>)}</ul>}
      </section>
    </div>
  </div></AdminWorkspaceShell>;
}

/* ---------- Leads ---------- */
function useQueryParam(key: string) {
  return new URLSearchParams(window.location.search).get(key) || '';
}

export function LeadsPage() {
  const navigate = useNavigate();
  const initialStage = useQueryParam('stage') as Stage | '';
  const [stage, setStage] = useState<Stage | ''>(STAGES.includes(initialStage as Stage) ? initialStage : '');
  const [view, setView] = useState<'board' | 'list'>(() => { try { return (localStorage.getItem('omni-crm-leads-view') as 'board' | 'list') || 'board'; } catch { return 'board'; } });
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(useQueryParam('new') === '1');
  const [moveError, setMoveError] = useState('');
  const { data, error, loading, reload, setData } = useCrm<{ records: Lead[] }>('/leads');
  const switchView = (next: 'board' | 'list') => { setView(next); try { localStorage.setItem('omni-crm-leads-view', next); } catch { /* storage unavailable */ } };

  const needle = query.trim().toLowerCase();
  const leads = (data?.records || []).filter(lead => !needle || [lead.name, lead.email, lead.phone, lead.postcode, lead.reference, lead.projectType, lead.address].join(' ').toLowerCase().includes(needle));
  const listed = stage ? leads.filter(lead => lead.stage === stage) : leads;

  const move = async (leadId: number, target: Stage) => {
    const lead = data?.records.find(item => item.id === leadId);
    if (!lead || lead.stage === target) return;
    setMoveError('');
    setData(current => current && { records: current.records.map(item => item.id === leadId ? { ...item, stage: target } : item) });
    try { await crm(`/leads/${leadId}`, { method: 'PATCH', body: { stage: target } }); } catch (reason) { setMoveError(reason instanceof Error ? reason.message : 'Could not move the lead.'); reload(); }
  };

  return <AdminWorkspaceShell search={{ value: query, onChange: setQuery, label: 'Search leads by name, phone, postcode…' }}><div className="admin-content">
    <PageTitle eyebrow="Leads" title="Leads pipeline" intro="Every enquiry from the website and anyone you add by hand. Drag a card to move it to another stage." actions={<>
      <a className="crm-button crm-button-ghost" href={csvLink('leads.csv', { stage, q: query.trim() })}><Download size={15} /> Export CSV</a>
      <div className="crm-toggle" role="group" aria-label="Layout"><button type="button" aria-pressed={view === 'board'} onClick={() => switchView('board')}><LayoutGrid size={15} /> Board</button><button type="button" aria-pressed={view === 'list'} onClick={() => switchView('list')}><List size={15} /> List</button></div>
      <button type="button" className="crm-button" onClick={() => setCreating(true)}><Plus size={16} /> New lead</button>
    </>} />
    <ErrorNote message={error || moveError} />
    {view === 'list' && <div className="crm-tabs" role="tablist" aria-label="Filter by stage">
      <button type="button" role="tab" aria-selected={stage === ''} onClick={() => setStage('')}>All <span>{leads.length}</span></button>
      {STAGES.map(item => <button type="button" role="tab" key={item} aria-selected={stage === item} onClick={() => setStage(item)}>{STAGE_LABELS[item]} <span>{leads.filter(lead => lead.stage === item).length}</span></button>)}
    </div>}
    {loading && !data ? <Loading /> : view === 'board'
      ? <div className="crm-board">{STAGES.map(column => <BoardColumn key={column} stage={column} leads={leads.filter(lead => lead.stage === column)} onDrop={move} />)}</div>
      : <section className="admin-panel crm-panel">
          {!listed.length ? <Empty icon={<ClipboardList size={22} />} title={data?.records.length ? 'No matching leads' : 'No leads yet'}>{data?.records.length ? 'Try another search or stage.' : 'Website enquiries appear here automatically. You can also add a lead by hand.'}</Empty>
            : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Customer</th><th>Project</th><th>Stage</th><th>Source</th><th>Value</th><th>Received</th></tr></thead><tbody>
              {listed.map(lead => <tr key={lead.id} onClick={() => navigate(`/staff/leads/${lead.id}`)}><td><Link to={`/staff/leads/${lead.id}`} onClick={event => event.stopPropagation()}><strong>{lead.name}</strong></Link><small>{[lead.phone, lead.email].filter(Boolean).join(' · ')}{lead.possibleDuplicates.length ? ' · Possible duplicate' : ''}</small></td><td>{lead.projectType || '—'}<small>{lead.postcode}</small></td><td><StageBadge stage={lead.stage} /></td><td>{SOURCE_LABELS[lead.source] || lead.source}</td><td>{formatMoney(lead.valuePence) || '—'}</td><td>{formatDay(lead.createdAt)}<small>{lead.assignedName}</small></td></tr>)}
            </tbody></table></div>}
        </section>}
    {creating && <Modal title="New lead" wide onClose={() => setCreating(false)}><LeadForm onCancel={() => setCreating(false)} onSaved={lead => navigate(`/staff/leads/${lead.id}`)} /></Modal>}
  </div></AdminWorkspaceShell>;
}

function BoardColumn({ stage, leads, onDrop }: { stage: Stage; leads: Lead[]; onDrop: (leadId: number, stage: Stage) => void }) {
  const [over, setOver] = useState(false);
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); const id = Number(event.dataTransfer.getData('text/x-omni-lead')); if (id) onDrop(id, stage); };
  const value = leads.reduce((total, lead) => total + (lead.valuePence || 0), 0);
  return <section className={`crm-column crm-stage-${stage}${over ? ' crm-column-over' : ''}`} aria-label={`${STAGE_LABELS[stage]} leads`} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
    <header><h2>{STAGE_LABELS[stage]}</h2><span>{leads.length}{value ? ` · ${formatMoney(value)}` : ''}</span></header>
    <div className="crm-column-cards">
      {leads.map(lead => <Link key={lead.id} to={`/staff/leads/${lead.id}`} className="crm-card" draggable onDragStart={event => { event.dataTransfer.setData('text/x-omni-lead', String(lead.id)); event.dataTransfer.effectAllowed = 'move'; }}>
        <strong>{lead.name}</strong>
        {lead.companyName && <span className="crm-card-company">{lead.companyName}</span>}
        {(lead.projectType || lead.postcode) && <span>{[lead.projectType, lead.postcode].filter(Boolean).join(' · ')}</span>}
        <small>{formatAgo(lead.createdAt)}{lead.valuePence ? ` · ${formatMoney(lead.valuePence)}` : ''}{lead.assignedName ? ` · ${lead.assignedName}` : ''}{lead.possibleDuplicates.length ? ' · Possible duplicate' : ''}</small>
      </Link>)}
      {!leads.length && <p className="crm-column-empty">No leads</p>}
    </div>
  </section>;
}

/* ---------- Lead detail ---------- */
type Dialog = null | { kind: 'edit' } | { kind: 'visit'; visit?: Visit } | { kind: 'task'; task?: Task } | { kind: 'quote'; quote?: Quote } | { kind: 'invoice'; invoice?: Invoice } | { kind: 'lost' } | { kind: 'email'; replyTo?: Email };

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useCrm<LeadDetail>(`/leads/${Number(id) || 0}`);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const close = () => setDialog(null);
  const saved = () => { setDialog(null); reload(); };

  const patch = async (path: string, body: unknown) => {
    setActionError('');
    try { await crm(path, { method: 'PATCH', body }); reload(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not save.'); }
  };

  /** GDPR erasure: two confirmations, then the lead is deleted or anonymised. */
  const erase = async () => {
    if (!data) return;
    if (!window.confirm(`Erase all personal data for ${data.lead.name}? This cannot be undone.`)) return;
    if (!window.confirm('Confirm again: the customer’s details will be permanently removed.')) return;
    setActionError('');
    try {
      const result = await crm<{ result: { erased: 'deleted' | 'anonymised' } }>(`/leads/${data.lead.id}`, { method: 'DELETE' });
      if (result.result.erased === 'deleted') navigate('/staff/leads');
      else reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Could not erase the personal data.');
    }
  };

  if (loading && !data) return <AdminWorkspaceShell><div className="admin-content"><Loading /></div></AdminWorkspaceShell>;
  if (!data) return <AdminWorkspaceShell><div className="admin-content"><Link className="crm-back" to="/staff/leads"><ArrowLeft size={15} /> All leads</Link><ErrorNote message={error || 'Lead not found.'} /></div></AdminWorkspaceShell>;

  const { lead, activities, visits, tasks, quotes, invoices, files } = data;
  const emails = data.emails || [];
  const digits = lead.phone.replace(/[^\d+]/g, '');
  const whatsapp = digits ? `https://wa.me/${digits.replace(/^\+/, '').replace(/^0/, '44')}` : '';
  const details: Array<[string, string]> = [['Phone', lead.phone], ['Email', lead.email], ['Preferred contact', lead.preferredContact], ['Postcode', lead.postcode], ['Address', lead.address], ['Project', lead.projectType], ['Property', lead.propertyType], ['Budget', lead.budget], ['Desired start', lead.desiredStart], ['Estimated value', formatMoney(lead.valuePence)], ['Assigned to', lead.assignedName], ['Source', [SOURCE_LABELS[lead.source] || lead.source, lead.sourceDetail].filter(Boolean).join(' · ')], ['Received', formatWhen(lead.createdAt)]];

  return <AdminWorkspaceShell><div className="admin-content crm-lead-page">
    <Link className="crm-back" to="/staff/leads"><ArrowLeft size={15} /> All leads</Link>
    <div className="crm-lead-head">
      <div><span className="eyebrow">{lead.reference}</span><h1>{lead.name}</h1><p>{[lead.companyName, CONTACT_TYPE_LABELS[lead.contactType], lead.projectType, lead.postcode].filter(Boolean).join(' · ') || 'No project details yet'}</p></div>
      <div className="crm-lead-actions">
        {lead.phone && <a className="crm-button crm-button-ghost" href={`tel:${digits}`}><Phone size={15} /> Call</a>}
        {whatsapp && <a className="crm-button crm-button-ghost" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
        {lead.email && <a className="crm-button crm-button-ghost" href={`mailto:${lead.email}`}><Mail size={15} /> Email</a>}
        <button type="button" className="crm-button crm-button-ghost" onClick={() => setDialog({ kind: 'edit' })}><Pencil size={15} /> Edit</button>
      </div>
    </div>

    <div className="crm-stage-bar" role="group" aria-label="Lead stage">
      {STAGES.filter(stage => stage !== 'lost').map(stage => <button type="button" key={stage} className={`crm-stage-${stage}`} aria-pressed={lead.stage === stage} onClick={() => patch(`/leads/${lead.id}`, { stage })}>{STAGE_LABELS[stage]}</button>)}
      {lead.stage === 'lost'
        ? <button type="button" className="crm-stage-lost" aria-pressed="true" onClick={() => patch(`/leads/${lead.id}`, { stage: 'contacted' })}><Undo2 size={14} /> Lost · reopen</button>
        : <button type="button" className="crm-stage-lost" aria-pressed="false" onClick={() => setDialog({ kind: 'lost' })}>Mark lost</button>}
    </div>
    {lead.stage === 'lost' && lead.lostReason && <p className="crm-lost-reason">Lost: {lead.lostReason}</p>}
    {lead.possibleDuplicates.length > 0 && <p className="crm-lost-reason">Possible duplicate of {lead.possibleDuplicates.map((duplicate, index) => <span key={duplicate.id}>{index ? ', ' : ''}<Link to={`/staff/leads/${duplicate.id}`}>{duplicate.name} ({duplicate.reference})</Link></span>)} — the same email address or phone number.</p>}
    <ErrorNote message={actionError} />
    {notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice>}

    <div className="crm-lead-grid">
      <div className="crm-lead-main">
        <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Project details</h2></div>
          <div className="crm-panel-body">{lead.description ? <p className="crm-description">{lead.description}</p> : <p className="crm-muted">No project description.</p>}
            <dl className="crm-details">{details.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Email' ? <a href={`mailto:${value}`}>{value}</a> : label === 'Phone' ? <a href={`tel:${digits}`}>{value}</a> : value}</dd></div>)}</dl>
            {lead.submission && <details className="crm-submission"><summary>Original website submission</summary><dl className="crm-details">{Object.entries(lead.submission).filter(([, value]) => value !== '' && value !== null).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl></details>}
          </div>
        </section>

        {files.length > 0 && <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Customer uploads</h2><span>{files.length} file{files.length === 1 ? '' : 's'}</span></div>
          <ul className="crm-related">{files.map(file => <li key={file.id}><div><strong>{file.originalFilename}</strong><span>{[file.mimeType === 'application/pdf' ? 'PDF' : file.mimeType.replace('image/', '').toUpperCase(), formatBytes(file.sizeBytes), formatDay(file.createdAt)].filter(Boolean).join(' · ')}</span></div><div className="crm-row-actions"><a className="crm-link-button" href={`/api/admin/crm/leads/${lead.id}/files/${file.id}`} download={file.originalFilename}>Download</a></div></li>)}</ul>
        </section>}

        <RelatedPanel title="Site visits" icon={<MapPin size={20} />} empty="No visits booked." onAdd={() => setDialog({ kind: 'visit' })} addLabel="Book visit">
          {visits.map(visit => <li key={visit.id}><div><strong>{formatWhen(visit.scheduledAt)}</strong><span>{[visit.address, `${visit.durationMinutes} min`, visit.assignedName].filter(Boolean).join(' · ')}</span>{visit.notes && <p>{visit.notes}</p>}</div><div className="crm-row-actions"><StatusBadge status={visit.status} />{visit.status === 'scheduled' && <button type="button" className="crm-link-button" onClick={() => patch(`/visits/${visit.id}`, { status: 'completed' })}>Mark done</button>}<button type="button" className="crm-link-button" onClick={() => setDialog({ kind: 'visit', visit })}>Edit</button></div></li>)}
        </RelatedPanel>

        <RelatedPanel title="Tasks" icon={<Check size={20} />} empty="No tasks for this lead." onAdd={() => setDialog({ kind: 'task' })} addLabel="Add task">
          {tasks.map(task => <li key={task.id} className={isOverdue(task) ? 'crm-overdue' : ''}><TaskCheck task={task} onToggle={status => patch(`/tasks/${task.id}`, { status })} /><div><strong className={task.status === 'completed' ? 'crm-done' : ''}>{task.title}</strong><span>{[task.dueAt ? `Due ${formatWhen(task.dueAt)}` : 'No due date', task.assignedName].filter(Boolean).join(' · ')}</span></div><div className="crm-row-actions"><button type="button" className="crm-link-button" onClick={() => setDialog({ kind: 'task', task })}>Edit</button></div></li>)}
        </RelatedPanel>

        <RelatedPanel title="Quotes" icon={<QuoteIcon size={20} />} empty="No quotes yet." onAdd={() => setDialog({ kind: 'quote' })} addLabel="New quote">
          {quotes.map(quote => <li key={quote.id}><div><strong>{quote.reference} · {formatMoney(quote.amountPence)}</strong><span>{quote.title}{quote.validUntil ? ` · valid until ${formatDay(quote.validUntil)}` : ''}</span><QuoteMeta quote={quote} /><QuoteActions quote={quote} onEdit={() => setDialog({ kind: 'quote', quote })} onChanged={reload} onRevised={revised => { reload(); setDialog({ kind: 'quote', quote: revised }); }} onNotice={setNotice} /></div><div className="crm-row-actions"><QuoteStatusSelect quote={quote} onChange={status => patch(`/quotes/${quote.id}`, { status })} /></div></li>)}
        </RelatedPanel>

        <RelatedPanel title="Invoices" icon={<FileText size={20} />} empty="No invoices yet." onAdd={() => setDialog({ kind: 'invoice' })} addLabel="New invoice">
          {invoices.map(invoice => <li key={invoice.id} className={isInvoiceOverdue(invoice) ? 'crm-overdue' : ''}><div><strong>{invoice.reference} · {formatMoney(invoice.amountPence)}</strong><span>{[invoice.dueAt ? `Due ${formatDay(invoice.dueAt)}` : '', invoice.paidAt ? `Paid ${formatDay(invoice.paidAt)}` : '', invoice.notes].filter(Boolean).join(' · ')}</span><InvoiceMeta invoice={invoice} /><InvoiceActions invoice={invoice} onEdit={() => setDialog({ kind: 'invoice', invoice })} onChanged={reload} onNotice={setNotice} /></div><div className="crm-row-actions"><InvoiceStatusSelect invoice={invoice} onChange={status => patch(`/invoices/${invoice.id}`, { status })} /></div></li>)}
        </RelatedPanel>

        <RelatedPanel title="Emails" icon={<Mail size={20} />} empty={lead.email ? 'No emails with this customer yet.' : 'No emails yet. Add an email address to the lead to email them from here.'} onAdd={() => setDialog({ kind: 'email' })} addLabel="Email this lead">
          {emails.map(email => <EmailItem key={email.id} email={email} onReply={replyTo => setDialog({ kind: 'email', replyTo })} />)}
        </RelatedPanel>

        <section className="admin-panel crm-panel"><div className="panel-heading"><h2>Privacy</h2></div>
          <div className="crm-panel-body">
            <p className="crm-muted">Erase this customer’s personal data on request. Quotes and invoices are kept for accounting, so the lead is anonymised rather than deleted when they exist.</p>
            <button type="button" className="crm-button crm-button-danger" onClick={() => void erase()}><Trash2 size={15} /> Erase personal data</button>
          </div>
        </section>
      </div>

      <section className="admin-panel crm-panel crm-timeline-panel" aria-labelledby="timeline-heading">
        <div className="panel-heading"><h2 id="timeline-heading">Activity</h2></div>
        <NoteComposer leadId={lead.id} onSaved={reload} />
        <ol className="crm-timeline">{activities.map(item => <TimelineItem key={item.id} item={item} />)}</ol>
        {!activities.length && <p className="crm-muted crm-panel-body">No activity yet.</p>}
      </section>
    </div>

    {dialog?.kind === 'edit' && <Modal title="Edit lead" wide onClose={close}><LeadForm lead={lead} onCancel={close} onSaved={saved} /></Modal>}
    {dialog?.kind === 'visit' && <Modal title={dialog.visit ? 'Edit site visit' : 'Book a site visit'} onClose={close}><VisitForm visit={dialog.visit} leadId={lead.id} defaultAddress={lead.address || lead.postcode} onCancel={close} onSaved={saved} /></Modal>}
    {dialog?.kind === 'task' && <Modal title={dialog.task ? 'Edit task' : 'Add a task'} onClose={close}><TaskForm task={dialog.task} leadId={lead.id} onCancel={close} onSaved={saved} /></Modal>}
    {dialog?.kind === 'quote' && <Modal title={dialog.quote ? `Edit ${dialog.quote.reference}` : 'New quote'} onClose={close}><QuoteForm quote={dialog.quote} leadId={lead.id} lead={lead} onCancel={close} onSaved={saved} /></Modal>}
    {dialog?.kind === 'invoice' && <Modal title={dialog.invoice ? `Edit ${dialog.invoice.reference}` : 'New invoice'} onClose={close}><InvoiceForm invoice={dialog.invoice} leadId={lead.id} lead={lead} quotes={quotes.filter(quote => quote.status === 'accepted')} onCancel={close} onSaved={() => { setNotice(resendNotice(dialog.invoice)); saved(); }} /></Modal>}
    {dialog?.kind === 'email' && <Modal title={dialog.replyTo ? `Reply to ${lead.name}` : `Email ${lead.name}`} wide onClose={() => { close(); reload(); }}><ComposeEmailForm leadId={lead.id} defaultTo={lead.email} replyTo={dialog.replyTo} onSent={() => reload()} onCancel={() => { close(); reload(); }} /></Modal>}
    {dialog?.kind === 'lost' &&<Modal title="Mark lead as lost" onClose={close}><LostForm onCancel={close} onSubmit={async reason => { await patch(`/leads/${lead.id}`, { stage: 'lost', lostReason: reason }); close(); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}

function RelatedPanel({ title, icon, empty, onAdd, addLabel, children }: { title: string; icon: ReactNode; empty: string; onAdd: () => void; addLabel: string; children: ReactNode[] }) {
  return <section className="admin-panel crm-panel"><div className="panel-heading"><h2>{title}</h2><button type="button" className="crm-button crm-button-small" onClick={onAdd}><Plus size={14} /> {addLabel}</button></div>
    {children.length ? <ul className="crm-related">{children}</ul> : <div className="crm-related-empty">{icon}<span>{empty}</span></div>}
  </section>;
}

function TaskCheck({ task, onToggle }: { task: Task; onToggle: (status: Task['status']) => void }) {
  const done = task.status === 'completed';
  return <button type="button" className={`crm-check${done ? ' crm-check-done' : ''}`} aria-pressed={done} aria-label={done ? `Re-open task: ${task.title}` : `Complete task: ${task.title}`} onClick={() => onToggle(done ? 'open' : 'completed')}>{done && <Check size={13} />}</button>;
}

function QuoteStatusSelect({ quote, onChange }: { quote: Quote; onChange: (status: Quote['status']) => void }) {
  // An amended quote has been replaced by a revision; its status is final.
  if (quote.status === 'amended') return <StatusBadge status="amended" label="Amended" />;
  return <select className={`crm-status-select crm-status-${quote.status}`} aria-label={`Status of ${quote.reference}`} value={quote.status} onChange={event => onChange(event.target.value as Quote['status'])}><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select>;
}

function InvoiceStatusSelect({ invoice, onChange }: { invoice: Invoice; onChange: (status: Invoice['status']) => void }) {
  return <select className={`crm-status-select crm-status-${isInvoiceOverdue(invoice) ? 'overdue' : invoice.status}`} aria-label={`Status of ${invoice.reference}`} value={invoice.status} onChange={event => onChange(event.target.value as Invoice['status'])}><option value="draft">Draft</option><option value="issued">{isInvoiceOverdue(invoice) ? 'Issued · overdue' : 'Issued'}</option><option value="paid">Paid</option><option value="void">Void</option></select>;
}

const ACTIVITY_LABELS: Record<string, string> = { note: 'Note', call: 'Call', email: 'Email', stage: 'Stage', visit: 'Site visit', task: 'Task', quote: 'Quote', invoice: 'Invoice', system: 'Update' };

function TimelineItem({ item }: { item: Activity }) {
  return <li className={`crm-timeline-${item.kind}`}><span className="crm-timeline-kind">{ACTIVITY_LABELS[item.kind] || item.kind}</span><p>{item.body}</p><small>{[item.userName, formatWhen(item.createdAt)].filter(Boolean).join(' · ')}</small></li>;
}

function NoteComposer({ leadId, onSaved }: { leadId: number; onSaved: () => void }) {
  const [kind, setKind] = useState<'note' | 'call' | 'email'>('note');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setError('');
    try { await crm(`/leads/${leadId}/activities`, { method: 'POST', body: { kind, body } }); setBody(''); onSaved(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the note.'); } finally { setSaving(false); }
  };
  return <form className="crm-composer" onSubmit={submit}>
    <div className="crm-toggle crm-toggle-small" role="group" aria-label="Type of entry">{(['note', 'call', 'email'] as const).map(option => <button type="button" key={option} aria-pressed={kind === option} onClick={() => setKind(option)}>{option === 'note' ? 'Note' : option === 'call' ? 'Logged call' : 'Logged email'}</button>)}</div>
    <label className="sr-only" htmlFor="crm-note">Activity details</label>
    <textarea id="crm-note" rows={3} maxLength={5000} value={body} onChange={event => setBody(event.target.value)} placeholder={kind === 'call' ? 'What was discussed on the call?' : kind === 'email' ? 'What did the email say?' : 'Add a note for the team…'} />
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <button type="submit" className="crm-button crm-button-small" disabled={saving || !body.trim()}>{saving ? 'Saving…' : 'Add to timeline'}</button>
  </form>;
}

function LostForm({ onSubmit, onCancel }: { onSubmit: (reason: string) => Promise<void>; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  return <form className="crm-form" onSubmit={event => { event.preventDefault(); void onSubmit(reason); }}>
    <label className="crm-field crm-field-full"><span>Reason (optional)</span><input maxLength={255} value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. Chose another builder, budget too low" list="crm-lost-reasons" /></label>
    <datalist id="crm-lost-reasons"><option value="Chose another builder" /><option value="Budget too low" /><option value="Project postponed" /><option value="No response" /><option value="Outside our area" /></datalist>
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel}>Cancel</button><button type="submit" className="crm-button crm-button-danger">Mark as lost</button></div>
  </form>;
}

/* ---------- Site visits ---------- */
export function VisitsPage() {
  const { data, error, loading, reload } = useCrm<{ records: Visit[] }>('/visits');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [dialog, setDialog] = useState<null | { visit?: Visit }>(null);
  const [actionError, setActionError] = useState('');
  const now = Date.now();
  const records = (data?.records || []).filter(visit => filter === 'all' || (filter === 'upcoming' ? visit.status === 'scheduled' && new Date(String(visit.scheduledAt)).getTime() >= now - 3_600_000 : visit.status !== 'scheduled' || new Date(String(visit.scheduledAt)).getTime() < now - 3_600_000));
  const ordered = filter === 'upcoming' ? records : [...records].reverse();
  const setStatus = async (visit: Visit, status: Visit['status']) => { setActionError(''); try { await crm(`/visits/${visit.id}`, { method: 'PATCH', body: { status } }); reload(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not update the visit.'); } };
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Site visits" title="Site visits" intro="Booking a visit moves the lead to the Site visit stage." actions={<button type="button" className="crm-button" onClick={() => setDialog({})}><Plus size={16} /> Book visit</button>} />
    <ErrorNote message={error || actionError} />
    <div className="crm-tabs" role="tablist">{(['upcoming', 'past', 'all'] as const).map(option => <button type="button" role="tab" key={option} aria-selected={filter === option} onClick={() => setFilter(option)}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>)}</div>
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !ordered.length ? <Empty icon={<MapPin size={22} />} title="No site visits">{filter === 'upcoming' ? 'No upcoming visits are booked.' : 'Nothing to show.'}</Empty>
      : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>When</th><th>Customer</th><th>Address</th><th>Attending</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {ordered.map(visit => <tr key={visit.id}><td><strong>{formatWhen(visit.scheduledAt)}</strong><small>{visit.durationMinutes} min</small></td><td><LeadLinkText id={visit.leadId} name={visit.leadName} /></td><td>{visit.address || '—'}{visit.notes && <small>{visit.notes}</small>}</td><td>{visit.assignedName || '—'}</td><td><StatusBadge status={visit.status} /></td><td className="crm-cell-actions">{visit.status === 'scheduled' && <><button type="button" className="crm-link-button" onClick={() => setStatus(visit, 'completed')}>Done</button><button type="button" className="crm-link-button" onClick={() => setStatus(visit, 'cancelled')}>Cancel</button></>}<button type="button" className="crm-link-button" onClick={() => setDialog({ visit })}>Edit</button></td></tr>)}
      </tbody></table></div>}</section>
    {dialog && <Modal title={dialog.visit ? 'Edit site visit' : 'Book a site visit'} onClose={() => setDialog(null)}><VisitForm visit={dialog.visit} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}

/* ---------- Tasks ---------- */
export function TasksPage() {
  const { data, error, loading, reload, setData } = useCrm<{ records: Task[] }>('/tasks');
  const [filter, setFilter] = useState<'open' | 'completed'>('open');
  const [dialog, setDialog] = useState<null | { task?: Task }>(null);
  const [actionError, setActionError] = useState('');
  const records = (data?.records || []).filter(task => (filter === 'open' ? task.status === 'open' : task.status !== 'open'));
  const toggle = async (task: Task, status: Task['status']) => {
    setActionError('');
    setData(current => current && { records: current.records.map(item => item.id === task.id ? { ...item, status } : item) });
    try { await crm(`/tasks/${task.id}`, { method: 'PATCH', body: { status } }); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not update the task.'); }
    reload();
  };
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Tasks" title="Tasks and follow-ups" actions={<button type="button" className="crm-button" onClick={() => setDialog({})}><Plus size={16} /> Add task</button>} />
    <ErrorNote message={error || actionError} />
    <div className="crm-tabs" role="tablist"><button type="button" role="tab" aria-selected={filter === 'open'} onClick={() => setFilter('open')}>Open <span>{data?.records.filter(task => task.status === 'open').length || 0}</span></button><button type="button" role="tab" aria-selected={filter === 'completed'} onClick={() => setFilter('completed')}>Done</button></div>
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !records.length ? <Empty icon={<Check size={22} />} title={filter === 'open' ? 'No open tasks' : 'No finished tasks'}>{filter === 'open' ? 'Add a follow-up so nothing slips.' : 'Finished tasks will appear here.'}</Empty>
      : <ul className="crm-related crm-task-list">{records.map(task => <li key={task.id} className={isOverdue(task) ? 'crm-overdue' : ''}><TaskCheck task={task} onToggle={status => toggle(task, status)} /><div><strong className={task.status !== 'open' ? 'crm-done' : ''}>{task.title}</strong><span>{[task.dueAt ? `${isOverdue(task) ? 'Overdue · ' : 'Due '}${formatWhen(task.dueAt)}` : 'No due date', task.assignedName].filter(Boolean).join(' · ')}</span>{task.notes && <p>{task.notes}</p>}</div><div className="crm-row-actions"><LeadLinkText id={task.leadId} name={task.leadName} /><button type="button" className="crm-link-button" onClick={() => setDialog({ task })}>Edit</button></div></li>)}</ul>}</section>
    {dialog && <Modal title={dialog.task ? 'Edit task' : 'Add a task'} onClose={() => setDialog(null)}><TaskForm task={dialog.task} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}

/* ---------- Quotes ---------- */
export function QuotesPage() {
  const { data, error, loading, reload } = useCrm<{ records: Quote[] }>('/quotes');
  const [filter, setFilter] = useState<'' | Quote['status']>('');
  const [dialog, setDialog] = useState<null | { quote?: Quote }>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const all = data?.records || [];
  const records = filter ? all.filter(quote => quote.status === filter) : all;
  const total = (status: Quote['status']) => all.filter(quote => quote.status === status).reduce((sum, quote) => sum + quote.amountPence, 0);
  const setStatus = async (quote: Quote, status: Quote['status']) => { setActionError(''); try { await crm(`/quotes/${quote.id}`, { method: 'PATCH', body: { status } }); reload(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not update the quote.'); } };
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Quotes" title="Quotes" intro="Marking a quote Sent moves the lead to Quoted. Accepted moves it to Won." actions={<button type="button" className="crm-button" onClick={() => setDialog({})}><Plus size={16} /> New quote</button>} />
    <ErrorNote message={error || actionError} />
    {notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice>}
    <div className="crm-money-row"><div><span>Awaiting answer</span><strong>{formatMoney(total('sent'))}</strong></div><div><span>Accepted</span><strong>{formatMoney(total('accepted'))}</strong></div><div><span>Drafts</span><strong>{formatMoney(total('draft'))}</strong></div></div>
    <div className="crm-tabs" role="tablist">{(['', 'draft', 'sent', 'accepted', 'declined', 'amended'] as const).map(option => <button type="button" role="tab" key={option || 'all'} aria-selected={filter === option} onClick={() => setFilter(option)}>{option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All'}</button>)}</div>
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !records.length ? <Empty icon={<QuoteIcon size={22} />} title="No quotes">Create a quote from a lead's page, or with New quote above.</Empty>
      : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Quote</th><th>Customer</th><th>Amount</th><th>Status</th><th>Valid until</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {records.map(quote => <tr key={quote.id}><td><strong>{quote.reference}</strong><small>{quote.title}</small><QuoteMeta quote={quote} /></td><td><LeadLinkText id={quote.leadId} name={quote.leadName} /></td><td>{formatMoney(quote.amountPence)}</td><td><QuoteStatusSelect quote={quote} onChange={status => setStatus(quote, status)} /></td><td>{formatDay(quote.validUntil) || '—'}</td><td className="crm-cell-actions crm-cell-doc-actions"><QuoteActions quote={quote} onEdit={() => setDialog({ quote })} onChanged={reload} onRevised={revised => { reload(); setDialog({ quote: revised }); }} onNotice={setNotice} /></td></tr>)}
      </tbody></table></div>}</section>
    {dialog && <Modal title={dialog.quote ? `Edit ${dialog.quote.reference}` : 'New quote'} onClose={() => setDialog(null)}><QuoteForm quote={dialog.quote} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}

/* ---------- Invoices ---------- */
export function InvoicesPage() {
  const { data, error, loading, reload } = useCrm<{ records: Invoice[] }>('/invoices');
  const [filter, setFilter] = useState<'' | Invoice['status'] | 'overdue'>('');
  const [dialog, setDialog] = useState<null | { invoice?: Invoice }>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const all = data?.records || [];
  const records = filter === 'overdue' ? all.filter(isInvoiceOverdue) : filter ? all.filter(invoice => invoice.status === filter) : all;
  const sum = (rows: Invoice[]) => rows.reduce((total, invoice) => total + invoice.amountPence, 0);
  const setStatus = async (invoice: Invoice, status: Invoice['status']) => { setActionError(''); try { await crm(`/invoices/${invoice.id}`, { method: 'PATCH', body: { status } }); reload(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Could not update the invoice.'); } };
  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Invoices" title="Invoices" intro="Track what has been billed and what has been paid. Invoice numbers are assigned automatically." actions={<>
      <a className="crm-button crm-button-ghost" href={csvLink('invoices.csv', { status: filter === 'overdue' ? 'issued' : filter })}><Download size={15} /> Export CSV</a>
      <button type="button" className="crm-button" onClick={() => setDialog({})}><Plus size={16} /> New invoice</button>
    </>} />
    <ErrorNote message={error || actionError} />
    {notice && <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice>}
    <div className="crm-money-row"><div><span>Outstanding</span><strong>{formatMoney(sum(all.filter(invoice => invoice.status === 'issued')))}</strong></div><div className={all.some(isInvoiceOverdue) ? 'crm-money-warn' : ''}><span>Overdue</span><strong>{formatMoney(sum(all.filter(isInvoiceOverdue)))}</strong></div><div><span>Paid</span><strong>{formatMoney(sum(all.filter(invoice => invoice.status === 'paid')))}</strong></div></div>
    <div className="crm-tabs" role="tablist">{(['', 'draft', 'issued', 'overdue', 'paid', 'void'] as const).map(option => <button type="button" role="tab" key={option || 'all'} aria-selected={filter === option} onClick={() => setFilter(option)}>{option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All'}</button>)}</div>
    <section className="admin-panel crm-panel">{loading && !data ? <Loading /> : !records.length ? <Empty icon={<FileText size={22} />} title="No invoices">Create an invoice from an accepted quote on the lead's page, or with New invoice above.</Empty>
      : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Due</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {records.map(invoice => <tr key={invoice.id} className={isInvoiceOverdue(invoice) ? 'crm-overdue' : ''}><td><strong>{invoice.reference}</strong>{invoice.notes && <small>{invoice.notes}</small>}<InvoiceMeta invoice={invoice} /></td><td>{invoice.leadId ? <LeadLinkText id={invoice.leadId} name={invoice.customerName || invoice.leadName} /> : invoice.customerName}</td><td>{formatMoney(invoice.amountPence)}</td><td><InvoiceStatusSelect invoice={invoice} onChange={status => setStatus(invoice, status)} /></td><td>{formatDay(invoice.dueAt) || '—'}{invoice.paidAt && <small>Paid {formatDay(invoice.paidAt)}</small>}</td><td className="crm-cell-actions crm-cell-doc-actions"><InvoiceActions invoice={invoice} onEdit={() => setDialog({ invoice })} onChanged={reload} onNotice={setNotice} /></td></tr>)}
      </tbody></table></div>}</section>
    {dialog && <Modal title={dialog.invoice ? `Edit ${dialog.invoice.reference}` : 'New invoice'} onClose={() => setDialog(null)}><InvoiceForm invoice={dialog.invoice} onCancel={() => setDialog(null)} onSaved={() => { setNotice(resendNotice(dialog.invoice)); setDialog(null); reload(); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}

/* ---------- Calendar ---------- */
type CalendarItem = { id: string; when: Date; label: string; detail: string; href: string; kind: 'visit' | 'task'; done: boolean };

export function CalendarPage() {
  const visits = useCrm<{ records: Visit[] }>('/visits');
  const tasks = useCrm<{ records: Task[] }>('/tasks');
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const items = useMemo<CalendarItem[]>(() => [
    ...(visits.data?.records || []).filter(visit => visit.scheduledAt && visit.status !== 'cancelled').map(visit => ({ id: `v${visit.id}`, when: new Date(String(visit.scheduledAt)), label: visit.leadName || 'Site visit', detail: `Site visit${visit.address ? ` · ${visit.address}` : ''}`, href: visit.leadId ? `/staff/leads/${visit.leadId}` : '/staff/site-visits', kind: 'visit' as const, done: visit.status === 'completed' })),
    ...(tasks.data?.records || []).filter(task => task.dueAt && task.status !== 'cancelled').map(task => ({ id: `t${task.id}`, when: new Date(String(task.dueAt)), label: task.title, detail: task.leadName ? `Task · ${task.leadName}` : 'Task', href: task.leadId ? `/staff/leads/${task.leadId}` : '/staff/tasks', kind: 'task' as const, done: task.status === 'completed' })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime()), [visits.data, tasks.data]);

  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7)); // weeks start on Monday
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) { const list = byDay.get(key(item.when)) || []; list.push(item); byDay.set(key(item.when), list); }
  const todayKey = key(new Date());
  const shift = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const agenda = items.filter(item => !item.done && item.when.getTime() >= Date.now() - 86_400_000).slice(0, 12);

  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Calendar" title="Calendar" intro="Site visits and task due dates in one view." actions={<div className="crm-month-nav"><button type="button" className="crm-icon-button" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button><strong aria-live="polite">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong><button type="button" className="crm-icon-button" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button><button type="button" className="crm-button crm-button-ghost crm-button-small" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button></div>} />
    <ErrorNote message={visits.error || tasks.error} />
    <div className="crm-calendar-layout">
      <section className="admin-panel crm-panel crm-calendar" aria-label="Month view">
        <div className="crm-calendar-head">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="crm-calendar-grid">{days.map(day => <div key={key(day)} className={`crm-day${day.getMonth() !== month.getMonth() ? ' crm-day-outside' : ''}${key(day) === todayKey ? ' crm-day-today' : ''}`}>
          <span className="crm-day-number">{day.getDate()}</span>
          {(byDay.get(key(day)) || []).slice(0, 4).map(item => <Link key={item.id} to={item.href} className={`crm-event crm-event-${item.kind}${item.done ? ' crm-event-done' : ''}`} title={`${item.when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ${item.label} — ${item.detail}`}><time>{item.when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time> {item.label}</Link>)}
          {(byDay.get(key(day)) || []).length > 4 && <small>+{(byDay.get(key(day)) || []).length - 4} more</small>}
        </div>)}</div>
      </section>
      <section className="admin-panel crm-panel" aria-labelledby="agenda-heading"><div className="panel-heading"><h2 id="agenda-heading">Coming up</h2></div>
        {visits.loading && !visits.data ? <Loading /> : !agenda.length ? <Empty icon={<CalendarDays size={22} />} title="Nothing scheduled">Booked visits and due tasks appear here.</Empty>
          : <ul className="crm-rows">{agenda.map(item => <li key={item.id}><Link to={item.href}><strong>{item.label}</strong><span>{item.detail}</span></Link><time>{formatWhen(item.when.toISOString())}</time></li>)}</ul>}
      </section>
    </div>
  </div></AdminWorkspaceShell>;
}

/* ---------- Team ---------- */
type TeamDialog = null | { kind: 'create' } | { kind: 'password'; member: TeamMember };

export function TeamPage() {
  const { data, error, loading, reload } = useCrm<{ team: TeamMember[] }>('/team');
  const [dialog, setDialog] = useState<TeamDialog>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const team = data?.team || [];

  const save = async (member: TeamMember, patch: { role?: TeamRole; isActive?: boolean }) => {
    setActionError('');
    setNotice('');
    try {
      await crm(`/team/${member.id}`, { method: 'PATCH', body: patch });
      reload();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Could not update the team member.');
      reload();
    }
  };

  return <AdminWorkspaceShell><div className="admin-content">
    <PageTitle eyebrow="Team" title="Team &amp; access" intro="Add the people who use the CRM, choose what they can do, and reset a password when needed." actions={<button type="button" className="crm-button" onClick={() => setDialog({ kind: 'create' })}><Plus size={16} /> Add team member</button>} />
    <ErrorNote message={error || actionError} />
    {notice && <div className="form-status success" role="status">{notice}</div>}
    <section className="admin-panel crm-panel">
      {loading && !data ? <Loading /> : !team.length ? <Empty icon={<Users size={22} />} title="No team accounts">Add the first team member to give someone access.</Empty>
        : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Last signed in</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {team.map(member => <tr key={member.id} className={member.isActive ? '' : 'crm-muted'}>
            <td><strong>{member.name}</strong><small>{member.isActive ? 'Active' : 'Deactivated'}</small></td>
            <td>{member.email}</td>
            <td><select className="crm-status-select" aria-label={`Role for ${member.name}`} value={member.role} onChange={event => void save(member, { role: event.target.value as TeamRole })}>
              {(['owner', 'admin', 'staff'] as TeamRole[]).map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select></td>
            <td><label className="crm-check"><input type="checkbox" checked={member.isActive} onChange={event => void save(member, { isActive: event.target.checked })} /> <span>{member.isActive ? 'Can sign in' : 'Blocked'}</span></label></td>
            <td>{member.lastSeenAt ? formatAgo(member.lastSeenAt) : 'Never'}</td>
            <td className="crm-cell-actions"><button type="button" className="crm-link-button" onClick={() => setDialog({ kind: 'password', member })}>Reset password</button></td>
          </tr>)}
        </tbody></table></div>}
    </section>
    {dialog?.kind === 'create' && <Modal title="Add team member" onClose={() => setDialog(null)}><TeamMemberForm onCancel={() => setDialog(null)} onSaved={member => { setDialog(null); setNotice(`${member.name} can now sign in.`); reload(); }} /></Modal>}
    {dialog?.kind === 'password' && <Modal title={`Reset password for ${dialog.member.name}`} onClose={() => setDialog(null)}><TeamPasswordForm member={dialog.member} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); setNotice(`New password saved for ${dialog.member.name}. They have been signed out and must sign in again.`); }} /></Modal>}
  </div></AdminWorkspaceShell>;
}


function TeamMemberForm({ onSaved, onCancel }: { onSaved: (member: TeamMember) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState({ name: '', email: '', role: 'staff' as TeamRole, password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: 'name' | 'email' | 'password') => (event: { target: { value: string } }) => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await crm<{ member: TeamMember }>('/team', { method: 'POST', body: draft });
      onSaved(result.member);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add the team member.');
    } finally {
      setSaving(false);
    }
  };
  return <form className="crm-form" onSubmit={submit}>
    <div className="crm-form-grid">
      <Field label="Name"><input required maxLength={120} value={draft.name} onChange={set('name')} autoComplete="off" /></Field>
      <Field label="Email"><input required type="email" maxLength={190} value={draft.email} onChange={set('email')} autoComplete="off" /></Field>
      <Field label="Role" hint="Owners and administrators can manage the team and reset passwords."><select value={draft.role} onChange={event => setDraft(current => ({ ...current, role: event.target.value as TeamRole }))}>
        {(['staff', 'admin', 'owner'] as TeamRole[]).map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
      </select></Field>
      <Field label="First password" hint="At least 12 characters. Share it privately."><input required type="password" minLength={12} maxLength={200} value={draft.password} onChange={set('password')} autoComplete="new-password" /></Field>
    </div>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : 'Add team member'}</button></div>
  </form>;
}

function TeamPasswordForm({ member, onSaved, onCancel }: { member: TeamMember; onSaved: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await crm(`/team/${member.id}/password`, { method: 'POST', body: { password } });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save the password.');
    } finally {
      setSaving(false);
    }
  };
  return <form className="crm-form" onSubmit={submit}>
    <p className="crm-muted">Set a new password for <strong>{member.name}</strong> ({member.email}). Every session for this account is signed out, so the new password is needed straight away.</p>
    <div className="crm-form-grid">
      <Field label="New password" hint="At least 12 characters." full><input required type="password" minLength={12} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" /></Field>
    </div>
    {error && <p className="crm-form-error" role="alert">{error}</p>}
    <div className="crm-form-actions"><button type="button" className="crm-button crm-button-ghost" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" className="crm-button" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</button></div>
  </form>;
}

