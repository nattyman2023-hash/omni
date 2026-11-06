/**
 * Template rendering for CRM email. Templates are stored in the database
 * (crm_email_templates) but this module also holds the defaults so the system
 * works before the seed row exists, and so placeholders can be rendered in a
 * single, testable place.
 */
export type TemplateVariables = Record<string, unknown>;

export type TemplateDefinition = {
  key: string;
  name: string;
  subject: string;
  body: string;
};

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function lookup(variables: TemplateVariables, path: string): string {
  let current: unknown = variables;
  for (const part of path.split('.')) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  if (current === null || current === undefined) return '';
  return typeof current === 'string' ? current : String(current);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render a template for HTML email — values are escaped to prevent injection. */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER, (_match, key: string) => escapeHtml(lookup(variables, key)));
}

/** Render a template for a plain subject line — values are inserted verbatim. */
export function renderPlainTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER, (_match, key: string) => lookup(variables, key));
}

/** Strip HTML so every message has a sensible plain-text alternative. */
export function toPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Wrap a template body in the branded Omni email shell. */
export function wrapEmailHtml(body: string, heading: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#17263c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f8;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe6ee;">
<tr><td style="background:#17263c;padding:22px 28px;color:#ffffff;font-size:18px;font-weight:bold;">Omni Developments</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.65;color:#25344a;">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f7f9fb;border-top:1px solid #e6ecf2;color:#63738a;font-size:12px;line-height:1.5;">Omni Developments Ltd &middot; admin@omnidevelopment.co.uk &middot; 07928 149 731</td></tr>
</table></td></tr></table></body></html>`;
}

/** Fallback templates — mirror the rows seeded by migration 004. */
export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    key: 'quote_issued',
    name: 'Quote / contract issued',
    subject: 'Your quotation {{quote.reference}} from {{company.name}}',
    body: '<p>Hi {{contact.firstName}},</p><p>Please find attached quotation <strong>{{quote.reference}}</strong> for {{quote.title}}.</p><p>You can review and sign it online here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Total: {{quote.total}}</p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'quote_reminder_1',
    name: 'Quote not signed - reminder 1',
    subject: 'A quick reminder about quotation {{quote.reference}}',
    body: '<p>Hi {{contact.firstName}},</p><p>Just following up on quotation <strong>{{quote.reference}}</strong>. If you would like to go ahead, you can sign it here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Happy to answer any questions.</p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'quote_reminder_2',
    name: 'Quote not signed - reminder 2',
    subject: 'Still holding quotation {{quote.reference}} for you',
    body: '<p>Hi {{contact.firstName}},</p><p>We are still holding quotation <strong>{{quote.reference}}</strong> for you. You can review and sign it here: <a href="{{sign.link}}">{{sign.link}}</a></p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'quote_accepted',
    name: 'Quote signed / accepted',
    subject: 'Thank you for signing quotation {{quote.reference}}',
    body: '<p>Hi {{contact.firstName}},</p><p>Thank you for signing quotation <strong>{{quote.reference}}</strong>. We will be in touch about the next steps.</p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'invoice_issued',
    name: 'Invoice issued',
    subject: 'Invoice {{invoice.reference}} from {{company.name}}',
    body: '<p>Hi {{contact.firstName}},</p><p>Please find attached invoice <strong>{{invoice.reference}}</strong>.</p><p>Amount due: {{invoice.total}}<br />Due date: {{invoice.dueDate}}</p><p>{{invoice.paymentDetails}}</p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'invoice_reminder',
    name: 'Invoice reminder',
    subject: 'Reminder: invoice {{invoice.reference}} is due',
    body: '<p>Hi {{contact.firstName}},</p><p>This is a friendly reminder that invoice <strong>{{invoice.reference}}</strong> ({{invoice.total}}) is due on {{invoice.dueDate}}.</p><p>{{invoice.paymentDetails}}</p><p>Kind regards,<br />{{company.name}}</p>',
  },
  {
    key: 'lead_acknowledgement',
    name: 'New enquiry acknowledgement',
    subject: 'Thanks for your enquiry, {{contact.firstName}}',
    body: '<p>Hi {{contact.firstName}},</p><p>Thank you for getting in touch with {{company.name}}. We have received your enquiry and a member of the team will be in contact shortly.</p><p>Kind regards,<br />{{company.name}}</p>',
  },
];

export function findDefaultTemplate(key: string): TemplateDefinition | undefined {
  return DEFAULT_TEMPLATES.find(template => template.key === key);
}

