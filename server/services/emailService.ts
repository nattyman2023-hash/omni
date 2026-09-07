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

/**
 * Provider-neutral notification boundary. No provider is guessed or called
 * until an adapter is deliberately configured, so a saved enquiry is never
 * reported as emailed when it was not.
 */
export async function sendNotification(_input: NotificationInput): Promise<NotificationResult> {
  const outboundEnabled = ['1', 'true', 'yes'].includes(String(process.env.OUTBOUND_MESSAGES_ENABLED || '').trim().toLowerCase());
  if (!outboundEnabled) return { status: 'not-configured' };
  const provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (!provider || !process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM || !process.env.ADMIN_NOTIFICATION_EMAIL) {
    return { status: 'not-configured' };
  }
  return { status: 'failed', error: `No email adapter is implemented for provider "${provider}".` };
}
