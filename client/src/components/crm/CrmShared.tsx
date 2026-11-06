import { ReactNode } from 'react';

export type LineItem = { description: string; quantity: string; unitPrice: string };

export const gbp = (pence: unknown) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((Number(pence) || 0) / 100);

export function formatDate(value: unknown, withTime = false) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { message?: string }).message || 'The request could not be completed.');
  return payload as T;
}

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro: string; action?: ReactNode }) {
  return <div className="admin-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{action}</div>;
}

export function Badge({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  return <span className={`crm-badge${tone ? ` crm-badge-${tone}` : ''}`}>{children}</span>;
}

export function statusTone(status: string): 'ok' | 'warn' | 'bad' | undefined {
  if (['paid', 'accepted', 'signed', 'won', 'sent'].includes(status)) return 'ok';
  if (['draft', 'awaiting', 'issued', 'pending', 'viewed'].includes(status)) return 'warn';
  if (['declined', 'void', 'expired', 'failed', 'lost', 'overdue'].includes(status)) return 'bad';
  return undefined;
}

export const emptyLine: LineItem = { description: '', quantity: '1', unitPrice: '' };

export function LineItemsEditor({ items, onChange }: { items: LineItem[]; onChange: (items: LineItem[]) => void }) {
  const update = (index: number, patch: Partial<LineItem>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const amount = (item: LineItem) => Math.round((Number(item.quantity) || 0) * Math.round((Number(item.unitPrice) || 0) * 100));
  const total = items.reduce((sum, item) => sum + amount(item), 0);
  return <div className="crm-line-items">
    <div className="crm-line-item crm-line-head" aria-hidden="true"><span>Description</span><span>Qty</span><span>Unit (£)</span><span>Amount</span><span /></div>
    {items.map((item, index) => <div className="crm-line-item" key={index}>
      <input aria-label={`Item ${index + 1} description`} value={item.description} onChange={event => update(index, { description: event.target.value })} placeholder="Stage or item description" />
      <input aria-label={`Item ${index + 1} quantity`} value={item.quantity} onChange={event => update(index, { quantity: event.target.value })} inputMode="decimal" />
      <input aria-label={`Item ${index + 1} unit price`} value={item.unitPrice} onChange={event => update(index, { unitPrice: event.target.value })} inputMode="decimal" placeholder="0.00" />
      <strong>{gbp(amount(item))}</strong>
      <button type="button" className="crm-icon-button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Remove item ${index + 1}`}>×</button>
    </div>)}
    <div className="crm-line-footer">
      <button type="button" className="button button-outline crm-small" onClick={() => onChange([...items, { ...emptyLine }])}>Add line</button>
      <span>Items total <strong>{gbp(total)}</strong></span>
    </div>
  </div>;
}

export function toItemsPayload(items: LineItem[]) {
  return items
    .filter(item => item.description.trim())
    .map(item => ({ description: item.description.trim(), quantity: Number(item.quantity) || 1, unitPricePence: Math.round((Number(item.unitPrice) || 0) * 100) }));
}

export function itemsToLines(items: Array<{ description: string; quantity: number | string; unit_price_pence: number }>): LineItem[] {
  return items.map(item => ({ description: item.description, quantity: String(item.quantity), unitPrice: (item.unit_price_pence / 100).toFixed(2) }));
}
