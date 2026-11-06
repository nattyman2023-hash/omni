<?php

declare(strict_types=1);

/*
 * Minimal SMTP client for shared hosting (no exec, no composer).
 *
 * Supports implicit TLS ("ssl", port 465), STARTTLS ("tls", port 587) and plain ("none", local
 * testing), AUTH PLAIN / LOGIN, and multipart/mixed messages with an HTML + plain-text alternative
 * and attachments. A message only counts as sent once the server answers 250 to the end of DATA.
 * Credentials never appear in returned errors.
 */

/**
 * $phase is where it broke: connect | tls | auth | send. $detail is the server's reply or the
 * transport problem (never a credential).
 */
final class SmtpError extends RuntimeException
{
    public function __construct(string $message, public readonly string $phase = 'send', public readonly string $detail = '')
    {
        parent::__construct($message);
    }
}

/** Maps an internal protocol step onto the coarse phases reported to staff. */
function smtpPhase(string $stage): string
{
    return match ($stage) {
        'connect', 'greeting', 'EHLO' => 'connect',
        'STARTTLS', 'TLS handshake' => 'tls',
        'authentication' => 'auth',
        default => 'send',
    };
}

/** Removes CR/LF so a value can never inject extra headers. */
function smtpHeaderValue(string $value): string
{
    return trim((string) preg_replace('/[\r\n\t]+/', ' ', $value));
}

/** RFC 2047 encoded-word (UTF-8, base64) when the value is not plain ASCII; folded at 75 chars. */
function smtpEncodeHeader(string $value): string
{
    $value = smtpHeaderValue($value);
    if (!preg_match('/[^\x20-\x7E]/', $value)) {
        return $value;
    }
    $words = [];
    $chunk = '';
    // Each encoded word must hold whole UTF-8 characters and stay within 75 characters.
    foreach (preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $character) {
        if (strlen(base64_encode($chunk . $character)) > 45) {
            $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?=';
            $chunk = '';
        }
        $chunk .= $character;
    }
    if ($chunk !== '') {
        $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?=';
    }
    return implode("\r\n ", $words);
}

function smtpAddress(string $email, string $name = ''): string
{
    $email = smtpHeaderValue($email);
    $name = smtpHeaderValue($name);
    if ($name === '') {
        return '<' . $email . '>';
    }
    $display = preg_match('/[^\x20-\x7E]/', $name) ? smtpEncodeHeader($name) : '"' . addcslashes($name, '"\\') . '"';
    return $display . ' <' . $email . '>';
}

/** HTML → readable plain text for the text/plain alternative. */
function smtpHtmlToText(string $html): string
{
    $text = preg_replace('#<a\s[^>]*href="([^"]*)"[^>]*>(.*?)</a>#is', '$2 ($1)', $html) ?? $html;
    $text = preg_replace('#<br\s*/?>#i', "\n", $text) ?? $text;
    $text = preg_replace('#</(p|div|h[1-6]|li|tr)>#i', "\n\n", $text) ?? $text;
    $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace("/[ \t]+\n/", "\n", $text) ?? $text;
    $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;
    return trim($text);
}

/**
 * Builds the RFC 5322 message. $message keys: from, fromName, to (list of addresses), replyTo,
 * subject, html, text (optional), attachments (list of {filename, contentType, content}), messageId.
 */
