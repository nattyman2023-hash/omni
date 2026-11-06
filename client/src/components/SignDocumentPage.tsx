import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate, gbp } from './crm/CrmShared';

type SignDocument = {
  reference: string;
  title: string;
  description: string | null;
  status: string;
  signStatus: string;
  issueDate: string | null;
  validUntil: string | null;
  terms: string | null;
  notes: string | null;
  subtotalPence: number;
  vatRate: number;
  vatPence: number;
  discountPence: number;
  totalPence: number;
  signedAt: string | null;
  signerName: string | null;
  contactName: string;
  contactEmail: string;
};

type SignItem = { description: string; quantity: number; unitPricePence: number; amountPence: number };
type SignCompany = { name: string; email: string; phone: string; address: string };

export function SignDocumentPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [document, setDocument] = useState<SignDocument | null>(null);
  const [items, setItems] = useState<SignItem[]>([]);
  const [company, setCompany] = useState<SignCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<{ document: SignDocument; items: SignItem[]; company: SignCompany }>(`/api/sign/${encodeURIComponent(token)}`)
      .then(payload => {
        if (!active) return;
        setDocument(payload.document);
        setItems(payload.items);
        setCompany(payload.company);
        setSigned(payload.document.signStatus === 'signed');
        setForm({ name: payload.document.signerName || payload.document.contactName || '', email: payload.document.contactEmail || '', consent: false });
        window.document.title = `Sign quotation ${payload.document.reference} | ${payload.company.name}`;
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'This signing link could not be opened.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.consent) { setError('Please tick the box to confirm your signature.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api(`/api/sign/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ name: form.name, email: form.email, consent: true }) });
      setSigned(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your signature could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="sign-page" aria-live="polite"><p className="sign-loading">Loading your quotation…</p></main>;

  if (error && !document) {
    return <main className="sign-page"><section className="sign-card sign-error"><h1>Signing link unavailable</h1><p>{error}</p><Link className="button button-dark" to="/contact">Contact Omni</Link></section></main>;
  }

  if (!document || !company) return null;

  return <main className="sign-page">
    <header className="sign-header">
      <div><span className="sign-mark" aria-hidden="true">O</span><div><strong>{company.name}</strong><small>{company.address}</small></div></div>
      <div className="sign-contact"><span>{company.email}</span><span>{company.phone}</span></div>
    </header>
    <section className="sign-card">
      <div className="sign-title">
        <div>
          <span className="eyebrow">{signed ? 'Signed' : 'Ready to sign'}</span>
          <h1>{document.title}</h1>
          <p>Quotation {document.reference}{document.issueDate ? ` · issued ${formatDate(document.issueDate, false)}` : ''}{document.validUntil ? ` · valid until ${formatDate(document.validUntil, false)}` : ''}</p>
        </div>
        <div className={`sign-status${signed ? ' is-signed' : ''}`}>{signed ? 'Signed' : 'Awaiting signature'}</div>
      </div>

      {document.description && <p className="sign-description">{document.description}</p>}

      <div className="sign-items" role="table">
        <div className="sign-item sign-item-head" role="row"><span>Description</span><span>Qty</span><span>Unit</span><span>Amount</span></div>
        {items.map((item, index) => <div className="sign-item" role="row" key={index}>
          <span>{item.description}</span>
          <span>{item.quantity}</span>
          <span>{gbp(item.unitPricePence)}</span>
          <span>{gbp(item.amountPence)}</span>
        </div>)}
      </div>

      <div className="sign-totals">
        <div><span>Subtotal</span><strong>{gbp(document.subtotalPence)}</strong></div>
        {document.discountPence > 0 && <div><span>Discount</span><strong>-{gbp(document.discountPence)}</strong></div>}
        <div><span>VAT ({document.vatRate}%)</span><strong>{gbp(document.vatPence)}</strong></div>
        <div className="sign-total"><span>Total</span><strong>{gbp(document.totalPence)}</strong></div>
      </div>

      {document.terms && <div className="sign-block"><h2>Terms</h2><p>{document.terms}</p></div>}
      {document.notes && <div className="sign-block"><h2>Notes</h2><p>{document.notes}</p></div>}

      {error && <div className="form-status error" role="alert">{error}</div>}

      {signed
        ? <div className="sign-signed" role="status">
            <h2>Thank you — this quotation is signed.</h2>
            <p>{document.signerName || form.name} signed quotation {document.reference}{document.signedAt ? ` on ${formatDate(document.signedAt, true)}` : ''}. A confirmation has been emailed to you.</p>
          </div>
        : <form className="sign-form" onSubmit={submit}>
            <h2>Sign this quotation</h2>
            <p>By typing your name and ticking the box you are accepting quotation {document.reference} for {gbp(document.totalPence)}.</p>
            <label>Full name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>
            <label>Email address<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
            <label className="sign-consent"><input type="checkbox" checked={form.consent} onChange={event => setForm({ ...form, consent: event.target.checked })} /> I agree that this typed name is my electronic signature and I accept this quotation.</label>
            <button type="submit" className="button button-dark" disabled={submitting}>{submitting ? 'Recording signature…' : 'Sign and accept quotation'}</button>
          </form>}
    </section>
    <footer className="sign-footer"><span>{company.name}</span><Link to="/">omnidevelopment.co.uk</Link></footer>
  </main>;
}

