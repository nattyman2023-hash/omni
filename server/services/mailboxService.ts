import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export type InboundEmail = {
  uid: number;
  messageId: string;
  fromAddress: string;
  fromName: string;
  toAddress: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string;
};

function env(name: string): string {
  return String(process.env[name] || '').trim();
}

export function imapConfigured(): boolean {
  return Boolean(env('IMAP_HOST') && env('IMAP_USER') && env('IMAP_PASSWORD'));
}

function buildClient(): ImapFlow {
  const port = Number(env('IMAP_PORT') || 993);
  const secure = env('IMAP_SECURE') ? ['1', 'true', 'yes', 'on'].includes(env('IMAP_SECURE').toLowerCase()) : true;
  return new ImapFlow({
    host: env('IMAP_HOST'),
    port,
    secure,
    auth: { user: env('IMAP_USER'), pass: env('IMAP_PASSWORD') },
    logger: false,
  });
}

/**
 * Poll the configured mailbox and return the most recent messages. The
 * connection is opened, read and closed on every call so a dormant mailbox
 * never holds an idle socket open on shared hosting.
 */
export async function fetchInboundEmails(options: { limit?: number } = {}): Promise<InboundEmail[]> {
  if (!imapConfigured()) return [];
  const client = buildClient();
  const results: InboundEmail[] = [];
  await client.connect();
  const lock = await client.getMailboxLock(env('IMAP_MAILBOX') || 'INBOX');
  try {
    const exists = typeof client.mailbox === 'object' && client.mailbox ? client.mailbox.exists : 0;
    if (!exists) return results;
    const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
    const start = Math.max(1, exists - limit + 1);
    const messages = await client.fetchAll(`${start}:*`, { source: true, uid: true, internalDate: true });
    for (const message of messages) {
      if (!message.source) continue;
      const parsed = await simpleParser(message.source);
      const from = parsed.from?.value?.[0];
      const to = Array.isArray(parsed.to) ? parsed.to : parsed.to ? [parsed.to] : [];
      results.push({
        uid: message.uid,
        messageId: parsed.messageId || `imap-uid-${message.uid}`,
        fromAddress: from?.address || '',
        fromName: from?.name || '',
        toAddress: to.map(address => address.text).join(', '),
        subject: parsed.subject || '(no subject)',
        text: parsed.text || '',
        html: typeof parsed.html === 'string' ? parsed.html : '',
        receivedAt: (message.internalDate ? new Date(message.internalDate) : new Date()).toISOString(),
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
  return results;
}

export async function verifyImap(): Promise<{ ok: boolean; error?: string }> {
  if (!imapConfigured()) return { ok: false, error: 'IMAP is not configured.' };
  const client = buildClient();
  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'IMAP verification failed.' };
  }
}