function smtpBuildMessage(array $message): string
{
    $eol = "\r\n";
    $boundaryMixed = 'mixed_' . bin2hex(random_bytes(12));
    $boundaryAlt = 'alt_' . bin2hex(random_bytes(12));
    $html = (string) $message['html'];
    $text = (string) ($message['text'] ?? '') !== '' ? (string) $message['text'] : smtpHtmlToText($html);
    $headers = [
        'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
        'From: ' . smtpAddress((string) $message['from'], (string) ($message['fromName'] ?? '')),
        'To: ' . implode(', ', array_map(fn ($to) => smtpAddress((string) $to), (array) $message['to'])),
    ];
    if (($message['replyTo'] ?? '') !== '') {
        $headers[] = 'Reply-To: ' . smtpAddress((string) $message['replyTo']);
    }
    $headers[] = 'Subject: ' . smtpEncodeHeader((string) $message['subject']);
    $headers[] = 'Message-ID: ' . smtpHeaderValue((string) $message['messageId']);
    // Replies: thread the message under the original in the customer's mail app.
    $inReplyTo = smtpHeaderValue((string) ($message['inReplyTo'] ?? ''));
    if (preg_match('/^<[^<>\s]+>$/', $inReplyTo)) {
        $references = trim(smtpHeaderValue((string) ($message['references'] ?? '')) . ' ' . $inReplyTo);
        $headers[] = 'In-Reply-To: ' . $inReplyTo;
        $headers[] = 'References: ' . $references;
    }
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'X-Mailer: Omni CRM';

    $alternative = '--' . $boundaryAlt . $eol
        . 'Content-Type: text/plain; charset=UTF-8' . $eol
        . 'Content-Transfer-Encoding: base64' . $eol . $eol
        . rtrim(chunk_split(base64_encode($text), 76, $eol)) . $eol
        . '--' . $boundaryAlt . $eol
        . 'Content-Type: text/html; charset=UTF-8' . $eol
        . 'Content-Transfer-Encoding: base64' . $eol . $eol
        . rtrim(chunk_split(base64_encode($html), 76, $eol)) . $eol
        . '--' . $boundaryAlt . '--' . $eol;

    $attachments = $message['attachments'] ?? [];
    if (!$attachments) {
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"';
        return implode($eol, $headers) . $eol . $eol . $alternative;
    }
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundaryMixed . '"';
    $body = '--' . $boundaryMixed . $eol
        . 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"' . $eol . $eol
        . $alternative;
    foreach ($attachments as $attachment) {
        $filename = preg_replace('/[^A-Za-z0-9._ -]+/', '_', (string) $attachment['filename']) ?: 'attachment';
        $type = preg_match('#^[a-z]+/[a-z0-9.+-]+$#i', (string) $attachment['contentType']) ? (string) $attachment['contentType'] : 'application/octet-stream';
        $body .= '--' . $boundaryMixed . $eol
            . 'Content-Type: ' . $type . '; name="' . $filename . '"' . $eol
            . 'Content-Transfer-Encoding: base64' . $eol
            . 'Content-Disposition: attachment; filename="' . $filename . '"' . $eol . $eol
            . rtrim(chunk_split(base64_encode((string) $attachment['content']), 76, $eol)) . $eol;
    }
    $body .= '--' . $boundaryMixed . '--' . $eol;
    return implode($eol, $headers) . $eol . $eol . $body;
}

