import nodemailer, { type Transporter } from 'nodemailer';
import { escapeHtml, toPlainText, wrapEmailHtml } from './templates';

export type NotificationInput = {
  kind: 'contact' | 'quote';
  reference: string;
  name: string;
  email: string;
  summary: string;
};

export type NotificationResult = {
  status: 'not-configured' | 'failed' | 'sent';
  error?: string;
};

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  status: 'sent' | 'not-configured' | 'failed';
  error?: string;
  messageId?: string;
};

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

/** SMTP is only considered configured when host, user, password and a sender exist. */
export function smtpConfigured(): boolean {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD') && fromAddress());
}

export function fromAddress(): string {
  const configured = env('EMAIL_FROM');
  if (configured) return configured;
  if (env('SMTP_USER')) return `Omni Developments <${env('SMTP_USER')}>`;
  return '';
}

let transporter: Transporter | null = null;
let transporterSignature = '';

function getTransporter(): Transporter {
  const signature = [env('SMTP_HOST'), env('SMTP_PORT'), env('SMTP_SECURE'), env('SMTP_USER')].join('|');
  if (transporter && transporterSignature === signature) return transporter;
  const port = Number(env('SMTP_PORT') || 587);
  const secure = ['1', 'true', 'yes', 'on'].includes(env('SMTP_SECURE').toLowerCase()) || port === 465;
  transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASSWORD') },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });
  transporterSignature = signature;
  return transporter;
}

/** Drop the cached connection so a later send picks up changed environment values. */
export function resetTransporter(): void {
  transporter = null;
  transporterSignature = '';
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!smtpConfigured()) return { status: 'not-configured' };
  try {
    const info = await getTransporter().sendMail({
      from: input.from || fromAddress(),
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      replyTo: input.replyTo || env('EMAIL_REPLY_TO') || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text || toPlainText(input.html),
      attachments: input.attachments?.map(attachment => ({ filename: attachment.filename, content: attachment.content, contentType: attachment.contentType })),
    });
    return { status: 'sent', messageId: info.messageId };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'The SMTP server rejected the message.' };
  }
}

export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) return { ok: false, error: 'SMTP is not configured.' };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'SMTP verification failed.' };
  }
}

/**
 * Notify the business inbox when a public enquiry or quote request arrives.
 * Returns not-configured (never a false "sent") when outbound mail is disabled.
 */
export async function sendNotification(input: NotificationInput): Promise<NotificationResult> {
  const outboundEnabled = ['1', 'true', 'yes', 'on'].includes(env('OUTBOUND_MESSAGES_ENABLED').toLowerCase());
  if (!outboundEnabled) return { status: 'not-configured' };
  const adminTo = env('ADMIN_NOTIFICATION_EMAIL') || env('EMAIL_REPLY_TO') || env('SMTP_USER');
  if (!smtpConfigured() || !adminTo) return { status: 'not-configured' };
  const label = input.kind === 'quote' ? 'Quote request' : 'Website enquiry';
  const html = wrapEmailHtml(
    `<p><strong>New ${label}: ${escapeHtml(input.reference)}</strong></p><p>${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p><p>${escapeHtml(input.summary)}</p><p>Reply directly to this message to respond to the customer.</p>`,
    `New ${label} ${input.reference}`,
  );
  const result = await sendEmail({
    to: adminTo,
    replyTo: input.email,
    subject: `New ${label} ${input.reference} from ${input.name}`,
    html,
  });
  if (result.status === 'sent') return { status: 'sent' };
  return { status: 'failed', error: result.error || 'The notification could not be sent.' };
}

