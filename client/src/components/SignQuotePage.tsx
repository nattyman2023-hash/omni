import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Download, FileWarning, Mail, Phone, XCircle } from 'lucide-react';
import { SignDocument, formatDay, formatMoney, formatPercent, formatQuantity, formatWhen } from './crm/crmApi';

/*
 * Customer-facing quote review and e-signature page (/sign/:token).
 * It has no staff layout and deliberately uses plain fetch: the staff `crm()` helper
 * redirects a 401 to the staff sign-in, which a customer must never see.
 */

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; document: SignDocument }
  | { kind: 'problem'; status: number; message: string };

async function readJson(response: Response) {
  return await response.json().catch(() => ({})) as { document?: SignDocument; message?: string };
}

function problemMessage(status: number, serverMessage?: string) {
  if (status === 404) return 'We don’t recognise this signing link. Please check you have used the full link from your email, or contact us for a new one.';
  if (status === 410) return serverMessage || 'This quote is no longer available to sign. It may have been replaced by a newer version or have expired.';
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (status === 0) return 'We couldn’t reach the server. Check your connection and try again.';
  return serverMessage || 'Something went wrong loading this quote. Please try again later.';
}

const isSigned = (document: SignDocument) => Boolean(document.signedAt) || document.status === 'accepted';
const isDeclined = (document: SignDocument) => document.status === 'declined';