final class SmtpClient
{
    /** @var resource|null */
    private $socket = null;
    private string $stage = 'connect';
    /** Overrides the phase derived from $stage (an implicit-TLS failure happens while connecting). */
    private ?string $phase = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $secure,
        private readonly string $user,
        private readonly string $password,
        private readonly int $timeout = 20,
    ) {}

    private function fail(string $detail): never
    {
        $detail = mb_substr(smtpHeaderValue($detail), 0, 300);
        throw new SmtpError('SMTP ' . $this->stage . ' failed: ' . $detail, $this->phase ?? smtpPhase($this->stage), $detail);
    }

    private function write(string $data): void
    {
        $length = strlen($data);
        $written = 0;
        while ($written < $length) {
            $result = @fwrite($this->socket, substr($data, $written, 65536));
            if ($result === false || $result === 0) {
                $meta = stream_get_meta_data($this->socket);
                $this->fail(!empty($meta['timed_out']) ? 'the server timed out.' : 'the connection was closed.');
            }
            $written += $result;
        }
    }

    /** @return array{int, string, list<string>} code, last line text, all lines */
    private function read(): array
    {
        $lines = [];
        while (true) {
            $line = @fgets($this->socket, 4096);
            if ($line === false) {
                $meta = stream_get_meta_data($this->socket);
                $this->fail(!empty($meta['timed_out']) ? 'the server timed out.' : 'the connection was closed.');
            }
            $line = rtrim($line, "\r\n");
            $lines[] = $line;
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }
        $last = end($lines);
        return [(int) substr($last, 0, 3), (string) $last, $lines];
    }

    /** @param list<int> $expected */
    private function command(?string $line, array $expected, ?string $stage = null): array
    {
        if ($stage !== null) {
            $this->stage = $stage;
        }
        if ($line !== null) {
            $this->write($line . "\r\n");
        }
        $response = $this->read();
        if (!in_array($response[0], $expected, true)) {
            $this->fail('the server replied "' . $response[1] . '".');
        }
        return $response;
    }

    private function ehlo(string $hostname): array
    {
        [, , $lines] = $this->command('EHLO ' . $hostname, [250], 'EHLO');
        $capabilities = [];
        foreach (array_slice($lines, 1) as $line) {
            $capabilities[] = strtoupper(trim(substr($line, 4)));
        }
        return $capabilities;
    }

    /**
     * Sends one message. Returns normally only when the server accepted it (250 after DATA).
     * @param list<string> $recipients
     */
    public function send(string $from, array $recipients, string $data, string $hostname): void
    {
        $context = stream_context_create(['ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'peer_name' => $this->host,
            'SNI_enabled' => true,
        ]]);
        $scheme = $this->secure === 'ssl' ? 'ssl' : 'tcp';
        $this->stage = 'connect';
        $errno = 0;
        $errstr = '';
        error_clear_last();
        $socket = @stream_socket_client($scheme . '://' . $this->host . ':' . $this->port, $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $context);
        if ($socket === false) {
            $warning = (string) (error_get_last()['message'] ?? '');
            if ($scheme === 'ssl' && preg_match('/ssl|tls|certificate|crypto|handshake/i', $warning . ' ' . $errstr)) {
                $this->phase = 'tls';
                $reason = trim((string) preg_replace('/^.*?\):\s*/', '', $warning));
                $this->fail('the TLS handshake with ' . $this->host . ':' . $this->port . ' failed (' . ($reason !== '' ? $reason : $errstr) . ').');
            }
            $this->fail('could not connect to ' . $this->host . ':' . $this->port . ($errstr !== '' ? ' (' . $errstr . ')' : '') . '.');
        }
        $this->socket = $socket;
        stream_set_timeout($this->socket, $this->timeout);
        try {
            $this->command(null, [220], 'greeting');
            $capabilities = $this->ehlo($hostname);
            if ($this->secure === 'tls') {
                $this->command('STARTTLS', [220], 'STARTTLS');
                $crypto = STREAM_CRYPTO_METHOD_TLS_CLIENT;
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                    $crypto |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
                }
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
                    $crypto |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
                }
                $this->stage = 'TLS handshake';
                if (@stream_socket_enable_crypto($this->socket, true, $crypto) !== true) {
                    $this->fail('the TLS handshake did not complete.');
                }
                $capabilities = $this->ehlo($hostname);
            }
            if ($this->user !== '') {
                $mechanisms = '';
                foreach ($capabilities as $capability) {
                    if (str_starts_with($capability, 'AUTH')) {
                        $mechanisms .= ' ' . substr($capability, 4);
                    }
                }
                if (str_contains($mechanisms, 'PLAIN') || !str_contains($mechanisms, 'LOGIN')) {
                    $this->command('AUTH PLAIN ' . base64_encode("\0" . $this->user . "\0" . $this->password), [235], 'authentication');
                } else {
                    $this->command('AUTH LOGIN', [334], 'authentication');
                    $this->command(base64_encode($this->user), [334]);
                    $this->command(base64_encode($this->password), [235]);
                }
            }
            $this->command('MAIL FROM:<' . smtpHeaderValue($from) . '>', [250], 'MAIL FROM');
            foreach ($recipients as $recipient) {
                $this->command('RCPT TO:<' . smtpHeaderValue($recipient) . '>', [250, 251], 'RCPT TO');
            }
            $this->command('DATA', [354], 'DATA');
            // Normalise line endings and dot-stuff lines that begin with ".".
            $normalised = preg_replace("/\r\n|\r|\n/", "\r\n", $data) ?? $data;
            $stuffed = preg_replace('/^\./m', '..', $normalised) ?? $normalised;
            $this->write(rtrim($stuffed, "\r\n") . "\r\n.\r\n");
            $this->command(null, [250], 'message delivery');
            $this->stage = 'QUIT';
            try {
                $this->write("QUIT\r\n");
                $this->read();
            } catch (SmtpError $ignored) {
                // The message has already been accepted.
            }
        } finally {
            if (is_resource($this->socket)) {
                fclose($this->socket);
            }
            $this->socket = null;
        }
    }
}

/**
 * Sends $message (see smtpBuildMessage) with $config {host, port, secure, user, password, hostname}.
 * Returns ['ok' => bool, 'error' => string, 'stage' => done|connect|tls|auth|send, 'detail' => server reply].
 */
function smtpSend(array $config, array $message): array
{
    try {
        $client = new SmtpClient(
            (string) $config['host'],
            (int) $config['port'],
            strtolower((string) $config['secure']),
            (string) $config['user'],
            (string) $config['password'],
            (int) ($config['timeout'] ?? 20),
        );
        // Envelope sender: providers such as Zoho only relay mail whose MAIL FROM is the signed-in
        // mailbox, so callers pass the login as envelopeFrom; the From: header may still be an alias.
        $envelope = (string) ($message['envelopeFrom'] ?? '') !== '' ? (string) $message['envelopeFrom'] : (string) $message['from'];
        $client->send($envelope, array_values((array) $message['to']), smtpBuildMessage($message), (string) ($config['hostname'] ?? 'localhost'));
        return ['ok' => true, 'error' => '', 'stage' => 'done', 'detail' => ''];
    } catch (SmtpError $error) {
        return ['ok' => false, 'error' => $error->getMessage(), 'stage' => $error->phase, 'detail' => $error->detail];
    } catch (Throwable $error) {
        return ['ok' => false, 'error' => 'SMTP send failed unexpectedly.', 'stage' => 'send', 'detail' => ''];
    }
}