export default function SignQuotePage() {
  const { token = '' } = useParams();
  const base = `/api/sign/${encodeURIComponent(token)}`;
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [justSigned, setJustSigned] = useState(false);
  const [justDeclined, setJustDeclined] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let live = true;
    setState(current => current.kind === 'ready' ? current : { kind: 'loading' });
    fetch(base, { headers: { Accept: 'application/json' } })
      .then(async response => {
        const payload = await readJson(response);
        if (!live) return;
        if (response.ok && payload.document) setState({ kind: 'ready', document: payload.document });
        else setState({ kind: 'problem', status: response.status, message: problemMessage(response.status, payload.message) });
      })
      .catch(() => { if (live) setState({ kind: 'problem', status: 0, message: problemMessage(0) }); });
    return () => { live = false; };
  }, [base, version]);

  useEffect(() => {
    if (state.kind !== 'ready') return;
    const { document: doc } = state;
    window.document.title = `${isSigned(doc) ? 'Signed' : isDeclined(doc) ? 'Declined' : 'Review and respond'}: quote ${doc.reference}${doc.company?.name ? ` | ${doc.company.name}` : ''}`;
  }, [state]);

  useEffect(() => { if (justSigned || justDeclined) statusRef.current?.focus(); }, [justSigned, justDeclined]);
  useEffect(() => { if (formError) errorRef.current?.focus(); }, [formError]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim()) { setFormError('Please type your full name to sign.'); return; }
    if (!agree) { setFormError('Please tick the box to confirm you accept the quote and its terms.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name: name.trim(), agree: true }) });
      const payload = await readJson(response);
      if (response.ok && payload.document) {
        setState({ kind: 'ready', document: payload.document });
        setJustSigned(true);
      } else if (response.status === 409) {
        // Already signed (perhaps in another tab): show the signed state.
        setVersion(value => value + 1);
      } else if (response.status === 404 || response.status === 410) {
        setState({ kind: 'problem', status: response.status, message: problemMessage(response.status, payload.message) });
      } else {
        setFormError(payload.message || problemMessage(response.status));
      }
    } catch {
      setFormError(problemMessage(0));
    } finally {
      setSubmitting(false);
    }
  };

  const decline = async () => {
    if (submitting) return;
    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ decision: 'decline', reason: declineReason.trim() }) });
      const payload = await readJson(response);
      if (response.ok && payload.document) {
        setState({ kind: 'ready', document: payload.document });
        setJustDeclined(true);
      } else if (response.status === 409) {
        setVersion(value => value + 1);
      } else {
        setFormError(payload.message || problemMessage(response.status));
      }
    } catch {
      setFormError(problemMessage(0));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === 'loading') return <SignShell><div className="sign-card sign-center" aria-live="polite"><p>Loading your quote…</p></div></SignShell>;
  if (state.kind === 'problem') return <SignShell><div className="sign-card sign-center" role="alert">
    <FileWarning size={34} aria-hidden="true" className="sign-problem-icon" />
    <h1>{state.status === 404 ? 'Link not recognised' : state.status === 410 ? 'This quote can no longer be signed' : 'We couldn’t load this quote'}</h1>
    <p>{state.message}</p>
    {state.status !== 404 && state.status !== 410 && <button type="button" className="sign-button" onClick={() => setVersion(value => value + 1)}>Try again</button>}
  </div></SignShell>;

  const doc = state.document;
  const signed = isSigned(doc);
  const declined = isDeclined(doc);
  const items = doc.items || [];
  const expired = Boolean(doc.validUntil) && String(doc.validUntil) < new Date().toISOString().slice(0, 10);

  return <SignShell>
    <article className="sign-card" aria-labelledby="sign-title">
      <header className="sign-company">
        <div>
          <img className="sign-logo" src="/brand/omni-logo-dark.png" alt={doc.company?.name || 'Omni Developments Ltd'} width={776} height={200} />
          {doc.company?.address && <p>{doc.company.address}</p>}
        </div>
        <ul>
          {doc.company?.phone && <li><Phone size={14} aria-hidden="true" /> <a href={`tel:${doc.company.phone.replace(/[^\d+]/g, '')}`}>{doc.company.phone}</a></li>}
          {doc.company?.email && <li><Mail size={14} aria-hidden="true" /> <a href={`mailto:${doc.company.email}`}>{doc.company.email}</a></li>}
        </ul>
      </header>

      <div className="sign-heading">
        <span className="eyebrow">Quote {doc.reference}{doc.version > 1 ? ` · version ${doc.version}` : ''}</span>
        <h1 id="sign-title">{doc.title}</h1>
        <dl className="sign-facts">
          <div><dt>Prepared for</dt><dd>{doc.customerName}</dd></div>
          {doc.validUntil && <div><dt>Valid until</dt><dd>{formatDay(doc.validUntil)}</dd></div>}
          <div><dt>Total</dt><dd>{formatMoney(doc.totalPence)}</dd></div>
        </dl>
        <a className="sign-pdf" href={`${base}/pdf`} target="_blank" rel="noreferrer"><Download size={15} aria-hidden="true" /> Download PDF</a>
      </div>

      <div className="sign-table-wrap">
        <table className="sign-table">
          <caption className="sr-only">Items in this quote</caption>
          <thead><tr><th scope="col">Description</th><th scope="col" className="sign-num">Qty</th><th scope="col" className="sign-num">Unit price</th><th scope="col" className="sign-num">Amount</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={item.id ?? index}>
            <td data-label="Description">{item.description}</td>
            <td data-label="Qty" className="sign-num">{formatQuantity(item.quantity)}</td>
            <td data-label="Unit price" className="sign-num">{formatMoney(item.unitPricePence)}</td>
            <td data-label="Amount" className="sign-num">{formatMoney(item.amountPence)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <dl className="sign-totals">
        <div><dt>Subtotal</dt><dd>{formatMoney(doc.subtotalPence)}</dd></div>
        <div><dt>VAT{doc.vatRatePercent ? ` (${formatPercent(doc.vatRatePercent)})` : ''}</dt><dd>{formatMoney(doc.vatPence)}</dd></div>
        <div className="sign-grand"><dt>Total</dt><dd>{formatMoney(doc.totalPence)}</dd></div>
      </dl>

      {doc.notes && <section className="sign-section" aria-labelledby="sign-notes"><h2 id="sign-notes">Notes</h2><p>{doc.notes}</p></section>}
      {doc.terms && <section className="sign-section" aria-labelledby="sign-terms"><h2 id="sign-terms">Terms and conditions</h2><div className="sign-terms" tabIndex={0}>{doc.terms}</div></section>}

      {signed ? <div className="sign-signed" role="status" tabIndex={-1} ref={statusRef}>
        <CheckCircle2 size={26} aria-hidden="true" />
        <div>
          <h2>{justSigned ? 'Thank you — your quote is signed' : 'This quote has been signed'}</h2>
          <p>Signed by <strong>{doc.signedName || doc.customerName}</strong>{doc.signedAt ? ` on ${formatWhen(doc.signedAt)}` : ''}.{justSigned ? ' A confirmation email is on its way, and we’ll be in touch about next steps.' : ''}</p>
          <p>You can download a copy of the quote for your records using the link above.</p>
        </div>
      </div> : declined ? <div className="sign-signed sign-declined" role="status" tabIndex={-1} ref={statusRef}>
        <XCircle size={26} aria-hidden="true" />
        <div><h2>{justDeclined ? 'Thank you — your response has been recorded' : 'This quote was declined'}</h2><p>Omni Developments can see your decision in the CRM and automatic quote reminders have stopped.</p>{doc.declinedReason && <p><strong>Your note:</strong> {doc.declinedReason}</p>}</div>
      </div> : expired ? <div className="sign-signed sign-expired" role="status">
        <FileWarning size={26} aria-hidden="true" />
        <div><h2>This quote has expired</h2><p>It was valid until {formatDay(doc.validUntil)}. Please contact us for an updated quote.</p></div>
      </div> : <form className="sign-form" onSubmit={submit} aria-labelledby="sign-form-title" noValidate>
        <h2 id="sign-form-title">Accept and sign</h2>
        <p>To accept this quote, type your full name and confirm below. This acts as your electronic signature.</p>
        <label htmlFor="sign-name">Full name</label>
        <input id="sign-name" name="name" autoComplete="name" required maxLength={190} value={name} onChange={event => setName(event.target.value)} disabled={submitting} aria-describedby={formError ? 'sign-error' : undefined} />
        <label className="sign-agree" htmlFor="sign-agree-box">
          <input id="sign-agree-box" type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} disabled={submitting} />
          <span>I agree to quote {doc.reference} for {formatMoney(doc.totalPence)}{doc.terms ? ' and the terms and conditions above' : ''}.</span>
        </label>
        {formError && <p className="sign-error" id="sign-error" role="alert" tabIndex={-1} ref={errorRef}>{formError}</p>}
        <div className="sign-decision-actions"><button type="submit" className="sign-button" disabled={submitting}>{submitting ? 'Saving…' : 'Sign and accept quote'}</button><button type="button" className="sign-button sign-button-decline" disabled={submitting} onClick={() => setShowDecline(value => !value)}>Decline quote</button></div>
        {showDecline && <div className="sign-decline-box"><label htmlFor="decline-reason">Reason (optional)</label><textarea id="decline-reason" rows={3} maxLength={1000} value={declineReason} onChange={event => setDeclineReason(event.target.value)} placeholder="Tell us what did not work for you, if you would like to." /><button type="button" className="sign-button sign-button-decline" disabled={submitting} onClick={() => void decline()}>{submitting ? 'Saving…' : 'Confirm decline'}</button></div>}
      </form>}
    </article>
  </SignShell>;
}

function SignShell({ children }: { children: ReactNode }) {
  return <main id="main-content" className="sign-page">{children}</main>;
}
