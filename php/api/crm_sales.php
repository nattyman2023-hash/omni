<?php

declare(strict_types=1);

/*
 * CRM sales documents for the PHP (shared-hosting) API: quote/invoice line items and VAT, PDFs,
 * e-signature, emailing over SMTP, inbox sync over IMAP, templates, automatic follow-ups and
 * company settings. The HTTP contract is docs/CRM_SALES.md.
 *
 * Loaded by crm.php and uses its helpers (crmValidate, crmInsert, crmUpdate, crmGet, crmList,
 * crmLog, crmMoveStage, crmQuoteStatusEffects, crmLookups ...) plus index.php's (database(),
 * fail(), setting(), flag(), rateLimit(), clientIp()). SQL is prepared; column names come only
 * from CRM_COLUMNS or fixed literals.
 */

require_once __DIR__ . '/lib/pdf.php';
require_once __DIR__ . '/lib/smtp.php';

const CRM_MIGRATION_LOCK = 'omni_developments_schema_migrations';
/** Migrations from this number on are applied by the API itself (001-004 predate auto-apply). */
const CRM_AUTO_MIGRATION_FROM = 5;
const CRM_FOLLOWUP_DAYS = 3;
const CRM_FOLLOWUP_MAX = 3;
const CRM_FOLLOWUP_LAZY_SECONDS = 600;
const CRM_MAX_ITEMS = 200;
const CRM_IMAP_BATCH = 50;
const CRM_SIGNED_MESSAGE = 'This quote has been signed. Revise it to make changes.';
const CRM_TEMPLATE_KEYS = ['quote_issued', 'quote_copy', 'quote_reminder', 'quote_accepted', 'quote_declined', 'invoice_issued', 'invoice_reminder'];
const CRM_PLACEHOLDERS_COMMON = ['lead.name', 'lead.firstName', 'company.name', 'company.phone', 'company.email', 'message'];
const CRM_PLACEHOLDERS_QUOTE = ['quote.reference', 'quote.title', 'quote.total', 'quote.validUntil', 'sign.link'];
const CRM_PLACEHOLDERS_INVOICE = ['invoice.reference', 'invoice.total', 'invoice.dueDate', 'invoice.paymentDetails'];

/** API field => [site_settings key, kind, default]. */
const CRM_COMPANY_SETTINGS = [
    'companyName' => ['crm.company_name', 'text', 'Omni Developments Ltd'],
    'companyAddress' => ['crm.company_address', 'text', '68 Woodham Road, Manchester, M23 0NS'],
    'companyEmail' => ['crm.company_email', 'text', 'admin@omnidevelopment.co.uk'],
    'companyPhone' => ['crm.company_phone', 'text', '07928 149 731'],
    'companyVatNumber' => ['crm.company_vat_number', 'text', ''],
    'companyNumber' => ['crm.company_number', 'text', ''],
    'companyWebsite' => ['crm.company_website', 'text', ''],
    'bankAccountName' => ['crm.bank_account_name', 'text', 'Omni Developments Manchester Limited'],
    'bankName' => ['crm.bank_name', 'text', 'NatWest'],
    'bankSortCode' => ['crm.bank_sort_code', 'text', '60-15-25'],
    'bankAccountNumber' => ['crm.bank_account_number', 'text', '65714946'],
    'paymentTermsDays' => ['crm.payment_terms_days', 'int', '7'],
    'defaultVatRatePercent' => ['crm.default_vat_rate_bp', 'bp', '0'],
    'quoteTerms' => ['crm.quote_terms', 'text', ''],
];

/* ---------------------------------------------------------------------------
 * Automatic migrations
 * ------------------------------------------------------------------------ */

/** Deploy packages ship migrations in api/private/migrations (web-denied); the repository keeps them in database/migrations. */
function crmMigrationDirectory(): ?string
{
    foreach ([__DIR__ . '/private/migrations', dirname(__DIR__, 2) . '/database/migrations'] as $directory) {
        if (is_dir($directory)) {
            return $directory;
        }
    }
    return null;
}

/** Files (version => path) that the API may apply itself. */
function crmAutoMigrations(): array
{
    $directory = crmMigrationDirectory();
    if ($directory === null) {
        return [];
    }
    $files = [];
    foreach (scandir($directory) ?: [] as $file) {
        if (preg_match('/^(\d+)_[A-Za-z0-9_]+\.sql$/', $file, $match) && (int) $match[1] >= CRM_AUTO_MIGRATION_FROM) {
            $files[substr($file, 0, -4)] = $directory . '/' . $file;
        }
    }
    ksort($files, SORT_STRING);
    return $files;
}

/**
 * Splits a SQL script into statements on top-level semicolons, respecting quoted strings,
 * backticks and comments (template bodies contain HTML entities with semicolons).
 */
function crmSplitSql(string $sql): array
{
    $statements = [];
    $current = '';
    $length = strlen($sql);
    $quote = null;
    for ($i = 0; $i < $length; $i++) {
        $char = $sql[$i];
        $next = $i + 1 < $length ? $sql[$i + 1] : '';
        if ($quote !== null) {
            $current .= $char;
            if ($char === '\\' && $quote !== '`') {
                $current .= $next;
                $i++;
            } elseif ($char === $quote) {
                if ($next === $quote) {
                    $current .= $next;
                    $i++;
                } else {
                    $quote = null;
                }
            }
            continue;
        }
        if ($char === '-' && $next === '-' && ($i + 2 >= $length || ctype_space($sql[$i + 2]))) {
            $end = strpos($sql, "\n", $i);
            $i = $end === false ? $length : $end;
            $current .= "\n";
            continue;
        }
        if ($char === '#') {
            $end = strpos($sql, "\n", $i);
            $i = $end === false ? $length : $end;
            $current .= "\n";
            continue;
        }
        if ($char === '/' && $next === '*') {
            $end = strpos($sql, '*/', $i + 2);
            $i = $end === false ? $length : $end + 1;
            $current .= ' ';
            continue;
        }
        if ($char === "'" || $char === '"' || $char === '`') {
            $quote = $char;
            $current .= $char;
            continue;
        }
        if ($char === ';') {
            if (trim($current) !== '') {
                $statements[] = trim($current);
            }
            $current = '';
            continue;
        }
        $current .= $char;
    }
    if (trim($current) !== '') {
        $statements[] = trim($current);
    }
    return $statements;
}

function crmAppliedMigrations(PDO $pdo, array $versions): array
{
    if (!$versions) {
        return [];
    }
    $marks = implode(',', array_fill(0, count($versions), '?'));
    $statement = $pdo->prepare("SELECT version FROM schema_migrations WHERE version IN ($marks)");
    $statement->execute($versions);
    return array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN));
}

/**
 * Applies pending 005+ migrations once. Concurrent requests serialise on a MySQL named lock and
 * re-check after acquiring it, so each file runs at most once; the files are repeatable anyway.
 */
function crmEnsureMigrations(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $files = crmAutoMigrations();
    $pdo = database();
    $pending = array_diff(array_keys($files), crmAppliedMigrations($pdo, array_keys($files)));
    if (!$pending) {
        $done = true;
        return;
    }
    $lock = $pdo->prepare('SELECT GET_LOCK(?, 60)');
    $lock->execute([CRM_MIGRATION_LOCK]);
    if ((int) $lock->fetchColumn() !== 1) {
        throw new RuntimeException('Could not acquire the schema migration lock.');
    }
    $emulated = $pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES);
    try {
        // PREPARE/EXECUTE (used by the guarded ALTERs) only work over the text protocol.
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        foreach (array_diff(array_keys($files), crmAppliedMigrations($pdo, array_keys($files))) as $version) {
            $sql = file_get_contents($files[$version]);
            if ($sql === false) {
                throw new RuntimeException("Migration $version could not be read.");
            }
            foreach (crmSplitSql($sql) as $index => $statement) {
                try {
                    $result = $pdo->query($statement);
                    if ($result instanceof PDOStatement) {
                        // Drain any result set (EXECUTE of 'SELECT 1') before the next statement.
                        if ($result->columnCount() > 0) {
                            $result->fetchAll();
                        }
                        $result->closeCursor();
                    }
                } catch (PDOException $error) {
                    error_log("[omni-api] migration $version statement " . ($index + 1) . ' failed: ' . $error->getMessage());
                    throw $error;
                }
            }
            if (!in_array($version, crmAppliedMigrations($pdo, [$version]), true)) {
                throw new RuntimeException("Migration $version did not record itself in schema_migrations.");
            }
            error_log("[omni-api] applied migration $version");
        }
    } finally {
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, $emulated);
        $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([CRM_MIGRATION_LOCK]);
    }
    $done = true;
}

/* ---------------------------------------------------------------------------
 * Company settings
 * ------------------------------------------------------------------------ */

function crmSettingsRaw(bool $refresh = false): array
{
    static $cache = null;
    if ($cache === null || $refresh) {
        $rows = database()->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'crm.%'")->fetchAll();
        $cache = [];
        foreach ($rows as $row) {
            $cache[(string) $row['setting_key']] = (string) ($row['setting_value'] ?? '');
        }
    }
    return $cache;
}

function crmBpToPercent(int $bp): int|float
{
    return $bp % 100 === 0 ? intdiv($bp, 100) : $bp / 100;
}

function crmCompanySettings(): array
{
    $raw = crmSettingsRaw();
    $out = [];
    foreach (CRM_COMPANY_SETTINGS as $field => [$key, $kind, $default]) {
        $value = array_key_exists($key, $raw) ? $raw[$key] : $default;
        if ($kind === 'int') {
            $out[$field] = max(0, (int) $value);
        } elseif ($kind === 'bp') {
            $out[$field] = crmBpToPercent(max(0, min(10000, (int) $value)));
        } else {
            $out[$field] = $value;
        }
    }
    return $out;
}

function crmDefaultVatBp(): int
{
    return max(0, min(10000, (int) (crmSettingsRaw()['crm.default_vat_rate_bp'] ?? 0)));
}

function crmPaymentTermsDays(): int
{
    return max(0, min(365, (int) (crmSettingsRaw()['crm.payment_terms_days'] ?? 7)));
}

/** Parses a VAT/percentage number (up to 2 decimals) into basis points. */
function crmPercentToBp(mixed $value, float $min, float $max, string $message): int
{
    if (!is_int($value) && !is_float($value)) {
        fail(400, $message);
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < $min || $number > $max) {
        fail(400, $message);
    }
    return (int) round($number * 100);
}

function crmUpdateSettings(array $body): array
{
    $input = crmValidate($body, [
        'companyName' => ['type' => 'text', 'min' => 1, 'max' => 190, 'message' => 'Enter the company name.'],
        'companyAddress' => crmOptionalText(500),
        'companyEmail' => ['type' => 'email'],
        'companyPhone' => crmOptionalText(40),
        'companyVatNumber' => crmOptionalText(40),
        'companyNumber' => crmOptionalText(20),
        'companyWebsite' => crmOptionalText(190),
        'bankAccountName' => crmOptionalText(190),
        'bankName' => crmOptionalText(120),
        'bankSortCode' => crmOptionalText(20),
        'bankAccountNumber' => crmOptionalText(20),
        'paymentTermsDays' => ['type' => 'int', 'min' => 0, 'max' => 365, 'message' => 'Payment terms must be between 0 and 365 days.'],
        'quoteTerms' => crmOptionalText(20000),
    ], true);
    if (array_key_exists('defaultVatRatePercent', $body)) {
        $input['defaultVatRatePercent'] = crmPercentToBp($body['defaultVatRatePercent'], 0, 100, 'Enter a VAT rate between 0 and 100.');
    }
    $statement = database()->prepare('INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE setting_value = ?');
    foreach ($input as $field => $value) {
        $value = (string) $value;
        $statement->execute([CRM_COMPANY_SETTINGS[$field][0], $value, $value]);
    }
    crmSettingsRaw(true);
    return crmCompanySettings();
}

/* ---------------------------------------------------------------------------
 * Line items and totals
 * ------------------------------------------------------------------------ */

/** Validates incoming LineItem[]; amountPence is always recomputed. */
function crmParseItems(mixed $items): array
{
    if (!is_array($items) || !array_is_list($items) || count($items) > CRM_MAX_ITEMS) {
        fail(400, 'Check the line items (up to ' . CRM_MAX_ITEMS . ' lines).');
    }
    $out = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            fail(400, 'Check the line items.');
        }
        $description = is_string($item['description'] ?? null) ? trim($item['description']) : '';
        if ($description === '' || mb_strlen($description) > 500) {
            fail(400, 'Each line item needs a description (up to 500 characters).');
        }
        $quantity = $item['quantity'] ?? null;
        if ((!is_int($quantity) && !is_float($quantity)) || !is_finite((float) $quantity) || $quantity <= 0 || $quantity > 1000000) {
            fail(400, 'Enter a quantity greater than zero for each line item.');
        }
        $hundredths = (int) round((float) $quantity * 100);
        if ($hundredths < 1) {
            fail(400, 'Enter a quantity greater than zero for each line item.');
        }
        $unit = $item['unitPricePence'] ?? null;
        if (!is_int($unit) || $unit < 0 || $unit > CRM_MAX_PENCE) {
            fail(400, 'Enter a unit price (in pence) for each line item.');
        }
        $product = $hundredths * $unit;
        if (!is_int($product)) {
            fail(400, 'A line item total is too large.');
        }
        $amount = intdiv($product + 50, 100);
        if ($amount > CRM_MAX_PENCE) {
            fail(400, 'A line item total is too large.');
        }
        $out[] = ['description' => $description, 'quantity' => $hundredths / 100, 'unitPricePence' => $unit, 'amountPence' => $amount];
    }
    return $out;
}

/** @return array{int, int, int} subtotal, VAT, total */
function crmTotals(array $items, int $vatBp): array
{
    $subtotal = 0;
    foreach ($items as $item) {
        $subtotal += (int) $item['amountPence'];
    }
    if ($subtotal > CRM_MAX_PENCE) {
        fail(400, 'The total is too large.');
    }
    $vat = intdiv($subtotal * $vatBp + 5000, 10000);
    return [$subtotal, $vat, $subtotal + $vat];
}

/** @var array<string, array<int, list<array>>> */
$GLOBALS['crmItemCache'] = ['quote' => [], 'invoice' => []];

function crmItemTable(string $kind): array
{
    return $kind === 'quote' ? ['crm_quote_items', 'quote_id'] : ['crm_invoice_items', 'invoice_id'];
}

function crmItemOut(array $row): array
{
    $quantity = (float) $row['quantity'];
    return [
        'id' => (int) $row['id'],
        'description' => crmText($row['description']),
        'quantity' => floor($quantity) === $quantity ? (int) $quantity : $quantity,
        'unitPricePence' => (int) $row['unit_price_pence'],
        'amountPence' => (int) $row['amount_pence'],
    ];
}

/** Loads the line items for many documents in one query. */
function crmPrimeItems(string $kind, array $ids): void
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
    if (!$ids) {
        return;
    }
    [$table, $column] = crmItemTable($kind);
    foreach ($ids as $id) {
        $GLOBALS['crmItemCache'][$kind][$id] = [];
    }
    foreach (array_chunk($ids, 500) as $chunk) {
        $marks = implode(',', array_fill(0, count($chunk), '?'));
        $statement = database()->prepare("SELECT * FROM `$table` WHERE `$column` IN ($marks) ORDER BY position, id");
        $statement->execute($chunk);
        foreach ($statement->fetchAll() as $row) {
            $GLOBALS['crmItemCache'][$kind][(int) $row[$column]][] = crmItemOut($row);
        }
    }
}

function crmItems(string $kind, int $id): array
{
    if (!array_key_exists($id, $GLOBALS['crmItemCache'][$kind])) {
        crmPrimeItems($kind, [$id]);
    }
    return $GLOBALS['crmItemCache'][$kind][$id];
}

function crmSaveItems(string $kind, int $id, array $items): void
{
    [$table, $column] = crmItemTable($kind);
    database()->prepare("DELETE FROM `$table` WHERE `$column` = ?")->execute([$id]);
    foreach (array_values($items) as $position => $item) {
        crmInsert($table, [$column => $id, 'position' => $position, 'description' => $item['description'], 'quantity' => number_format((float) $item['quantity'], 2, '.', ''), 'unit_price_pence' => $item['unitPricePence'], 'amount_pence' => $item['amountPence']]);
    }
    unset($GLOBALS['crmItemCache'][$kind][$id]);
}

/**
 * Works out new items and totals from a create/update body.
 * Returns null when nothing money-related changes (updates only).
 * Rule (docs/CRM_SALES.md): non-empty items → computed totals; otherwise amountPence becomes one line (VAT 0).
 */
function crmMoneyChange(array $body, bool $create, string $title, ?array $existingItems, int $existingBp): ?array
{
    $hasItems = isset($body['items']) && is_array($body['items']) && count($body['items']) > 0;
    $hasAmount = array_key_exists('amountPence', $body) && $body['amountPence'] !== null;
    $hasVat = array_key_exists('vatRatePercent', $body) && $body['vatRatePercent'] !== null;
    $bp = $hasVat ? crmPercentToBp($body['vatRatePercent'], 0, 100, 'Enter a VAT rate between 0 and 100.') : null;
    if ($hasItems) {
        $items = crmParseItems($body['items']);
        $bp ??= $create ? crmDefaultVatBp() : $existingBp;
    } elseif ($hasAmount) {
        $amount = crmValidate($body, ['amountPence' => ['type' => 'pence']], true)['amountPence'];
        $items = [['description' => $title, 'quantity' => 1, 'unitPricePence' => $amount, 'amountPence' => $amount]];
        $bp = 0;
    } elseif ($create) {
        fail(400, CRM_GENERIC_INVALID);
    } elseif ($hasVat) {
        $items = $existingItems ?? [];
    } else {
        return null;
    }
    [$subtotal, $vat, $total] = crmTotals($items, $bp);
    return ['items' => $items, 'bp' => $bp, 'subtotal' => $subtotal, 'vat' => $vat, 'total' => $total];
}

/* ---------------------------------------------------------------------------
 * Row → API mapping
 * ------------------------------------------------------------------------ */

function crmPublicBaseUrl(): string
{
    foreach ([(string) crmMailValue('signingBaseUrl'), setting('APP_URL')] as $base) {
        if (trim($base) !== '') {
            return rtrim(trim($base), '/');
        }
    }
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $https = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    return ($https || flag('COOKIE_SECURE') ? 'https' : 'http') . '://' . preg_replace('/[^A-Za-z0-9.:\-\[\]]/', '', $host);
}

function crmSigningUrl(array $quote): ?string
{
    $token = crmText($quote['signing_token'] ?? null);
    if ($token === '' || in_array($quote['status'], ['amended', 'declined', 'draft'], true)) {
        return null;
    }
    return crmPublicBaseUrl() . '/sign/' . $token;
}

function crmQuoteOut(array $row, array $lookups): array
{
    $link = crmLeadLink($row, $lookups);
    $lead = $link['leadId'] !== null ? ($lookups['leads'][$link['leadId']] ?? null) : null;
    $id = (int) $row['id'];
    return [
        'id' => $id,
        'reference' => crmText($row['quote_reference']),
        ...$link,
        'customerName' => crmText($row['customer_name']) !== '' ? crmText($row['customer_name']) : ($lead ? crmText($lead['name']) : ''),
        'customerCompany' => crmText($row['customer_company']),
        'customerAddress' => crmText($row['customer_address']),
        'customerEmail' => crmText($row['customer_email']) !== '' ? crmText($row['customer_email']) : ($lead ? crmText($lead['email']) : ''),
        'quoteDate' => crmDate($row['quote_date']) ?? crmDate($row['created_at']),
        'title' => crmText($row['title']),
        'status' => crmText($row['status']),
        'items' => crmItems('quote', $id),
        'subtotalPence' => (int) $row['subtotal_pence'],
        'vatRatePercent' => crmBpToPercent((int) $row['vat_rate_bp']),
        'vatPence' => (int) $row['vat_pence'],
        'amountPence' => (int) $row['amount_pence'],
        'validUntil' => crmDate($row['valid_until']),
        'notes' => crmText($row['notes']),
        'terms' => crmText($row['terms']),
        'version' => (int) ($row['version'] ?: 1),
        'parentQuoteId' => crmNullableInt($row['parent_quote_id']),
        'revisedById' => crmNullableInt($row['revised_by_id']),
        'signingUrl' => crmSigningUrl($row),
        'signedName' => crmText($row['signed_name']),
        'signedAt' => crmIso($row['signed_at']),
        'sentAt' => crmIso($row['sent_at']),
        'decidedAt' => crmIso($row['decided_at']),
        'declinedReason' => crmText($row['declined_reason'] ?? null),
        'emailedAt' => crmIso($row['emailed_at']),
        'createdAt' => crmIso($row['created_at']),
        'updatedAt' => crmIso($row['updated_at']),
    ];
}

function crmInvoiceOut(array $row, array $lookups): array
{
    $link = crmLeadLink($row, $lookups);
    $lead = $link['leadId'] !== null ? ($lookups['leads'][$link['leadId']] ?? null) : null;
    $id = (int) $row['id'];
    return [
        'id' => $id,
        'reference' => crmText($row['invoice_reference']),
        ...$link,
        'quoteId' => crmNullableInt($row['quote_id']),
        'customerName' => crmText($row['customer_name']),
        'customerCompany' => crmText($row['customer_company']),
        'customerAddress' => crmText($row['customer_address']),
        'customerEmail' => crmText($row['customer_email']) !== '' ? crmText($row['customer_email']) : ($lead ? crmText($lead['email']) : ''),
        'invoiceDate' => crmDate($row['invoice_date']),
        'supplyDate' => crmDate($row['supply_date']),
        'poNumber' => crmText($row['po_number']),
        'paymentTermsDays' => $row['payment_terms_days'] === null ? crmPaymentTermsDays() : (int) $row['payment_terms_days'],
        'status' => crmText($row['status']),
        'items' => crmItems('invoice', $id),
        'subtotalPence' => (int) $row['subtotal_pence'],
        'vatRatePercent' => crmBpToPercent((int) $row['vat_rate_bp']),
        'vatPence' => (int) $row['vat_pence'],
        'amountPence' => (int) $row['amount_pence'],
        'stageLabel' => crmText($row['stage_label']),
        'dueAt' => crmDate($row['due_at']),
        'notes' => crmText($row['notes']),
        'issuedAt' => crmIso($row['issued_at']),
        'paidAt' => crmIso($row['paid_at']),
        'sentAt' => crmIso($row['sent_at']),
        'createdAt' => crmIso($row['created_at']),
        'updatedAt' => crmIso($row['updated_at']),
    ];
}

function crmEmailOut(array $row, array $lookups): array
{
    $relatedType = crmText($row['related_type']);
    return [
        'id' => (int) $row['id'],
        'direction' => crmText($row['direction']),
        ...crmLeadLink($row, $lookups),
        'templateKey' => crmText($row['template_key']),
        'relatedType' => in_array($relatedType, ['quote', 'invoice'], true) ? $relatedType : '',
        'relatedId' => crmNullableInt($row['related_id']),
        'from' => crmText($row['from_address']),
        'to' => crmText($row['to_address']),
        'subject' => crmText($row['subject']),
        'body' => crmText($row['body']),
        'status' => crmText($row['status']),
        'error' => crmText($row['error']),
        'sentAt' => crmIso($row['sent_at']),
        'receivedAt' => crmIso($row['received_at']),
        'respondedAt' => crmIso($row['responded_at'] ?? null),
        'createdAt' => crmIso($row['created_at']),
    ];
}

function crmFollowupOut(array $row, array $lookups, array $references): array
{
    $type = crmText($row['document_type']);
    $documentId = (int) $row['document_id'];
    $link = crmLeadLink($row, $lookups);
    return [
        'id' => (int) $row['id'],
        'documentType' => $type,
        'documentId' => $documentId,
        'documentReference' => $references[$type][$documentId] ?? '',
        'leadId' => $link['leadId'],
        'leadName' => $link['leadName'],
        'templateKey' => crmText($row['template_key']),
        'dueAt' => crmIso($row['due_at']),
        'status' => crmText($row['status']),
        'attempts' => (int) $row['attempts'],
        'maxAttempts' => (int) $row['max_attempts'],
        'lastSentAt' => crmIso($row['last_sent_at']),
        'suppressReason' => isset($row['suppress_reason']) && $row['suppress_reason'] !== null && $row['suppress_reason'] !== '' ? crmText($row['suppress_reason']) : null,
    ];
}

function crmTemplatePlaceholders(string $key): array
{
    return array_merge(CRM_PLACEHOLDERS_COMMON, str_starts_with($key, 'quote') ? CRM_PLACEHOLDERS_QUOTE : CRM_PLACEHOLDERS_INVOICE);
}

function crmTemplateOut(array $row): array
{
    $key = (string) $row['template_key'];
    return ['key' => $key, 'name' => crmText($row['name']), 'subject' => crmText($row['subject']), 'body' => crmText($row['body']), 'isActive' => (bool) $row['is_active'], 'placeholders' => crmTemplatePlaceholders($key)];
}

/* ---------------------------------------------------------------------------
 * Quotes
 * ------------------------------------------------------------------------ */

function crmQuoteSpec(bool $create): array
{
    $spec = [
        'title' => ['type' => 'text', 'min' => 1, 'max' => 190, 'required' => true, 'message' => 'Describe the quoted work.'],
        'status' => ['type' => 'enum', 'values' => ['draft', 'sent', 'accepted', 'declined']] + ($create ? ['default' => 'draft'] : []),
        'validUntil' => ['type' => 'date', 'nullable' => true],
        'notes' => crmOptionalText(8000),
        'terms' => crmOptionalText(20000),
        'quoteDate' => ['type' => 'date', 'nullable' => true],
    ] + crmCustomerSpec();
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'required' => true, 'message' => 'Choose a lead.']] + $spec : $spec;
}

/** Customer block shared by quotes and invoices (stored on the document, defaulted from the lead). */
function crmCustomerSpec(): array
{
    return [
        'customerName' => crmOptionalText(190),
        'customerCompany' => crmOptionalText(190),
        'customerAddress' => ['type' => 'text', 'max' => 500],
        'customerEmail' => ['type' => 'email'],
    ];
}

/** Lead → customer columns (address and postcode on separate lines). */
function crmCustomerFromLead(?array $lead): array
{
    if ($lead === null) {
        return ['customer_name' => null, 'customer_company' => null, 'customer_address' => null, 'customer_email' => null];
    }
    $address = implode("\n", array_filter([trim(crmText($lead['address'])), trim(crmText($lead['postcode']))], fn ($part) => $part !== ''));
    return [
        'customer_name' => crmBlankToNull(crmText($lead['name'])),
        'customer_company' => crmBlankToNull(crmText($lead['company_name'] ?? null)),
        'customer_address' => crmBlankToNull($address),
        'customer_email' => crmBlankToNull(crmText($lead['email'])),
    ];
}

/** Overlays customer fields present in validated input onto $row (blank → NULL, except a required name). */
function crmCustomerColumns(array $input, array $row = []): array
{
    foreach (['customerName' => 'customer_name', 'customerCompany' => 'customer_company', 'customerAddress' => 'customer_address', 'customerEmail' => 'customer_email'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $value = $input[$key] === null ? null : str_replace(["\r\n", "\r"], "\n", (string) $input[$key]);
            $row[$column] = crmBlankToNull($value);
        }
    }
    return $row;
}

function crmRequireQuote(int $id): array
{
    $quote = crmGet('crm_quotes', $id);
    if ($quote === null) {
        fail(404, 'Quote not found.');
    }
    return $quote;
}

function crmCreateQuote(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmQuoteSpec(true));
    $lead = crmRequireLead($input['leadId']);
    $money = crmMoneyChange($body, true, $input['title'], null, 0);
    $terms = array_key_exists('terms', $input) ? $input['terms'] : (string) (crmSettingsRaw()['crm.quote_terms'] ?? '');
    $now = crmNow();
    $customer = crmCustomerColumns($input, crmCustomerFromLead($lead));
    $id = crmInsert('crm_quotes', $customer + [
        'quote_date' => $input['quoteDate'] ?? gmdate('Y-m-d'),
        'quote_reference' => 'TMP-' . bin2hex(random_bytes(8)), 'lead_id' => $input['leadId'], 'title' => $input['title'],
        'amount_pence' => $money['total'], 'subtotal_pence' => $money['subtotal'], 'vat_rate_bp' => $money['bp'], 'vat_pence' => $money['vat'],
        'version' => 1, 'status' => $input['status'], 'valid_until' => $input['validUntil'] ?? null, 'notes' => crmBlankToNull($input['notes'] ?? null),
        'terms' => crmBlankToNull($terms), 'sent_at' => $input['status'] !== 'draft' ? $now : null,
        'decided_at' => in_array($input['status'], ['accepted', 'declined'], true) ? $now : null,
    ]);
    crmUpdate('crm_quotes', $id, ['quote_reference' => 'Q-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT)]);
    crmSaveItems('quote', $id, $money['items']);
    $quote = crmGet('crm_quotes', $id);
    crmLog($input['leadId'], 'quote', 'Quote ' . $quote['quote_reference'] . ' created: ' . $input['title'] . ' (' . crmMoney($money['total']) . ').', $userId);
    if ($input['status'] !== 'draft') {
        crmQuoteStatusEffects($quote, $input['status'], $userId);
    }
    return crmQuoteOut(crmGet('crm_quotes', $id), crmLookups());
}

function crmUpdateQuote(int $id, array $body, ?int $userId): array
{
    $quote = crmRequireQuote($id);
    $input = crmValidate($body, crmQuoteSpec(false), true);
    $locked = in_array($quote['status'], ['accepted', 'amended'], true);
    $touchesContract = (isset($body['items']) && is_array($body['items']) && $body['items'] !== [])
        || (array_key_exists('vatRatePercent', $body) && $body['vatRatePercent'] !== null)
        || (array_key_exists('amountPence', $body) && $body['amountPence'] !== null)
        || array_key_exists('terms', $input);
    if ($locked && $touchesContract) {
        fail(409, CRM_SIGNED_MESSAGE);
    }
    $patch = crmCustomerColumns($input);
    if (array_key_exists('customer_name', $patch) && $patch['customer_name'] === null) {
        fail(400, 'Enter the customer name.');
    }
    foreach (['title' => 'title', 'validUntil' => 'valid_until', 'quoteDate' => 'quote_date'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    foreach (['notes' => 'notes', 'terms' => 'terms'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = crmBlankToNull($input[$key]);
        }
    }
    $money = crmMoneyChange($body, false, (string) ($input['title'] ?? $quote['title']), crmItems('quote', $id), (int) $quote['vat_rate_bp']);
    if ($money !== null) {
        $patch += ['amount_pence' => $money['total'], 'subtotal_pence' => $money['subtotal'], 'vat_rate_bp' => $money['bp'], 'vat_pence' => $money['vat']];
    }
    $changed = isset($input['status']) && $input['status'] !== $quote['status'];
    if ($changed) {
        if ($quote['status'] === 'amended') {
            fail(409, 'This quote has been replaced by a newer version.');
        }
        $now = crmNow();
        $patch['status'] = $input['status'];
        if ($input['status'] === 'sent' && !$quote['sent_at']) {
            $patch['sent_at'] = $now;
        }
        if (in_array($input['status'], ['accepted', 'declined'], true)) {
            $patch['decided_at'] = $now;
        }
        if ($input['status'] === 'draft') {
            $patch['sent_at'] = null;
            $patch['decided_at'] = null;
        }
    }
    crmUpdate('crm_quotes', $id, $patch);
    if ($money !== null) {
        crmSaveItems('quote', $id, $money['items']);
    }
    $updated = crmGet('crm_quotes', $id);
    if ($changed) {
        crmQuoteStatusEffects($updated, $input['status'], $userId);
        if ($input['status'] !== 'sent') {
            crmCancelFollowups('quote', $id);
        }
    }
    return crmQuoteOut($updated, crmLookups());
}

function crmBaseReference(string $reference): string
{
    return (string) preg_replace('/-v\d+$/', '', $reference);
}

function crmReviseQuote(int $id, ?int $userId): array
{
    $quote = crmRequireQuote($id);
    if ($quote['status'] === 'amended') {
        fail(409, 'This quote has already been revised. Edit the latest version instead.');
    }
    $version = (int) ($quote['version'] ?: 1) + 1;
    $validUntil = crmDate($quote['valid_until']);
    if ($validUntil !== null && $validUntil < gmdate('Y-m-d')) {
        $validUntil = null;
    }
    $newId = crmInsert('crm_quotes', [
        'customer_name' => $quote['customer_name'], 'customer_company' => $quote['customer_company'], 'customer_address' => $quote['customer_address'], 'customer_email' => $quote['customer_email'],
        'quote_date' => gmdate('Y-m-d'),
        'quote_reference' => 'TMP-' . bin2hex(random_bytes(8)), 'lead_id' => (int) $quote['lead_id'], 'title' => $quote['title'],
        'amount_pence' => (int) $quote['amount_pence'], 'subtotal_pence' => (int) $quote['subtotal_pence'], 'vat_rate_bp' => (int) $quote['vat_rate_bp'], 'vat_pence' => (int) $quote['vat_pence'],
        'version' => $version, 'parent_quote_id' => $id, 'status' => 'draft', 'valid_until' => $validUntil, 'notes' => $quote['notes'], 'terms' => $quote['terms'],
    ]);
    $reference = crmBaseReference((string) $quote['quote_reference']) . '-v' . $version;
    crmUpdate('crm_quotes', $newId, ['quote_reference' => $reference]);
    crmSaveItems('quote', $newId, crmItems('quote', $id));
    // The original keeps its token so its old signing link can answer 410 instead of 404.
    crmUpdate('crm_quotes', $id, ['status' => 'amended', 'revised_by_id' => $newId]);
    crmCancelFollowups('quote', $id);
    crmLog((int) $quote['lead_id'], 'quote', 'Quote ' . $quote['quote_reference'] . " revised: new version $reference drafted.", $userId);
    return crmQuoteOut(crmGet('crm_quotes', $newId), crmLookups());
}

/* ---------------------------------------------------------------------------
 * Invoices
 * ------------------------------------------------------------------------ */

function crmInvoiceSpec(bool $create): array
{
    $spec = [
        'status' => ['type' => 'enum', 'values' => ['draft', 'issued', 'paid', 'void']] + ($create ? ['default' => 'draft'] : []),
        'dueAt' => ['type' => 'date', 'nullable' => true],
        'notes' => crmOptionalText(8000),
        'stageLabel' => crmOptionalText(120),
        'invoiceDate' => ['type' => 'date', 'nullable' => true],
        'supplyDate' => ['type' => 'date', 'nullable' => true],
        'poNumber' => crmOptionalText(80),
        'paymentTermsDays' => ['type' => 'int', 'min' => 0, 'max' => 365, 'nullable' => true, 'message' => 'Payment terms must be between 0 and 365 days.'],
    ] + crmCustomerSpec();
    unset($spec['customerName']);
    $spec = ['customerName' => $create ? crmOptionalText(190) : ['type' => 'text', 'min' => 1, 'max' => 190, 'message' => 'Enter the customer name.']] + $spec;
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'nullable' => true], 'quoteId' => ['type' => 'id', 'positive' => true, 'nullable' => true]] + $spec : $spec;
}

function crmRequireInvoice(int $id): array
{
    $invoice = crmGet('crm_invoices', $id);
    if ($invoice === null) {
        fail(404, 'Invoice not found.');
    }
    return $invoice;
}

/** Due date = invoice date (default today) + payment terms (default from settings). */
function crmDueDate(?string $invoiceDate = null, ?int $termsDays = null): string
{
    $base = strtotime(($invoiceDate ?? gmdate('Y-m-d')) . ' 00:00:00 UTC') ?: time();
    return gmdate('Y-m-d', $base + ($termsDays ?? crmPaymentTermsDays()) * 86400);
}

function crmDefaultDueDate(): string
{
    return crmDueDate();
}

function crmCreateInvoice(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmInvoiceSpec(true));
    $leadId = $input['leadId'] ?? null;
    $quoteId = $input['quoteId'] ?? null;
    if ($quoteId) {
        $quote = crmGet('crm_quotes', $quoteId);
        if ($quote === null) {
            fail(400, 'That quote no longer exists.');
        }
        $leadId = $leadId ?? (int) $quote['lead_id'];
        if ((int) $quote['lead_id'] !== $leadId) {
            fail(400, 'The quote belongs to a different lead.');
        }
    }
    $lead = $leadId ? crmRequireLead($leadId) : null;
    $customer = crmCustomerColumns($input, crmCustomerFromLead($lead));
    if (($customer['customer_name'] ?? null) === null) {
        fail(400, 'Choose a lead or enter the customer name.');
    }
    $stageLabel = (string) ($input['stageLabel'] ?? '');
    $money = crmMoneyChange($body, true, $stageLabel !== '' ? $stageLabel : 'Building works', null, 0);
    return crmInsertInvoice($leadId, $quoteId, $customer + [
        'stage_label' => crmBlankToNull($stageLabel),
        'notes' => crmBlankToNull($input['notes'] ?? null),
        'invoice_date' => $input['invoiceDate'] ?? null,
        'supply_date' => $input['supplyDate'] ?? null,
        'po_number' => crmBlankToNull($input['poNumber'] ?? null),
        'payment_terms_days' => $input['paymentTermsDays'] ?? null,
        'due_at' => $input['dueAt'] ?? null,
    ], $money, $input['status'], $userId);
}

/** $fields: customer_* columns plus stage_label, notes, invoice_date, supply_date, po_number, payment_terms_days, due_at. */
function crmInsertInvoice(?int $leadId, ?int $quoteId, array $fields, array $money, string $status, ?int $userId): array
{
    $now = crmNow();
    $fields['payment_terms_days'] ??= crmPaymentTermsDays();
    if (in_array($status, ['issued', 'paid'], true)) {
        $fields['invoice_date'] ??= gmdate('Y-m-d');
        $fields['due_at'] ??= crmDueDate($fields['invoice_date'], (int) $fields['payment_terms_days']);
    } elseif (($fields['due_at'] ?? null) === null && ($fields['invoice_date'] ?? null) !== null) {
        $fields['due_at'] = crmDueDate($fields['invoice_date'], (int) $fields['payment_terms_days']);
    }
    $id = crmInsert('crm_invoices', $fields + [
        'invoice_reference' => 'TMP-' . bin2hex(random_bytes(8)), 'lead_id' => $leadId, 'quote_id' => $quoteId,
        'amount_pence' => $money['total'], 'subtotal_pence' => $money['subtotal'], 'vat_rate_bp' => $money['bp'], 'vat_pence' => $money['vat'],
        'status' => $status, 'issued_at' => in_array($status, ['issued', 'paid'], true) ? $now : null, 'paid_at' => $status === 'paid' ? $now : null,
    ]);
    $reference = 'INV-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    crmUpdate('crm_invoices', $id, ['invoice_reference' => $reference]);
    crmSaveItems('invoice', $id, $money['items']);
    crmLog($leadId, 'invoice', "Invoice $reference " . ($status === 'draft' ? 'drafted' : $status) . ' for ' . crmMoney($money['total']) . '.', $userId);
    if ($status === 'paid' && $leadId) {
        crmMarkCustomer(crmRequireLead($leadId));
    }
    return crmInvoiceOut(crmGet('crm_invoices', $id), crmLookups());
}

/** Comparable form of line items (ignores ids and recomputed amounts). */
function crmItemsSignature(array $items): string
{
    return (string) json_encode(array_map(fn ($item) => [(string) $item['description'], round((float) $item['quantity'], 2), (int) $item['unitPricePence']], array_values($items)));
}

/**
 * Draft and issued invoices are fully editable; editing an issued invoice that was already emailed
 * clears sentAt so it can be resent. Paid and void invoices only accept notes and status changes
 * (a paid invoice can be reopened to issued).
 */
function crmUpdateInvoice(int $id, array $body, ?int $userId): array
{
    $invoice = crmRequireInvoice($id);
    $input = crmValidate($body, crmInvoiceSpec(false), true);
    $patch = crmCustomerColumns($input);
    foreach (['customerName' => 'customer_name', 'dueAt' => 'due_at', 'invoiceDate' => 'invoice_date', 'supplyDate' => 'supply_date', 'paymentTermsDays' => 'payment_terms_days'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    foreach (['notes' => 'notes', 'stageLabel' => 'stage_label', 'poNumber' => 'po_number'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = crmBlankToNull($input[$key]);
        }
    }
    $label = (string) ($input['stageLabel'] ?? $invoice['stage_label'] ?? '');
    $currentItems = crmItems('invoice', $id);
    $money = crmMoneyChange($body, false, $label !== '' ? $label : 'Building works', $currentItems, (int) $invoice['vat_rate_bp']);
    if ($money !== null) {
        $patch += ['amount_pence' => $money['total'], 'subtotal_pence' => $money['subtotal'], 'vat_rate_bp' => $money['bp'], 'vat_pence' => $money['vat']];
    }

    // Which fields really change (the editor may send the whole form back unchanged).
    $contentChanges = [];
    foreach ($patch as $column => $value) {
        if ($column === 'notes') {
            continue;
        }
        $old = $invoice[$column] ?? null;
        $oldText = $old === null ? null : (str_ends_with($column, '_at') || str_ends_with($column, '_date') ? substr((string) $old, 0, 10) : (string) $old);
        if ($oldText !== ($value === null ? null : (string) $value)) {
            $contentChanges[] = $column;
        }
    }
    $itemsChanged = $money !== null && crmItemsSignature($money['items']) !== crmItemsSignature($currentItems);
    if ($itemsChanged && !in_array('amount_pence', $contentChanges, true)) {
        $contentChanges[] = 'items';
    }
    if (in_array($invoice['status'], ['paid', 'void'], true) && $contentChanges) {
        fail(409, 'This invoice is ' . $invoice['status'] . ', so only its notes and status can be changed.');
    }

    // Recalculate the due date from the invoice date and terms unless a due date was given.
    if (!array_key_exists('dueAt', $input) && (array_key_exists('invoiceDate', $input) || array_key_exists('paymentTermsDays', $input))) {
        $invoiceDate = array_key_exists('invoice_date', $patch) ? $patch['invoice_date'] : crmDate($invoice['invoice_date']);
        if ($invoiceDate !== null) {
            $terms = array_key_exists('payment_terms_days', $patch) ? $patch['payment_terms_days'] : $invoice['payment_terms_days'];
            $patch['due_at'] = crmDueDate($invoiceDate, $terms === null ? null : (int) $terms);
        }
    }

    $changed = isset($input['status']) && $input['status'] !== $invoice['status'];
    if ($changed) {
        $now = crmNow();
        $patch['status'] = $input['status'];
        if (in_array($input['status'], ['issued', 'paid'], true) && !$invoice['issued_at']) {
            $patch['issued_at'] = $now;
        }
        $patch['paid_at'] = $input['status'] === 'paid' ? ($invoice['paid_at'] ?: $now) : null;
        if ($input['status'] === 'draft') {
            $patch['issued_at'] = null;
        }
        if (in_array($input['status'], ['issued', 'paid'], true)) {
            $invoiceDate = $patch['invoice_date'] ?? crmDate($invoice['invoice_date']);
            if ($invoiceDate === null) {
                $invoiceDate = $patch['invoice_date'] = gmdate('Y-m-d');
            }
            if (!array_key_exists('dueAt', $input) && !array_key_exists('due_at', $patch) && !$invoice['due_at']) {
                $terms = $patch['payment_terms_days'] ?? $invoice['payment_terms_days'];
                $patch['due_at'] = crmDueDate($invoiceDate, $terms === null ? null : (int) $terms);
            }
        }
    }
    if ($contentChanges && $invoice['status'] === 'issued' && $invoice['sent_at']) {
        $patch['sent_at'] = null;
    }
    crmUpdate('crm_invoices', $id, $patch);
    if ($money !== null) {
        crmSaveItems('invoice', $id, $money['items']);
    }
    $updated = crmGet('crm_invoices', $id);
    if ($changed) {
        crmLog(crmNullableInt($updated['lead_id']), 'invoice', 'Invoice ' . $updated['invoice_reference'] . ' marked ' . $input['status'] . ' (' . crmMoney((int) $updated['amount_pence']) . ').', $userId);
        if (in_array($input['status'], ['paid', 'void', 'draft'], true)) {
            crmCancelFollowups('invoice', $id);
        }
        if ($input['status'] === 'paid' && $updated['lead_id']) {
            crmMarkCustomer(crmRequireLead((int) $updated['lead_id']));
        }
    } elseif ($contentChanges) {
        crmLog(crmNullableInt($updated['lead_id']), 'invoice', 'Invoice ' . $updated['invoice_reference'] . ' edited (' . crmMoney((int) $updated['amount_pence']) . ').', $userId);
    }
    return crmInvoiceOut($updated, crmLookups());
}

function crmPercentLabel(int $bp): string
{
    return rtrim(rtrim(number_format($bp / 100, 2, '.', ''), '0'), '.') . '%';
}

function crmInvoiceFromQuote(int $quoteId, array $body, ?int $userId): array
{
    $quote = crmRequireQuote($quoteId);
    if (!in_array($quote['status'], ['accepted', 'sent'], true)) {
        fail(409, 'Only sent or accepted quotes can be invoiced.');
    }
    $input = crmValidate($body, ['stageLabel' => crmOptionalText(120)], true);
    $stageLabel = (string) ($input['stageLabel'] ?? '');
    $lead = crmRequireLead((int) $quote['lead_id']);
    $bp = (int) $quote['vat_rate_bp'];
    if (array_key_exists('percent', $body) && $body['percent'] !== null) {
        $percentBp = crmPercentToBp($body['percent'], 1, 100, 'Enter a percentage between 1 and 100.');
        $amount = intdiv((int) $quote['subtotal_pence'] * $percentBp + 5000, 10000);
        $stageLabel = $stageLabel !== '' ? $stageLabel : 'Stage payment';
        $items = [['description' => $stageLabel . ' — ' . crmPercentLabel($percentBp) . ' of ' . $quote['quote_reference'], 'quantity' => 1, 'unitPricePence' => $amount, 'amountPence' => $amount]];
    } else {
        $items = array_map(fn ($item) => ['description' => $item['description'], 'quantity' => $item['quantity'], 'unitPricePence' => $item['unitPricePence'], 'amountPence' => $item['amountPence']], crmItems('quote', $quoteId));
    }
    [$subtotal, $vat, $total] = crmTotals($items, $bp);
    $money = ['items' => $items, 'bp' => $bp, 'subtotal' => $subtotal, 'vat' => $vat, 'total' => $total];
    // The invoice is addressed like the quote it comes from (falling back to the lead's details).
    $customer = crmCustomerFromLead($lead);
    foreach (['customer_name', 'customer_company', 'customer_address', 'customer_email'] as $column) {
        if (crmText($quote[$column] ?? null) !== '') {
            $customer[$column] = $quote[$column];
        }
    }
    return crmInsertInvoice((int) $lead['id'], $quoteId, $customer + ['stage_label' => crmBlankToNull($stageLabel)], $money, 'draft', $userId);
}

/* ---------------------------------------------------------------------------
 * PDFs
 * ------------------------------------------------------------------------ */

function crmLongDate(?string $date): string
{
    if ($date === null || $date === '') {
        return '';
    }
    try {
        return (new DateTimeImmutable(substr($date, 0, 10), new DateTimeZone('UTC')))->format('j F Y');
    } catch (Throwable $error) {
        return '';
    }
}

function crmPdfCompany(): array
{
    $company = crmCompanySettings();
    return ['name' => $company['companyName'], 'address' => $company['companyAddress'], 'email' => $company['companyEmail'], 'phone' => $company['companyPhone'], 'vatNumber' => $company['companyVatNumber'], 'companyNumber' => $company['companyNumber'], 'website' => $company['companyWebsite']];
}

/** Customer block from the document's stored customer fields, falling back to the lead. */
function crmPdfCustomer(array $document, ?array $lead): array
{
    $fallback = crmCustomerFromLead($lead);
    $pick = fn (string $column) => crmText($document[$column] ?? null) !== '' ? crmText($document[$column]) : crmText($fallback[$column] ?? null);
    return ['name' => $pick('customer_name'), 'company' => $pick('customer_company'), 'address' => $pick('customer_address'), 'email' => $pick('customer_email'), 'phone' => $lead ? crmText($lead['phone']) : ''];
}

function crmQuotePdf(array $quote): string
{
    $lead = crmGet('crm_leads', (int) $quote['lead_id']);
    $signature = null;
    if ($quote['status'] === 'accepted' && $quote['signed_at']) {
        $signature = ['name' => crmText($quote['signed_name']), 'signedAt' => crmWhen((string) $quote['signed_at']) . ' (UK time)', 'ip' => crmText($quote['signed_ip'])];
    }
    $stamp = ['draft' => 'DRAFT', 'amended' => 'SUPERSEDED', 'declined' => 'DECLINED', 'accepted' => $signature ? 'SIGNED' : 'ACCEPTED'][$quote['status']] ?? '';
    $issued = crmDate($quote['quote_date']) ?? crmDate($quote['created_at']) ?? gmdate('Y-m-d');
    return crmRenderSalesPdf([
        'kind' => 'quote',
        'reference' => crmText($quote['quote_reference']),
        'title' => crmText($quote['title']),
        'company' => crmPdfCompany(),
        'customer' => crmPdfCustomer($quote, $lead),
        'meta' => [['Quote date', crmLongDate($issued)], ['Valid until', crmLongDate(crmDate($quote['valid_until']))], ['Version', (int) $quote['version'] > 1 ? (string) $quote['version'] : '']],
        'items' => crmItems('quote', (int) $quote['id']),
        'subtotalPence' => (int) $quote['subtotal_pence'],
        'vatRatePercent' => crmBpToPercent((int) $quote['vat_rate_bp']),
        'vatPence' => (int) $quote['vat_pence'],
        'totalPence' => (int) $quote['amount_pence'],
        'notes' => crmText($quote['notes']),
        'terms' => crmText($quote['terms']),
        'signature' => $signature,
        'stamp' => $stamp,
    ]);
}

function crmPaymentRows(array $invoice): array
{
    $company = crmCompanySettings();
    $terms = $invoice['payment_terms_days'] === null ? crmPaymentTermsDays() : (int) $invoice['payment_terms_days'];
    return [
        ['Bank', $company['bankName']],
        ['Account name', $company['bankAccountName']],
        ['Sort code', $company['bankSortCode']],
        ['Account number', $company['bankAccountNumber']],
        ['Payment reference', crmText($invoice['invoice_reference'])],
        ['Payment terms', $terms === 0 ? 'Due on receipt' : $terms . ' days from the invoice date'],
        ['Payment due', crmLongDate(crmDate($invoice['due_at']))],
    ];
}

function crmInvoicePdf(array $invoice): string
{
    $lead = $invoice['lead_id'] ? crmGet('crm_leads', (int) $invoice['lead_id']) : null;
    $quote = $invoice['quote_id'] ? crmGet('crm_quotes', (int) $invoice['quote_id']) : null;
    $stamp = ['draft' => 'DRAFT', 'paid' => 'PAID', 'void' => 'VOID'][$invoice['status']] ?? '';
    $issued = crmDate($invoice['invoice_date']) ?? crmDate($invoice['issued_at']) ?? crmDate($invoice['created_at']) ?? gmdate('Y-m-d');
    return crmRenderSalesPdf([
        'kind' => 'invoice',
        'reference' => crmText($invoice['invoice_reference']),
        'title' => $quote ? crmText($quote['title']) : '',
        'company' => crmPdfCompany(),
        'customer' => crmPdfCustomer($invoice, $lead),
        'meta' => [
            ['Invoice date', crmLongDate($issued)],
            ['Supply date', crmLongDate(crmDate($invoice['supply_date']))],
            ['Due date', crmLongDate(crmDate($invoice['due_at']))],
            ['PO number', crmText($invoice['po_number'])],
            ['Quote', $quote ? crmText($quote['quote_reference']) : ''],
            ['Stage', crmText($invoice['stage_label'])],
        ],
        'items' => crmItems('invoice', (int) $invoice['id']),
        'subtotalPence' => (int) $invoice['subtotal_pence'],
        'vatRatePercent' => crmBpToPercent((int) $invoice['vat_rate_bp']),
        'vatPence' => (int) $invoice['vat_pence'],
        'totalPence' => (int) $invoice['amount_pence'],
        'notes' => crmText($invoice['notes']),
        'payment' => crmPaymentRows($invoice),
        'stamp' => $stamp,
    ]);
}

function crmSendPdf(string $filename, string $pdf): never
{
    header('Content-Type: application/pdf');
    header('Content-Length: ' . strlen($pdf));
    header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9._-]+/', '_', $filename) . '"');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo $pdf;
    exit;
}

/* ---------------------------------------------------------------------------
 * Templates and email
 * ------------------------------------------------------------------------ */

function crmTemplate(string $key): ?array
{
    $statement = database()->prepare('SELECT * FROM crm_email_templates WHERE template_key = ? LIMIT 1');
    $statement->execute([$key]);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function crmTemplates(): array
{
    $rows = database()->query('SELECT * FROM crm_email_templates')->fetchAll();
    usort($rows, function ($a, $b) {
        $order = array_flip(CRM_TEMPLATE_KEYS);
        return ($order[$a['template_key']] ?? 99) <=> ($order[$b['template_key']] ?? 99) ?: strcmp((string) $a['template_key'], (string) $b['template_key']);
    });
    return array_map('crmTemplateOut', $rows);
}

function crmUpdateTemplate(string $key, array $body): array
{
    if (crmTemplate($key) === null) {
        fail(404, 'Template not found.');
    }
    $input = crmValidate($body, [
        'subject' => ['type' => 'text', 'min' => 1, 'max' => 255, 'message' => 'Add a subject line.'],
        'body' => ['type' => 'text', 'min' => 1, 'max' => 50000, 'message' => 'Write the email body.'],
        'isActive' => ['type' => 'bool'],
    ], true);
    $sets = [];
    $values = [];
    foreach (['subject' => 'subject', 'body' => 'body', 'isActive' => 'is_active'] as $field => $column) {
        if (array_key_exists($field, $input)) {
            $sets[] = "`$column` = ?";
            $values[] = $field === 'isActive' ? ($input[$field] ? 1 : 0) : $input[$field];
        }
    }
    if ($sets) {
        database()->prepare('UPDATE crm_email_templates SET ' . implode(', ', $sets) . ' WHERE template_key = ?')->execute([...$values, $key]);
    }
    return crmTemplateOut(crmTemplate($key));
}

/** Placeholder values (raw text) for a lead and optional quote/invoice. */
function crmTemplateValues(?array $lead, ?array $quote, ?array $invoice, string $message): array
{
    $company = crmCompanySettings();
    $documentName = crmText(($quote ?? $invoice ?? [])['customer_name'] ?? null);
    $name = $documentName !== '' ? $documentName : ($lead ? crmText($lead['name']) : '');
    $first = trim(explode(' ', trim($name))[0] ?? '');
    $values = [
        'lead.name' => $name,
        'lead.firstName' => $first !== '' ? $first : 'there',
        'company.name' => $company['companyName'],
        'company.phone' => $company['companyPhone'],
        'company.email' => $company['companyEmail'],
        'message' => $message,
    ];
    if ($quote) {
        $values += [
            'quote.reference' => crmText($quote['quote_reference']),
            'quote.title' => crmText($quote['title']),
            'quote.total' => crmMoney((int) $quote['amount_pence']),
            'quote.validUntil' => crmLongDate(crmDate($quote['valid_until'])),
            'sign.link' => (string) (crmSigningUrl($quote) ?? ''),
        ];
    }
    if ($invoice) {
        $details = [];
        foreach (crmPaymentRows($invoice) as [$label, $value]) {
            if ((string) $value !== '' && $label !== 'Payment due') {
                $details[] = $label . ': ' . $value;
            }
        }
        $values += [
            'invoice.reference' => crmText($invoice['invoice_reference']),
            'invoice.total' => crmMoney((int) $invoice['amount_pence']),
            'invoice.dueDate' => crmLongDate(crmDate($invoice['due_at'])),
            'invoice.paymentDetails' => implode("\n", $details),
        ];
    }
    return $values;
}

function crmRenderTemplate(string $template, array $values, bool $html): string
{
    $rendered = (string) preg_replace_callback('/\{\{\s*([a-zA-Z.]+)\s*\}\}/', function (array $match) use ($values, $html): string {
        $value = (string) ($values[$match[1]] ?? '');
        if (!$html) {
            return smtpHeaderValue($value);
        }
        return nl2br(htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'), false);
    }, $template);
    // An optional placeholder left empty (e.g. {{message}}) should not leave a blank paragraph.
    return $html ? (string) preg_replace('#<p>\s*</p>#i', '', $rendered) : $rendered;
}

function crmPlainToHtml(string $text): string
{
    $paragraphs = preg_split("/\n\s*\n/", str_replace(["\r\n", "\r"], "\n", trim($text))) ?: [];
    return implode('', array_map(fn ($paragraph) => '<p>' . nl2br(htmlspecialchars(trim($paragraph), ENT_QUOTES | ENT_HTML5, 'UTF-8'), false) . '</p>', $paragraphs));
}

/** Consistent, responsive branding for every CRM email (templates and one-off messages). */
function crmEmailLayout(string $content): string
{
    $company = crmCompanySettings();
    $name = htmlspecialchars((string) $company['companyName'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $address = htmlspecialchars((string) $company['companyAddress'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $phone = htmlspecialchars((string) $company['companyPhone'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $email = htmlspecialchars((string) $company['companyEmail'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $base = htmlspecialchars(crmPublicBaseUrl(), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $logo = $base . '/brand/omni-logo-email.png';
    return '<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;color:#172033;font-family:Arial,Helvetica,sans-serif">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9"><tr><td align="center" style="padding:24px 12px">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe2ea;border-radius:12px;overflow:hidden">'
        . '<tr><td style="padding:22px 28px;background:#05070b"><img src="' . $logo . '" width="300" alt="' . $name . '" style="display:block;width:100%;max-width:300px;height:auto;border:0"></td></tr>'
        . '<tr><td style="padding:30px 28px;font-size:16px;line-height:1.6">' . $content . '</td></tr>'
        . '<tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#667085;font-size:12px;line-height:1.55"><strong style="color:#172033">' . $name . '</strong><br>'
        . nl2br($address, false) . ($phone !== '' ? '<br>' . $phone : '') . ($email !== '' ? '<br><a href="mailto:' . $email . '" style="color:#8a5a00">' . $email . '</a>' : '')
        . '</td></tr></table></td></tr></table></body></html>';
}

/* ---------------------------------------------------------------------------
 * Mail settings: config file / environment > database (CRM Settings page) > Zoho UK defaults
 * ------------------------------------------------------------------------ */

/** API field => [config key, site_settings key, kind, default]. */
const CRM_MAIL_SETTINGS = [
    'outboundEnabled' => ['OUTBOUND_MESSAGES_ENABLED', 'mail.outbound_enabled', 'bool', 'false'],
    'smtpHost' => ['SMTP_HOST', 'mail.smtp_host', 'host', 'smtppro.zoho.uk'],
    'smtpPort' => ['SMTP_PORT', 'mail.smtp_port', 'port', '465'],
    'smtpSecure' => ['SMTP_SECURE', 'mail.smtp_secure', 'secure', 'ssl'],
    'smtpUser' => ['SMTP_USER', 'mail.smtp_user', 'text', ''],
    'smtpPassword' => ['SMTP_PASSWORD', 'mail.smtp_password', 'secret', ''],
    'emailFrom' => ['EMAIL_FROM', 'mail.email_from', 'email', ''],
    'emailFromName' => ['EMAIL_FROM_NAME', 'mail.email_from_name', 'text', 'Omni Developments'],
    'emailReplyTo' => ['EMAIL_REPLY_TO', 'mail.email_reply_to', 'email', ''],
    'imapHost' => ['IMAP_HOST', 'mail.imap_host', 'host', 'imappro.zoho.uk'],
    'imapPort' => ['IMAP_PORT', 'mail.imap_port', 'port', '993'],
    'imapUser' => ['IMAP_USER', 'mail.imap_user', 'text', ''],
    'imapPassword' => ['IMAP_PASSWORD', 'mail.imap_password', 'secret', ''],
    'imapMailbox' => ['IMAP_MAILBOX', 'mail.imap_mailbox', 'text', 'INBOX'],
    'signingBaseUrl' => ['SIGNING_BASE_URL', 'mail.signing_base_url', 'url', ''],
];

/** Key for stored mail passwords: derived from the database credentials, so a dump alone is not enough. */
function crmMailKey(): string
{
    return hash('sha256', 'omni-crm-mail|' . setting('DATABASE_PASSWORD') . '|' . setting('DATABASE_NAME'), true);
}

/** AES-256-GCM; stored as "v1:" + base64(iv[12] . tag[16] . ciphertext). */
function crmEncryptSecret(string $plain): string
{
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', crmMailKey(), OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($cipher === false) {
        throw new RuntimeException('Could not encrypt the mail password.');
    }
    return 'v1:' . base64_encode($iv . $tag . $cipher);
}

function crmDecryptSecret(string $stored): string
{
    if (!str_starts_with($stored, 'v1:')) {
        return '';
    }
    $raw = base64_decode(substr($stored, 3), true);
    if ($raw === false || strlen($raw) < 29) {
        return '';
    }
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', crmMailKey(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    return $plain === false ? '' : $plain;
}

/** Raw stored mail settings (site_settings rows "mail.*"). */
function crmMailStored(bool $refresh = false): array
{
    static $cache = null;
    if ($cache === null || $refresh) {
        $cache = [];
        foreach (database()->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'mail.%'")->fetchAll() as $row) {
            $cache[(string) $row['setting_key']] = (string) ($row['setting_value'] ?? '');
        }
    }
    return $cache;
}

/**
 * Effective mail settings. Returns ['values' => typed values incl. passwords, 'source' => field => config|database|default].
 * Never send 'values' to a client as-is: it contains the passwords.
 */
function crmMail(bool $refresh = false): array
{
    static $cache = null;
    if ($cache !== null && !$refresh) {
        return $cache;
    }
    $stored = crmMailStored($refresh);
    $values = [];
    $source = [];
    foreach (CRM_MAIL_SETTINGS as $field => [$configKey, $storeKey, $kind, $default]) {
        $value = trim(setting($configKey));
        $from = 'config';
        if ($value === '') {
            $value = $stored[$storeKey] ?? '';
            if ($kind === 'secret') {
                $value = $value === '' ? '' : crmDecryptSecret($value);
            }
            $from = 'database';
        }
        if ($value === '') {
            $value = $default;
            $from = 'default';
        }
        $values[$field] = match ($kind) {
            'bool' => in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true),
            'port' => max(0, min(65535, (int) $value)),
            'secure' => strtolower($value),
            default => $value,
        };
        $source[$field] = $from;
    }
    return $cache = ['values' => $values, 'source' => $source];
}

function crmMailValue(string $field): mixed
{
    return crmMail()['values'][$field];
}

/** MailSettings for the API: passwords are reported only as "set" flags. */
function crmMailSettingsOut(): array
{
    $mail = crmMail();
    $values = $mail['values'];
    $out = [];
    foreach (CRM_MAIL_SETTINGS as $field => [, , $kind]) {
        if ($kind === 'secret') {
            $out[$field . 'Set'] = $values[$field] !== '';
        } else {
            $out[$field] = $values[$field];
        }
    }
    $out['source'] = $mail['source'];
    return $out;
}

function crmUpdateMailSettings(array $body): array
{
    $input = crmValidate($body, [
        'outboundEnabled' => ['type' => 'bool'],
        'smtpHost' => crmOptionalText(190),
        'smtpPort' => ['type' => 'int', 'min' => 1, 'max' => 65535, 'message' => 'Enter a port between 1 and 65535.'],
        'smtpSecure' => ['type' => 'enum', 'values' => ['ssl', 'tls', 'none'], 'message' => 'Choose ssl, tls or none for the connection security.'],
        'smtpUser' => crmOptionalText(190),
        'emailFrom' => ['type' => 'email'],
        'emailFromName' => crmOptionalText(120),
        'emailReplyTo' => ['type' => 'email'],
        'imapHost' => crmOptionalText(190),
        'imapPort' => ['type' => 'int', 'min' => 1, 'max' => 65535, 'message' => 'Enter a port between 1 and 65535.'],
        'imapUser' => crmOptionalText(190),
        'imapMailbox' => crmOptionalText(120),
        'signingBaseUrl' => crmOptionalText(190),
    ], true);
    foreach (['smtpHost', 'imapHost'] as $field) {
        if (($input[$field] ?? '') !== '' && !preg_match('/^[A-Za-z0-9.-]+$/', $input[$field])) {
            fail(400, 'Enter a valid server name, for example smtppro.zoho.uk.');
        }
    }
    if (($input['signingBaseUrl'] ?? '') !== '') {
        $url = rtrim($input['signingBaseUrl'], '/');
        if (!preg_match('#^https?://[A-Za-z0-9.-]+(:\d+)?$#', $url)) {
            fail(400, 'Enter the signing address as an origin such as https://crm.omnidevelopment.co.uk.');
        }
        $input['signingBaseUrl'] = $url;
    }
    $writes = [];
    foreach ($input as $field => $value) {
        $writes[CRM_MAIL_SETTINGS[$field][1]] = is_bool($value) ? ($value ? 'true' : 'false') : (string) $value;
    }
    // Passwords are write-only: '' keeps the stored one, null clears it, anything else replaces it.
    foreach (['smtpPassword', 'imapPassword'] as $field) {
        if (!array_key_exists($field, $body)) {
            continue;
        }
        $value = $body[$field];
        if ($value === null) {
            $writes[CRM_MAIL_SETTINGS[$field][1]] = '';
        } elseif (!is_string($value) || strlen($value) > 500) {
            fail(400, 'Enter the password as text.');
        } elseif ($value !== '') {
            $writes[CRM_MAIL_SETTINGS[$field][1]] = crmEncryptSecret($value);
        }
    }
    $statement = database()->prepare('INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE setting_value = ?, is_public = FALSE');
    foreach ($writes as $key => $value) {
        $statement->execute([$key, $value, $value]);
    }
    crmMail(true);
    return crmMailSettingsOut();
}

function crmFromAddress(): string
{
    $from = strtolower(trim((string) (crmMailValue('emailFrom') !== '' ? crmMailValue('emailFrom') : crmMailValue('smtpUser'))));
    return filter_var($from, FILTER_VALIDATE_EMAIL) !== false ? $from : '';
}

/** Zoho (and most providers) only relay mail whose envelope sender is the signed-in mailbox. */
function crmEnvelopeFrom(): string
{
    $user = strtolower(trim((string) crmMailValue('smtpUser')));
    return filter_var($user, FILTER_VALIDATE_EMAIL) !== false ? $user : crmFromAddress();
}

function crmSmtpConfigured(): bool
{
    $values = crmMail()['values'];
    return trim($values['smtpHost']) !== '' && $values['smtpPort'] > 0 && crmFromAddress() !== '' && in_array($values['smtpSecure'], ['ssl', 'tls', 'none'], true)
        && ($values['smtpUser'] === '' || $values['smtpPassword'] !== '');
}

function crmImapConfigured(): bool
{
    $values = crmMail()['values'];
    return trim($values['imapHost']) !== '' && $values['imapUser'] !== '' && $values['imapPassword'] !== '';
}

function crmMailStatus(): array
{
    return [
        'outboundEnabled' => (bool) crmMailValue('outboundEnabled'),
        'smtpConfigured' => crmSmtpConfigured(),
        'imapConfigured' => crmImapConfigured(),
        'imapAvailable' => function_exists('imap_open'),
        'cronConfigured' => strlen(setting('CRM_CRON_SECRET')) >= 32,
    ];
}

function crmSmtpConfig(): array
{
    $values = crmMail()['values'];
    return ['host' => trim($values['smtpHost']), 'port' => $values['smtpPort'], 'secure' => $values['smtpSecure'], 'user' => $values['smtpUser'], 'password' => $values['smtpPassword'], 'hostname' => crmMailHostname()];
}

function crmIsZoho(string $host): bool
{
    return str_contains(strtolower($host), 'zoho');
}

/** Human-readable explanation of an SMTP result for staff. */
function crmSmtpExplain(array $result): string
{
    $values = crmMail()['values'];
    $host = $values['smtpHost'] . ':' . $values['smtpPort'];
    $reply = $result['detail'] !== '' ? ' (' . $result['detail'] . ')' : '';
    $provider = crmIsZoho($values['smtpHost']) ? 'Zoho' : 'The mail server';
    return match ($result['stage']) {
        'connect' => "Could not reach $host$reply. Check the SMTP server and port (Zoho UK: smtppro.zoho.uk, port 465 with SSL or 587 with TLS).",
        'tls' => "The secure connection to $host failed$reply. Use SSL with port 465 or TLS with port 587.",
        'auth' => "$provider rejected the login — use an app-specific password and make sure IMAP access is enabled$reply.",
        'send' => "The server refused the message$reply. The From address must be the signed-in mailbox or one of its aliases.",
        default => 'The email was accepted by the mail server.',
    };
}

/** POST /mail-test: sends a short test message and reports exactly where it failed. */
function crmMailTest(array $body): array
{
    $to = crmValidate($body, ['to' => ['type' => 'email', 'required' => true]])['to'] ?? '';
    if ($to === '') {
        fail(400, 'Enter a valid email address.');
    }
    $values = crmMail()['values'];
    if (!$values['outboundEnabled']) {
        return ['ok' => false, 'stage' => 'config', 'message' => 'Outgoing email is switched off. Turn on "Send emails" in the mail settings first.'];
    }
    if (!crmSmtpConfigured()) {
        $missing = [];
        if (trim($values['smtpHost']) === '') {
            $missing[] = 'SMTP server';
        }
        if (crmFromAddress() === '') {
            $missing[] = 'sender address (mailbox login or From address)';
        }
        if ($values['smtpUser'] !== '' && $values['smtpPassword'] === '') {
            $missing[] = 'SMTP password';
        }
        return ['ok' => false, 'stage' => 'config', 'message' => 'Email is not fully set up: add the ' . (implode(', ', $missing) ?: 'SMTP settings') . '.'];
    }
    $from = crmFromAddress();
    $domain = substr(strrchr($from, '@') ?: '@omni.local', 1);
    $company = (string) crmCompanySettings()['companyName'];
    $result = smtpSend(crmSmtpConfig(), [
        'from' => $from, 'envelopeFrom' => crmEnvelopeFrom(), 'fromName' => (string) $values['emailFromName'], 'to' => [$to], 'replyTo' => (string) $values['emailReplyTo'],
        'subject' => 'Test email from the ' . $company . ' CRM',
        'html' => '<p>This is a test email from the ' . htmlspecialchars($company, ENT_QUOTES, 'UTF-8') . ' CRM.</p><p>If you can read this, outgoing email is working.</p>',
        'messageId' => '<' . bin2hex(random_bytes(16)) . '@' . $domain . '>',
    ]);
    if (!$result['ok']) {
        error_log('[omni-api] mail test failed at ' . $result['stage'] . ': ' . $result['error']);
        return ['ok' => false, 'stage' => $result['stage'], 'message' => crmSmtpExplain($result)];
    }
    return ['ok' => true, 'stage' => 'done', 'message' => "Test email sent to $to. Check that inbox (and its spam folder)."];
}

function crmImapMailboxString(): string
{
    $values = crmMail()['values'];
    $port = $values['imapPort'] ?: 993;
    $flags = $port === 993 ? '/imap/ssl' : '/imap/tls';
    return '{' . trim($values['imapHost']) . ':' . $port . $flags . '}' . ($values['imapMailbox'] !== '' ? $values['imapMailbox'] : 'INBOX');
}

/** Opens the mailbox. @return array{0: mixed, 1: string, 2: string} stream|false, stage, raw error */
function crmImapOpen(): array
{
    if (function_exists('imap_timeout')) {
        @imap_timeout(IMAP_OPENTIMEOUT, 15);
        @imap_timeout(IMAP_READTIMEOUT, 20);
    }
    $values = crmMail()['values'];
    // Read-only: this is the owner's live inbox. Nothing is ever marked read, flagged, moved or deleted.
    $stream = @imap_open(crmImapMailboxString(), $values['imapUser'], $values['imapPassword'], OP_READONLY, 0);
    if ($stream !== false) {
        return [$stream, 'done', ''];
    }
    $errors = imap_errors() ?: [];
    imap_alerts();
    $detail = implode(' / ', array_unique(array_map('strval', $errors))) ?: 'unknown error';
    if ($values['imapPassword'] !== '') {
        $detail = str_replace($values['imapPassword'], '***', $detail);
    }
    $stage = match (true) {
        (bool) preg_match('/authenticat|login|credential|password|LOGIN failed|AUTHENTICATIONFAILED|invalid/i', $detail) => 'auth',
        (bool) preg_match('/certificate|ssl|tls|handshake/i', $detail) => 'tls',
        default => 'connect',
    };
    return [false, $stage, mb_substr($detail, 0, 300)];
}

/** POST /imap-test. */
function crmImapTest(): array
{
    if (!function_exists('imap_open')) {
        return ['ok' => false, 'stage' => 'config', 'message' => 'The PHP imap extension is not enabled on this server (Hostinger: hPanel → Advanced → PHP Configuration → Extensions → imap).'];
    }
    if (!crmImapConfigured()) {
        return ['ok' => false, 'stage' => 'config', 'message' => 'Inbox sync is not set up: add the IMAP server, mailbox login and password.'];
    }
    $values = crmMail()['values'];
    [$stream, $stage, $detail] = crmImapOpen();
    if ($stream === false) {
        $host = $values['imapHost'] . ':' . $values['imapPort'];
        $provider = crmIsZoho($values['imapHost']) ? 'Zoho' : 'The mail server';
        $message = match ($stage) {
            'auth' => "$provider rejected the login — use an app-specific password and make sure IMAP access is enabled ($detail).",
            'tls' => "The secure connection to $host failed ($detail).",
            default => "Could not reach $host ($detail). Zoho UK uses imappro.zoho.uk on port 993.",
        };
        return ['ok' => false, 'stage' => $stage, 'message' => $message];
    }
    $check = @imap_check($stream);
    $count = is_object($check) ? (int) $check->Nmsgs : 0;
    @imap_close($stream);
    imap_errors();
    imap_alerts();
    return ['ok' => true, 'stage' => 'done', 'message' => 'Connected to ' . ($values['imapMailbox'] ?: 'INBOX') . " ($count messages)."];
}

function crmMailHostname(): string
{
    $host = parse_url(crmPublicBaseUrl(), PHP_URL_HOST);
    return is_string($host) && $host !== '' ? $host : 'localhost';
}

/**
 * Stores and (when configured) sends one outbound email, then logs it on the lead's timeline.
 * $mail keys: leadId, to, subject, html, templateKey, relatedType, relatedId, attachments, userId.
 * Status is "sent" only after the SMTP server accepted the message.
 */
function crmDeliverEmail(array $mail): array
{
    $mail['html'] = crmEmailLayout((string) $mail['html']);
    $from = crmFromAddress() ?: (string) crmCompanySettings()['companyEmail'];
    $domain = substr(strrchr($from, '@') ?: '@omni.local', 1);
    $messageId = '<' . bin2hex(random_bytes(16)) . '@' . $domain . '>';
    $leadId = $mail['leadId'] ?? null;
    $id = crmInsert('crm_emails', [
        'direction' => 'outbound', 'lead_id' => $leadId, 'template_key' => $mail['templateKey'] ?? null,
        'related_type' => $mail['relatedType'] ?? null, 'related_id' => $mail['relatedId'] ?? null,
        'from_address' => $from, 'to_address' => (string) $mail['to'], 'subject' => mb_substr((string) $mail['subject'], 0, 255),
        'body' => (string) $mail['html'], 'status' => 'queued', 'message_id' => $messageId,
    ]);
    if (!crmMailValue('outboundEnabled')) {
        $status = 'queued';
        $error = 'Not sent: outgoing email is switched off (turn it on in the CRM mail settings). The message has been saved.';
    } elseif (!crmSmtpConfigured()) {
        $status = 'queued';
        $error = 'Not sent: SMTP is not set up yet (CRM mail settings). The message has been saved.';
    } else {
        $result = smtpSend(crmSmtpConfig(), [
            'from' => $from, 'envelopeFrom' => crmEnvelopeFrom(), 'fromName' => (string) crmMailValue('emailFromName'), 'to' => [(string) $mail['to']], 'replyTo' => (string) crmMailValue('emailReplyTo'),
            'subject' => (string) $mail['subject'], 'html' => (string) $mail['html'], 'attachments' => $mail['attachments'] ?? [], 'messageId' => $messageId,
            'inReplyTo' => (string) ($mail['inReplyTo'] ?? ''),
        ]);
        $status = $result['ok'] ? 'sent' : 'failed';
        $error = $result['ok'] ? '' : crmSmtpExplain($result) . ' [' . $result['error'] . ']';
        if (!$result['ok']) {
            error_log('[omni-api] email ' . $id . ' failed: ' . $error);
        }
    }
    crmUpdate('crm_emails', $id, ['status' => $status, 'error' => $error !== '' ? mb_substr($error, 0, 1000) : null, 'sent_at' => $status === 'sent' ? crmNow() : null]);
    $subject = (string) $mail['subject'];
    $text = match ($status) {
        'sent' => 'Email sent to ' . $mail['to'] . ': ' . $subject,
        'failed' => 'Email to ' . $mail['to'] . ' failed to send: ' . $subject,
        default => 'Email to ' . $mail['to'] . ' saved but not sent (email sending is not set up): ' . $subject,
    };
    crmLog($leadId, 'email', $text, $mail['userId'] ?? null);
    return crmGet('crm_emails', $id);
}

function crmSendTemplate(string $key, ?array $lead, ?array $quote, ?array $invoice, string $message, string $to, array $attachments, ?int $userId): array
{
    $template = crmTemplate($key);
    if ($template === null) {
        fail(503, 'The "' . $key . '" email template is missing.');
    }
    $values = crmTemplateValues($lead, $quote, $invoice, $message);
    return crmDeliverEmail([
        'leadId' => $lead ? (int) $lead['id'] : null,
        'to' => $to,
        'subject' => crmRenderTemplate((string) $template['subject'], $values, false),
        'html' => crmRenderTemplate((string) $template['body'], $values, true),
        'templateKey' => $key,
        'relatedType' => $quote ? 'quote' : ($invoice ? 'invoice' : null),
        'relatedId' => $quote ? (int) $quote['id'] : ($invoice ? (int) $invoice['id'] : null),
        'attachments' => $attachments,
        'userId' => $userId,
    ]);
}

/** Recipient: the quote/invoice's own customer email when set, otherwise the lead's email. */
function crmLeadEmail(?array $lead, ?array $document = null): string
{
    foreach ([$document['customer_email'] ?? null, $lead['email'] ?? null] as $candidate) {
        $email = strtolower(trim(crmText($candidate)));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false) {
            return $email;
        }
    }
    return '';
}

function crmSendQuote(int $id, array $body, ?int $userId): array
{
    $quote = crmRequireQuote($id);
    if (in_array($quote['status'], ['accepted', 'declined', 'amended'], true)) {
        fail(409, 'This quote is ' . $quote['status'] . ' and can no longer be sent.');
    }
    $input = crmValidate($body, ['message' => crmOptionalText(5000), 'requestDecision' => ['type' => 'bool']], true);
    $message = $input['message'] ?? '';
    $requestDecision = $input['requestDecision'] ?? true;
    $lead = crmRequireLead((int) $quote['lead_id']);
    $to = crmLeadEmail($lead, $quote);
    if ($to === '') {
        fail(400, 'Add an email address to the lead first.');
    }
    $patch = [];
    if ($requestDecision && crmText($quote['signing_token']) === '') {
        $patch['signing_token'] = bin2hex(random_bytes(32));
    } elseif (!$requestDecision) {
        $patch['signing_token'] = null;
    }
    if (!$quote['valid_until']) {
        $patch['valid_until'] = gmdate('Y-m-d', time() + 30 * 86400);
    }
    $wasDraft = $quote['status'] === 'draft';
    if ($wasDraft) {
        $patch['status'] = 'sent';
        $patch['sent_at'] = crmNow();
        $patch['decided_at'] = null;
    }
    crmUpdate('crm_quotes', $id, $patch);
    $quote = crmGet('crm_quotes', $id);
    if ($wasDraft) {
        crmQuoteStatusEffects($quote, 'sent', $userId);
    }
    $email = crmSendTemplate($requestDecision ? 'quote_issued' : 'quote_copy', $lead, $quote, null, (string) $message, $to, [['filename' => $quote['quote_reference'] . '.pdf', 'contentType' => 'application/pdf', 'content' => crmQuotePdf($quote)]], $userId);
    if ($email['status'] === 'sent') {
        crmUpdate('crm_quotes', $id, ['emailed_at' => crmNow()]);
    }
    if ($requestDecision) {
        crmScheduleFollowup('quote', $id, (int) $lead['id'], 'quote_reminder', time() + CRM_FOLLOWUP_DAYS * 86400);
    } else {
        crmCancelFollowups('quote', $id);
    }
    $lookups = crmLookups();
    return ['quote' => crmQuoteOut(crmGet('crm_quotes', $id), $lookups), 'email' => crmEmailOut($email, $lookups)];
}

function crmSendInvoice(int $id, array $body, ?int $userId): array
{
    $invoice = crmRequireInvoice($id);
    if (in_array($invoice['status'], ['paid', 'void'], true)) {
        fail(409, 'This invoice is ' . $invoice['status'] . ' and can no longer be sent.');
    }
    $input = crmValidate($body, ['message' => crmOptionalText(5000), 'scheduleReminders' => ['type' => 'bool']], true);
    $message = $input['message'] ?? '';
    $scheduleReminders = $input['scheduleReminders'] ?? true;
    $lead = $invoice['lead_id'] ? crmGet('crm_leads', (int) $invoice['lead_id']) : null;
    $to = crmLeadEmail($lead, $invoice);
    if ($to === '') {
        fail(400, 'Add an email address to the lead first.');
    }
    $patch = [];
    if ($invoice['status'] === 'draft') {
        $patch['status'] = 'issued';
        $patch['issued_at'] = crmNow();
    }
    $invoiceDate = crmDate($invoice['invoice_date']);
    if ($invoiceDate === null) {
        $invoiceDate = $patch['invoice_date'] = gmdate('Y-m-d');
    }
    if (!$invoice['due_at']) {
        $patch['due_at'] = crmDueDate($invoiceDate, $invoice['payment_terms_days'] === null ? null : (int) $invoice['payment_terms_days']);
    }
    crmUpdate('crm_invoices', $id, $patch);
    $invoice = crmGet('crm_invoices', $id);
    if (isset($patch['status'])) {
        crmLog(crmNullableInt($invoice['lead_id']), 'invoice', 'Invoice ' . $invoice['invoice_reference'] . ' issued (' . crmMoney((int) $invoice['amount_pence']) . ').', $userId);
    }
    $email = crmSendTemplate('invoice_issued', $lead, null, $invoice, (string) $message, $to, [['filename' => $invoice['invoice_reference'] . '.pdf', 'contentType' => 'application/pdf', 'content' => crmInvoicePdf($invoice)]], $userId);
    if ($email['status'] === 'sent') {
        crmUpdate('crm_invoices', $id, ['sent_at' => crmNow()]);
    }
    // First reminder on the due date (or in 3 days, whichever is later), then every 3 days.
    $due = strtotime(crmDate($invoice['due_at']) . ' 09:00:00 UTC') ?: 0;
    if ($scheduleReminders) {
        crmScheduleFollowup('invoice', $id, crmNullableInt($invoice['lead_id']), 'invoice_reminder', max(time() + CRM_FOLLOWUP_DAYS * 86400, $due));
    } else {
        crmCancelFollowups('invoice', $id);
    }
    $lookups = crmLookups();
    return ['invoice' => crmInvoiceOut(crmGet('crm_invoices', $id), $lookups), 'email' => crmEmailOut($email, $lookups)];
}

function crmComposeEmail(array $body, ?int $userId): array
{
    $input = crmValidate($body, [
        'leadId' => ['type' => 'id', 'positive' => true, 'nullable' => true],
        'to' => ['type' => 'email', 'required' => true],
        'subject' => ['type' => 'text', 'min' => 1, 'max' => 255, 'required' => true, 'message' => 'Add a subject.'],
        'body' => ['type' => 'text', 'min' => 1, 'max' => 20000, 'required' => true, 'message' => 'Write a message first.'],
        'replyToEmailId' => ['type' => 'id', 'positive' => true, 'nullable' => true],
    ]);
    if (($input['to'] ?? '') === '') {
        fail(400, 'Enter a valid email address.');
    }
    $leadId = $input['leadId'] ?? null;
    $inReplyTo = '';
    if (!empty($input['replyToEmailId'])) {
        $original = crmGet('crm_emails', (int) $input['replyToEmailId']);
        if ($original === null) {
            fail(404, 'The email you are replying to no longer exists.');
        }
        $inReplyTo = (string) ($original['message_id'] ?? '');
        $leadId = $leadId ?: crmNullableInt($original['lead_id']);
    }
    if ($leadId) {
        crmRequireLead($leadId);
    } else {
        $match = database()->prepare('SELECT id FROM crm_leads WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1');
        $match->execute([$input['to']]);
        $found = $match->fetchColumn();
        $leadId = $found === false ? null : (int) $found;
    }
    $email = crmDeliverEmail(['leadId' => $leadId, 'to' => $input['to'], 'subject' => smtpHeaderValue($input['subject']), 'html' => crmPlainToHtml($input['body']), 'userId' => $userId, 'inReplyTo' => $inReplyTo]);
    if ($leadId && $email['status'] === 'sent') {
        crmMoveStage(crmRequireLead($leadId), 'contacted', $userId, 'email sent');
    }
    return crmEmailOut($email, crmLookups());
}

function crmListEmails(): array
{
    $where = [];
    $values = [];
    $leadId = crmQueryText('leadId');
    if ($leadId !== '') {
        if (!ctype_digit($leadId)) {
            fail(400, CRM_GENERIC_INVALID);
        }
        $where[] = 'lead_id = ?';
        $values[] = (int) $leadId;
    }
    $direction = crmQueryText('direction');
    if ($direction !== '') {
        if (!in_array($direction, ['outbound', 'inbound'], true)) {
            fail(400, CRM_GENERIC_INVALID);
        }
        $where[] = 'direction = ?';
        $values[] = $direction;
    }
    $statement = database()->prepare("SELECT e.*, CASE WHEN e.direction='outbound' THEN (SELECT MIN(i.received_at) FROM crm_emails i WHERE i.lead_id=e.lead_id AND i.direction='inbound' AND i.received_at > e.sent_at) ELSE NULL END AS responded_at FROM crm_emails e" . ($where ? ' WHERE ' . implode(' AND ', array_map(fn ($clause) => 'e.' . $clause, $where)) : '') . ' ORDER BY COALESCE(e.received_at, e.sent_at, e.created_at) DESC, e.id DESC LIMIT 500');
    $statement->execute($values);
    $lookups = crmLookups();
    return array_map(fn ($row) => crmEmailOut($row, $lookups), $statement->fetchAll());
}

/* ---------------------------------------------------------------------------
 * Follow-ups
 * ------------------------------------------------------------------------ */

function crmScheduleFollowup(string $type, int $documentId, ?int $leadId, string $templateKey, int $dueTimestamp): void
{
    $template = crmTemplate($templateKey);
    if ($template === null || !(bool) $template['is_active']) {
        return;
    }
    $due = gmdate('Y-m-d H:i:s', $dueTimestamp);
    $pdo = database();
    $existing = $pdo->prepare('SELECT id FROM crm_followups WHERE document_type = ? AND document_id = ? LIMIT 1');
    $existing->execute([$type, $documentId]);
    $id = $existing->fetchColumn();
    $reset = ['lead_id' => $leadId, 'template_key' => $templateKey, 'due_at' => $due, 'status' => 'pending', 'attempts' => 0, 'max_attempts' => CRM_FOLLOWUP_MAX, 'last_sent_at' => null];
    if ($id !== false) {
        crmUpdate('crm_followups', (int) $id, $reset);
        return;
    }
    try {
        crmInsert('crm_followups', ['document_type' => $type, 'document_id' => $documentId] + $reset);
    } catch (PDOException $error) {
        if ($error->getCode() !== '23000') {
            throw $error;
        }
    }
}

function crmCancelFollowups(string $type, int $documentId): int
{
    $statement = database()->prepare("UPDATE crm_followups SET status = 'cancelled' WHERE document_type = ? AND document_id = ? AND status = 'pending'");
    $statement->execute([$type, $documentId]);
    return $statement->rowCount();
}

function crmListFollowups(): array
{
    $rows = database()->query("SELECT * FROM crm_followups ORDER BY (status = 'pending') DESC, due_at ASC, id DESC LIMIT 500")->fetchAll();
    $references = ['quote' => [], 'invoice' => []];
    foreach (database()->query('SELECT id, quote_reference FROM crm_quotes')->fetchAll() as $row) {
        $references['quote'][(int) $row['id']] = (string) $row['quote_reference'];
    }
    foreach (database()->query('SELECT id, invoice_reference FROM crm_invoices')->fetchAll() as $row) {
        $references['invoice'][(int) $row['id']] = (string) $row['invoice_reference'];
    }
    $lookups = crmLookups();
    return array_map(fn ($row) => crmFollowupOut($row, $lookups, $references), $rows);
}

/**
 * True when the customer has shown any sign of life since $since: an inbound email, or a staff-logged
 * call, note or site visit. Our own outbound email / stage / quote / task logs are ignored so a reminder
 * never cancels the next one. With no $since, any reply or logged contact counts.
 */
function crmHeardFromLeadSince(int $leadId, ?string $since): bool
{
    if ($leadId <= 0) {
        return false;
    }
    $hasBoundary = $since !== null && $since !== '';
    $pdo = database();
    $inbound = $pdo->prepare("SELECT 1 FROM crm_emails WHERE lead_id = ? AND direction = 'inbound' AND received_at IS NOT NULL" . ($hasBoundary ? ' AND received_at > ?' : '') . ' LIMIT 1');
    $inbound->execute($hasBoundary ? [$leadId, $since] : [$leadId]);
    if ($inbound->fetchColumn() !== false) {
        return true;
    }
    $activity = $pdo->prepare("SELECT 1 FROM crm_lead_activities WHERE lead_id = ? AND kind IN ('call','note','visit')" . ($hasBoundary ? ' AND created_at > ?' : '') . ' LIMIT 1');
    $activity->execute($hasBoundary ? [$leadId, $since] : [$leadId]);
    return $activity->fetchColumn() !== false;
}

/** Sends every due reminder (unsigned quotes, unpaid invoices); cancels ones that no longer apply. */
function crmRunFollowups(int $limit = 25): array
{
    $result = ['sent' => 0, 'failed' => 0, 'cancelled' => 0];
    $statement = database()->prepare("SELECT * FROM crm_followups WHERE status = 'pending' AND due_at <= ? ORDER BY due_at, id LIMIT $limit");
    $statement->execute([crmNow()]);
    foreach ($statement->fetchAll() as $followup) {
        $id = (int) $followup['id'];
        // Claim the row so a concurrent run cannot send the same reminder twice.
        $claim = database()->prepare("UPDATE crm_followups SET due_at = ? WHERE id = ? AND status = 'pending' AND due_at = ?");
        $claim->execute([gmdate('Y-m-d H:i:s', time() + 900), $id, $followup['due_at']]);
        if ($claim->rowCount() !== 1) {
            continue;
        }
        $cancel = function () use ($id, &$result): void {
            crmUpdate('crm_followups', $id, ['status' => 'cancelled']);
            $result['cancelled']++;
        };
        $template = crmTemplate((string) $followup['template_key']);
        $isQuote = $followup['document_type'] === 'quote';
        $document = crmGet($isQuote ? 'crm_quotes' : 'crm_invoices', (int) $followup['document_id']);
        $lead = $document && $document['lead_id'] ? crmGet('crm_leads', (int) $document['lead_id']) : null;
        $to = crmLeadEmail($lead, $document);
        $stillOpen = $document !== null && ($isQuote
            ? $document['status'] === 'sent' && !(crmDate($document['valid_until']) !== null && crmDate($document['valid_until']) < gmdate('Y-m-d'))
            : $document['status'] === 'issued');
        if (!$stillOpen || $to === '' || $template === null || !(bool) $template['is_active']) {
            $cancel();
            continue;
        }
        // Quiet follow-up: for quotes, stay silent when the customer has already been in touch since we
        // sent the quote (or the last reminder). Invoices are always chased, reply or not.
        if ($isQuote && $lead) {
            $bounds = array_filter([(string) ($document['emailed_at'] ?? ''), (string) ($document['sent_at'] ?? ''), (string) ($followup['last_sent_at'] ?? ''), (string) ($followup['created_at'] ?? '')], fn ($value) => $value !== '');
            $since = $bounds ? max($bounds) : null;
            if (crmHeardFromLeadSince((int) $lead['id'], $since)) {
                crmUpdate('crm_followups', $id, ['status' => 'cancelled', 'suppress_reason' => 'Heard back from customer']);
                $result['cancelled']++;
                continue;
            }
        }
        try {
            $attachment = $isQuote
                ? ['filename' => $document['quote_reference'] . '.pdf', 'contentType' => 'application/pdf', 'content' => crmQuotePdf($document)]
                : ['filename' => $document['invoice_reference'] . '.pdf', 'contentType' => 'application/pdf', 'content' => crmInvoicePdf($document)];
            $message = $isQuote ? crmAiFollowupLine($lead, $document) : '';
            $email = crmSendTemplate((string) $followup['template_key'], $lead, $isQuote ? $document : null, $isQuote ? null : $document, $message, $to, [$attachment], null);
            $sent = $email['status'] === 'sent';

        } catch (Throwable $error) {
            error_log('[omni-api] follow-up ' . $id . ' failed: ' . get_class($error));
            $sent = false;
        }
        $result[$sent ? 'sent' : 'failed']++;
        $attempts = (int) $followup['attempts'] + 1;
        $done = $attempts >= (int) $followup['max_attempts'];
        crmUpdate('crm_followups', $id, [
            'attempts' => $attempts,
            'last_sent_at' => crmNow(),
            'status' => $done ? 'sent' : 'pending',
            'due_at' => $done ? $followup['due_at'] : gmdate('Y-m-d H:i:s', time() + CRM_FOLLOWUP_DAYS * 86400),
        ]);
    }
    return $result;
}

/** Runs due follow-ups after the response, at most once every 10 minutes across all requests. */
function crmScheduleLazyFollowups(): void
{
    static $registered = false;
    if ($registered) {
        return;
    }
    $registered = true;
    $now = crmNow();
    $cutoff = gmdate('Y-m-d H:i:s', time() - CRM_FOLLOWUP_LAZY_SECONDS);
    $pdo = database();
    $last = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'crm.followups_last_run' LIMIT 1")->fetchColumn();
    if ($last === false) {
        $pdo->prepare("INSERT IGNORE INTO site_settings (setting_key, setting_value, is_public) VALUES ('crm.followups_last_run', '', FALSE)")->execute();
    } elseif ((string) $last !== '' && (string) $last >= $cutoff) {
        return;
    }
    $claim = $pdo->prepare("UPDATE site_settings SET setting_value = ? WHERE setting_key = 'crm.followups_last_run' AND (setting_value IS NULL OR setting_value = '' OR setting_value < ?)");
    $claim->execute([$now, $cutoff]);
    if ($claim->rowCount() !== 1) {
        return;
    }
    register_shutdown_function(function (): void {
        try {
            if (function_exists('fastcgi_finish_request')) {
                @fastcgi_finish_request();
            } elseif (function_exists('litespeed_finish_request')) {
                @litespeed_finish_request();
            }
            crmRunFollowups();
        } catch (Throwable $error) {
            error_log('[omni-api] background follow-ups failed: ' . get_class($error));
        }
    });
}

/* ---------------------------------------------------------------------------
 * Inbox sync (IMAP)
 * ------------------------------------------------------------------------ */

function crmImapDecode(string $data, int $encoding, string $charset): string
{
    $data = match ($encoding) {
        3 => (string) base64_decode($data),
        4 => quoted_printable_decode($data),
        default => $data,
    };
    $charset = strtoupper(trim($charset));
    if ($charset !== '' && $charset !== 'UTF-8' && $charset !== 'US-ASCII') {
        $converted = @mb_convert_encoding($data, 'UTF-8', $charset);
        if (is_string($converted)) {
            $data = $converted;
        }
    }
    return mb_check_encoding($data, 'UTF-8') ? $data : mb_convert_encoding($data, 'UTF-8', 'ISO-8859-1');
}

/** Finds the first text/plain (preferred) or text/html part. @return array{string, object}|null */
function crmImapFindPart(object $structure, string $prefix, string $subtype): ?array
{
    if (empty($structure->parts)) {
        return ((int) $structure->type === 0 && strtoupper((string) ($structure->subtype ?? '')) === $subtype) ? [$prefix === '' ? '1' : $prefix, $structure] : null;
    }
    foreach ($structure->parts as $index => $part) {
        $number = ($prefix === '' ? '' : $prefix . '.') . ($index + 1);
        if (!empty($part->parts)) {
            $found = crmImapFindPart($part, $number, $subtype);
            if ($found !== null) {
                return $found;
            }
        } elseif ((int) $part->type === 0 && strtoupper((string) ($part->subtype ?? '')) === $subtype) {
            return [$number, $part];
        }
    }
    return null;
}

function crmImapCharset(object $part): string
{
    foreach (array_merge($part->parameters ?? [], $part->dparameters ?? []) as $parameter) {
        if (strtolower((string) $parameter->attribute) === 'charset') {
            return (string) $parameter->value;
        }
    }
    return '';
}

/** Plain text of a message (HTML-only mail is reduced to text, so nothing active is stored). */
function crmImapText($stream, int $uid): string
{
    $structure = @imap_fetchstructure($stream, $uid, FT_UID);
    if (!is_object($structure)) {
        return '';
    }
    foreach (['PLAIN', 'HTML'] as $subtype) {
        $found = crmImapFindPart($structure, '', $subtype);
        if ($found === null) {
            continue;
        }
        [$number, $part] = $found;
        $raw = (string) @imap_fetchbody($stream, $uid, $number, FT_UID | FT_PEEK);
        $text = crmImapDecode($raw, (int) ($part->encoding ?? 0), crmImapCharset($part));
        return $subtype === 'HTML' ? smtpHtmlToText($text) : $text;
    }
    return '';
}

function crmImapHeaderText(string $value): string
{
    $decoded = function_exists('iconv_mime_decode') ? @iconv_mime_decode($value, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8') : false;
    return trim(is_string($decoded) ? $decoded : $value);
}

function crmSyncInbox(): array
{
    if (!crmImapConfigured()) {
        return ['status' => 'not-configured', 'imported' => 0, 'message' => 'Inbox sync is not set up: add the IMAP server, login and password in the CRM mail settings.'];
    }
    if (!function_exists('imap_open')) {
        return ['status' => 'unavailable', 'imported' => 0, 'message' => 'The PHP imap extension is not available on this server.'];
    }
    $mailbox = crmImapMailboxString();
    [$stream, , $detail] = crmImapOpen();
    if ($stream === false) {
        error_log('[omni-api] IMAP connection failed: ' . $detail);
        return ['status' => 'failed', 'imported' => 0, 'message' => 'Could not open the mailbox: ' . mb_substr($detail, 0, 200)];
    }
    $imported = 0;
    $startedAt = time();
    $pdo = database();
    try {
        // Messages stay unread (FT_PEEK, read-only mailbox), so select by date rather than UNSEEN:
        // from one day before the last sync (first run: the last 14 days), deduplicated by Message-ID.
        $last = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'crm.imap_last_sync' LIMIT 1")->fetchColumn();
        $lastTime = is_string($last) && $last !== '' ? (strtotime($last . ' UTC') ?: 0) : 0;
        $since = $lastTime > 0 ? max($lastTime - 86400, $startedAt - 60 * 86400) : $startedAt - 14 * 86400;
        $uids = @imap_search($stream, 'SINCE "' . gmdate('j-M-Y', $since) . '"', SE_UID) ?: [];
        rsort($uids);
        $exists = $pdo->prepare('SELECT 1 FROM crm_emails WHERE message_id = ? LIMIT 1');
        $findLead = $pdo->prepare('SELECT id FROM crm_leads WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1');
        // Newest first; at most CRM_IMAP_BATCH new messages per run (headers of up to 500 are checked).
        foreach (array_slice($uids, 0, 500) as $uid) {
            if ($imported >= CRM_IMAP_BATCH) {
                break;
            }
            $uid = (int) $uid;
            $header = @imap_rfc822_parse_headers((string) @imap_fetchheader($stream, $uid, FT_UID));
            if (!is_object($header)) {
                continue;
            }
            $messageId = mb_substr(trim((string) ($header->message_id ?? '')), 0, 255);
            if ($messageId === '') {
                $messageId = '<imap-' . hash('sha256', $mailbox . '|' . $uid . '|' . ($header->date ?? '')) . '@omni.local>';
            }
            $exists->execute([$messageId]);
            if ($exists->fetchColumn() !== false) {
                continue;
            }
            $sender = $header->from[0] ?? null;
            $from = $sender && isset($sender->mailbox, $sender->host) ? strtolower($sender->mailbox . '@' . $sender->host) : '';
            $to = [];
            foreach ($header->to ?? [] as $recipient) {
                if (isset($recipient->mailbox, $recipient->host)) {
                    $to[] = strtolower($recipient->mailbox . '@' . $recipient->host);
                }
            }
            $subject = mb_substr(crmImapHeaderText((string) ($header->subject ?? '')), 0, 255);
            $timestamp = strtotime((string) ($header->date ?? '')) ?: time();
            $text = mb_substr(crmImapText($stream, $uid), 0, 20000);
            $leadId = null;
            if (filter_var($from, FILTER_VALIDATE_EMAIL) !== false) {
                $findLead->execute([$from]);
                $found = $findLead->fetchColumn();
                $leadId = $found === false ? null : (int) $found;
            }
            try {
                crmInsert('crm_emails', [
                    'direction' => 'inbound', 'lead_id' => $leadId, 'from_address' => mb_substr($from, 0, 255), 'to_address' => mb_substr(implode(', ', $to), 0, 500),
                    'subject' => $subject, 'body' => crmPlainToHtml($text !== '' ? $text : '(no text content)'), 'status' => 'received',
                    'message_id' => $messageId, 'received_at' => gmdate('Y-m-d H:i:s', $timestamp),
                ]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    continue;
                }
                throw $error;
            }
            $imported++;
            crmLog($leadId, 'email', 'Email received from ' . $from . ': ' . ($subject !== '' ? $subject : '(no subject)'), null);
        }
    } finally {
        // No CL_EXPUNGE: closing never removes anything.
        @imap_close($stream);
        imap_errors();
        imap_alerts();
    }
    $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES ('crm.imap_last_sync', ?, FALSE) ON DUPLICATE KEY UPDATE setting_value = ?")
        ->execute([gmdate('Y-m-d H:i:s', $startedAt), gmdate('Y-m-d H:i:s', $startedAt)]);
    return ['status' => 'ok', 'imported' => $imported, 'message' => $imported === 1 ? '1 new email imported.' : $imported . ' new emails imported.'];
}

/* ---------------------------------------------------------------------------
 * Discreet DeepSeek analyst: read-only prioritisation of CRM follow-up signals
 * ------------------------------------------------------------------------ */

function crmAiStored(): array
{
    $rows = database()->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('ai.enabled','ai.followup_enabled','ai.model','ai.api_key','ai.last_analysis','ai.last_run')")->fetchAll();
    $out = [];
    foreach ($rows as $row) $out[(string) $row['setting_key']] = (string) ($row['setting_value'] ?? '');
    return $out;
}

function crmAiConfig(): array
{
    $stored = crmAiStored();
    $configKey = trim(setting('DEEPSEEK_API_KEY'));
    $key = $configKey !== '' ? $configKey : (($stored['ai.api_key'] ?? '') !== '' ? crmDecryptSecret($stored['ai.api_key']) : '');
    $configModel = trim(setting('DEEPSEEK_MODEL'));
    return [
        'enabled' => in_array(strtolower($stored['ai.enabled'] ?? 'false'), ['1', 'true', 'yes', 'on'], true),
        'followupEnabled' => in_array(strtolower($stored['ai.followup_enabled'] ?? 'false'), ['1', 'true', 'yes', 'on'], true),
        'model' => $configModel !== '' ? $configModel : ($stored['ai.model'] ?? 'deepseek-chat'),
        'apiKey' => $key,
        'apiKeySet' => $key !== '',
        'source' => $configKey !== '' ? 'config' : 'database',
        'lastRun' => crmIso($stored['ai.last_run'] ?? null),
        'lastAnalysis' => $stored['ai.last_analysis'] ?? '',
    ];
}

function crmAiSettingsOut(): array
{
    $config = crmAiConfig();
    return ['enabled' => $config['enabled'], 'followupEnabled' => $config['followupEnabled'], 'model' => $config['model'], 'apiKeySet' => $config['apiKeySet'], 'source' => $config['source'], 'lastRun' => $config['lastRun']];
}

/**
 * One short, warm follow-up sentence for a quote reminder, written by DeepSeek. Returns '' when the
 * assistant is off, unconfigured, unreachable or returns nothing usable, and the caller then sends the
 * plain reminder. Only metadata is sent (first name, reference, title, total, valid-until) — never
 * message bodies, addresses, phone numbers or bank details. The returned line is raw text: the template
 * renderer escapes it and turns it into a paragraph.
 */
function crmAiFollowupLine(?array $lead, ?array $quote): string
{
    $config = crmAiConfig();
    if (!$config['followupEnabled'] || !$config['apiKeySet'] || !function_exists('curl_init') || $quote === null) {
        return '';
    }
    $name = crmText($lead['name'] ?? ($quote['customer_name'] ?? ''));
    $first = trim((string) (preg_split('/\s+/', trim($name))[0] ?? ''));
    $context = [
        'firstName' => $first !== '' ? $first : 'there',
        'reference' => crmText($quote['quote_reference'] ?? ''),
        'title' => crmText($quote['title'] ?? ''),
        'total' => crmMoney((int) ($quote['amount_pence'] ?? 0)),
        'validUntil' => crmLongDate(crmDate($quote['valid_until'] ?? null)),
    ];
    $request = json_encode([
        'model' => $config['model'], 'max_tokens' => 120, 'temperature' => 0.6,
        'messages' => [
            ['role' => 'system', 'content' => 'You write one warm, natural, single-sentence follow-up line for a UK construction company, as if from the same team that sent the quote. Reference the project naturally. British English, no emoji, no pressure, no placeholders, no greeting or sign-off, maximum 35 words. Never invent facts.'],
            ['role' => 'user', 'content' => 'Write the follow-up line for this quote: ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)],
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    try {
        $curl = curl_init('https://api.deepseek.com/chat/completions');
        curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['apiKey'], 'Content-Type: application/json'], CURLOPT_POSTFIELDS => $request]);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($raw) || $raw === '' || $status < 200 || $status >= 300) {
            error_log('[omni-api] DeepSeek follow-up line failed: HTTP ' . $status . ' ' . $error);
            return '';
        }
        $response = json_decode($raw, true);
        $line = trim((string) ($response['choices'][0]['message']['content'] ?? ''));
        $line = trim((string) preg_replace('/\s+/', ' ', strip_tags($line)));
        $line = trim($line, " \t\n\r\0\x0B\"'");
        return mb_substr($line, 0, 400);
    } catch (Throwable $error) {
        error_log('[omni-api] DeepSeek follow-up line error: ' . get_class($error));
        return '';
    }
}

function crmUpdateAiSettings(array $body): array
{
    $input = crmValidate($body, ['enabled' => ['type' => 'bool'], 'followupEnabled' => ['type' => 'bool'], 'model' => ['type' => 'text', 'min' => 1, 'max' => 100]], true);
    $writes = [];
    if (array_key_exists('enabled', $input)) $writes['ai.enabled'] = $input['enabled'] ? 'true' : 'false';
    if (array_key_exists('followupEnabled', $input)) $writes['ai.followup_enabled'] = $input['followupEnabled'] ? 'true' : 'false';
    if (array_key_exists('model', $input)) $writes['ai.model'] = trim($input['model']);
    if (array_key_exists('apiKey', $body)) {
        if (trim(setting('DEEPSEEK_API_KEY')) !== '') fail(409, 'The DeepSeek key is set in the server configuration and cannot be changed here.');
        $value = $body['apiKey'];
        if ($value === null) $writes['ai.api_key'] = '';
        elseif (!is_string($value) || strlen($value) > 500) fail(400, 'Enter a valid API key.');
        elseif ($value !== '') $writes['ai.api_key'] = crmEncryptSecret(trim($value));
    }
    $statement = database()->prepare('INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE setting_value = ?, is_public = FALSE');
    foreach ($writes as $key => $value) $statement->execute([$key, $value, $value]);
    return crmAiSettingsOut();
}

/** Only operational metadata is sent: no message bodies, phone numbers, addresses or financial details. */
function crmAiSignals(): array
{
    $pdo = database();
    $overdue = $pdo->query("SELECT t.id, t.title, t.due_at, l.lead_reference, l.name AS lead_name FROM crm_tasks t LEFT JOIN crm_leads l ON l.id=t.lead_id WHERE t.status='open' AND t.due_at IS NOT NULL AND t.due_at < UTC_TIMESTAMP() ORDER BY t.due_at LIMIT 40")->fetchAll();
    $unfollowed = $pdo->query("SELECT l.id, l.lead_reference, l.name, l.stage, l.updated_at, MAX(a.created_at) AS last_activity FROM crm_leads l LEFT JOIN crm_lead_activities a ON a.lead_id=l.id WHERE l.stage IN ('new','contacted','site_visit','quoted') GROUP BY l.id HAVING COALESCE(MAX(a.created_at), l.created_at) < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY) ORDER BY COALESCE(MAX(a.created_at), l.created_at) LIMIT 40")->fetchAll();
    $unanswered = $pdo->query("SELECT o.id, o.subject, o.sent_at, l.lead_reference, l.name AS lead_name FROM crm_emails o LEFT JOIN crm_leads l ON l.id=o.lead_id WHERE o.direction='outbound' AND o.status='sent' AND o.sent_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY) AND o.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crm_emails i WHERE i.lead_id=o.lead_id AND i.direction='inbound' AND i.received_at > o.sent_at) ORDER BY o.sent_at LIMIT 40")->fetchAll();
    return [
        'overdueTasks' => array_map(fn ($row) => ['id' => (int) $row['id'], 'title' => crmText($row['title']), 'dueAt' => crmIso($row['due_at']), 'leadReference' => crmText($row['lead_reference']), 'leadName' => crmText($row['lead_name'])], $overdue),
        'unfollowedLeads' => array_map(fn ($row) => ['id' => (int) $row['id'], 'reference' => crmText($row['lead_reference']), 'name' => crmText($row['name']), 'stage' => crmText($row['stage']), 'lastActivity' => crmIso($row['last_activity'] ?: $row['updated_at'])], $unfollowed),
        'unansweredEmails' => array_map(fn ($row) => ['id' => (int) $row['id'], 'subject' => crmText($row['subject']), 'sentAt' => crmIso($row['sent_at']), 'leadReference' => crmText($row['lead_reference']), 'leadName' => crmText($row['lead_name'])], $unanswered),
    ];
}

function crmAiAnalysisOut(): array
{
    $config = crmAiConfig();
    $analysis = json_decode($config['lastAnalysis'], true);
    return ['settings' => crmAiSettingsOut(), 'signals' => crmAiSignals(), 'analysis' => is_array($analysis) ? $analysis : null];
}

function crmRunAiAnalysis(): array
{
    $config = crmAiConfig();
    if (!$config['enabled']) fail(409, 'The DeepSeek analyst is switched off. Enable it in Settings first.');
    if (!$config['apiKeySet']) fail(409, 'Add a DeepSeek API key in Settings first.');
    if (!function_exists('curl_init')) fail(503, 'The server needs the PHP cURL extension to run the DeepSeek analyst.');
    $signals = crmAiSignals();
    $prompt = json_encode($signals, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $request = json_encode([
        'model' => $config['model'], 'max_tokens' => 1200, 'response_format' => ['type' => 'json_object'],
        'messages' => [
            ['role' => 'system', 'content' => 'You are a discreet CRM operations analyst for a UK construction company. Return JSON only: {"summary":"one short sentence","priorities":[{"severity":"high|medium|low","title":"short action","reason":"short evidence","kind":"task|lead|email","recordId":123}]}. Prioritise missed customer follow-up and overdue commitments. Never invent facts. Maximum 8 priorities.'],
            ['role' => 'user', 'content' => 'Analyse this CRM signal JSON and prioritise the work: ' . $prompt],
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $curl = curl_init('https://api.deepseek.com/chat/completions');
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $config['apiKey'], 'Content-Type: application/json'], CURLOPT_POSTFIELDS => $request]);
    $raw = curl_exec($curl); $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE); $error = curl_error($curl); curl_close($curl);
    if (!is_string($raw) || $raw === '' || $status < 200 || $status >= 300) {
        error_log('[omni-api] DeepSeek request failed: HTTP ' . $status . ' ' . $error);
        fail(502, $status === 401 ? 'DeepSeek rejected the API key. Check it in Settings.' : 'DeepSeek analysis is temporarily unavailable.');
    }
    $response = json_decode($raw, true);
    $content = trim((string) ($response['choices'][0]['message']['content'] ?? ''));
    $analysis = json_decode($content, true);
    if (!is_array($analysis) || !is_string($analysis['summary'] ?? null) || !is_array($analysis['priorities'] ?? null)) fail(502, 'DeepSeek returned an unexpected analysis. Please try again.');
    $safe = ['summary' => mb_substr(strip_tags($analysis['summary']), 0, 500), 'priorities' => []];
    foreach (array_slice($analysis['priorities'], 0, 8) as $item) {
        if (!is_array($item)) continue;
        $safe['priorities'][] = ['severity' => in_array($item['severity'] ?? '', ['high','medium','low'], true) ? $item['severity'] : 'medium', 'title' => mb_substr(strip_tags((string) ($item['title'] ?? 'Follow up')), 0, 180), 'reason' => mb_substr(strip_tags((string) ($item['reason'] ?? '')), 0, 500), 'kind' => in_array($item['kind'] ?? '', ['task','lead','email'], true) ? $item['kind'] : 'lead', 'recordId' => max(0, (int) ($item['recordId'] ?? 0))];
    }
    $json = json_encode($safe, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $now = crmNow();
    $statement = database()->prepare('INSERT INTO site_settings (setting_key, setting_value, is_public) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE setting_value = ?, is_public = FALSE');
    $statement->execute(['ai.last_analysis', $json, $json]);
    $statement->execute(['ai.last_run', $now, $now]);
    return crmAiAnalysisOut();
}

function crmMaybeRunAiAnalysis(): void
{
    $config = crmAiConfig();
    if (!$config['enabled'] || !$config['apiKeySet']) return;
    $last = $config['lastRun'] ? strtotime($config['lastRun']) : 0;
    if ($last > time() - 6 * 3600) return;
    try { crmRunAiAnalysis(); } catch (Throwable $error) { error_log('[omni-api] background DeepSeek analysis failed: ' . get_class($error)); }
}

/* ---------------------------------------------------------------------------
 * Public signing
 * ------------------------------------------------------------------------ */

function crmQuoteByToken(string $token): array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        fail(404, 'This signing link is not valid.');
    }
    $quote = crmFindBy('crm_quotes', 'signing_token', $token);
    if ($quote === null) {
        fail(404, 'This signing link is not valid.');
    }
    return $quote;
}

/** 410 when the document can no longer be viewed or signed. Signed quotes stay viewable. */
function crmAssertSignable(array $quote): void
{
    if (in_array($quote['status'], ['accepted', 'declined'], true)) {
        return;
    }
    if ($quote['status'] === 'amended') {
        fail(410, 'This quote has been replaced by a newer version. Please use the link in our latest email.');
    }
    if ($quote['status'] === 'draft') {
        fail(410, 'This quote is no longer available. Please contact us for an up-to-date quote.');
    }
    $validUntil = crmDate($quote['valid_until']);
    if ($validUntil !== null && $validUntil < gmdate('Y-m-d')) {
        fail(410, 'This quote has expired. Please contact us for an updated quote.');
    }
}

function crmSignDocument(array $quote): array
{
    $lead = crmGet('crm_leads', (int) $quote['lead_id']);
    $company = crmCompanySettings();
    return [
        'reference' => crmText($quote['quote_reference']),
        'title' => crmText($quote['title']),
        'version' => (int) ($quote['version'] ?: 1),
        'status' => crmText($quote['status']),
        'customerName' => crmText($quote['customer_name']) !== '' ? crmText($quote['customer_name']) : ($lead ? crmText($lead['name']) : ''),
        'items' => array_map(fn ($item) => ['description' => $item['description'], 'quantity' => $item['quantity'], 'unitPricePence' => $item['unitPricePence'], 'amountPence' => $item['amountPence']], crmItems('quote', (int) $quote['id'])),
        'subtotalPence' => (int) $quote['subtotal_pence'],
        'vatRatePercent' => crmBpToPercent((int) $quote['vat_rate_bp']),
        'vatPence' => (int) $quote['vat_pence'],
        'totalPence' => (int) $quote['amount_pence'],
        'validUntil' => crmDate($quote['valid_until']),
        'notes' => crmText($quote['notes']),
        'terms' => crmText($quote['terms']),
        'signedName' => crmText($quote['signed_name']),
        'signedAt' => crmIso($quote['signed_at']),
        'declinedReason' => crmText($quote['declined_reason'] ?? null),
        'company' => ['name' => $company['companyName'], 'address' => $company['companyAddress'], 'email' => $company['companyEmail'], 'phone' => $company['companyPhone']],
    ];
}

function crmSignQuote(string $token, array $body): array
{
    $quote = crmQuoteByToken($token);
    if ($quote['status'] === 'accepted') {
        fail(409, 'This quote has already been signed.');
    }
    crmAssertSignable($quote);
    $decision = is_string($body['decision'] ?? null) ? strtolower(trim($body['decision'])) : 'accept';
    if ($decision === 'decline') {
        $reason = is_string($body['reason'] ?? null) ? trim((string) preg_replace('/\s+/', ' ', $body['reason'])) : '';
        if (mb_strlen($reason) > 1000) {
            fail(400, 'Please keep the reason under 1,000 characters.');
        }
        $now = crmNow();
        $statement = database()->prepare("UPDATE crm_quotes SET status = 'declined', declined_reason = ?, decided_at = ? WHERE id = ? AND status = 'sent' AND signed_at IS NULL");
        $statement->execute([$reason !== '' ? $reason : null, $now, (int) $quote['id']]);
        if ($statement->rowCount() !== 1) {
            fail(409, 'A response has already been recorded for this quote.');
        }
        $quote = crmGet('crm_quotes', (int) $quote['id']);
        crmLog((int) $quote['lead_id'], 'quote', 'Quote ' . $quote['quote_reference'] . ' declined online' . ($reason !== '' ? ': ' . $reason : '.'), null);
        crmCancelFollowups('quote', (int) $quote['id']);
        try {
            $lead = crmGet('crm_leads', (int) $quote['lead_id']);
            $to = crmLeadEmail($lead, $quote);
            if ($to !== '') {
                crmSendTemplate('quote_declined', $lead, $quote, null, '', $to, [], null);
            }
        } catch (Throwable $error) {
            error_log('[omni-api] declined-quote confirmation failed: ' . get_class($error));
        }
        return crmSignDocument($quote);
    }
    if ($decision !== 'accept') {
        fail(400, 'Choose accept or decline.');
    }
    $name = is_string($body['name'] ?? null) ? trim((string) preg_replace('/\s+/', ' ', $body['name'])) : '';
    if (mb_strlen($name) < 2 || mb_strlen($name) > 190) {
        fail(400, 'Type your full name to sign.');
    }
    if (($body['agree'] ?? null) !== true) {
        fail(400, 'Please confirm that you accept the quote and its terms.');
    }
    $now = crmNow();
    // Conditional update: two simultaneous signatures cannot both succeed.
    $statement = database()->prepare("UPDATE crm_quotes SET status = 'accepted', signed_name = ?, signed_at = ?, signed_ip = ?, signed_user_agent = ?, decided_at = ? WHERE id = ? AND status = 'sent' AND signed_at IS NULL");
    $statement->execute([$name, $now, mb_substr(clientIp(), 0, 64), mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255), $now, (int) $quote['id']]);
    if ($statement->rowCount() !== 1) {
        fail(409, 'This quote has already been signed.');
    }
    $quote = crmGet('crm_quotes', (int) $quote['id']);
    crmLog((int) $quote['lead_id'], 'quote', 'Quote ' . $quote['quote_reference'] . ' signed electronically by ' . $name . '.', null);
    crmQuoteStatusEffects($quote, 'accepted', null);
    crmCancelFollowups('quote', (int) $quote['id']);
    try {
        $lead = crmGet('crm_leads', (int) $quote['lead_id']);
        $to = crmLeadEmail($lead, $quote);
        if ($to !== '') {
            crmSendTemplate('quote_accepted', $lead, $quote, null, '', $to, [['filename' => $quote['quote_reference'] . '-signed.pdf', 'contentType' => 'application/pdf', 'content' => crmQuotePdf($quote)]], null);
        }
    } catch (Throwable $error) {
        // The signature is recorded; a confirmation email problem must not undo or hide that.
        error_log('[omni-api] signed-quote confirmation failed: ' . get_class($error));
    }
    return crmSignDocument($quote);
}

/** Public routes: /sign/:token, /sign/:token/pdf and /cron/crm. Returns when the route is not one of them. */
function handleCrmSalesPublicRoute(string $method, string $route): void
{
    if (preg_match('#^/sign/([^/]+)(/pdf)?$#', $route, $match)) {
        $token = strtolower($match[1]);
        $isPdf = ($match[2] ?? '') !== '';
        // A customer can open a signing link before any staff request has applied pending migrations.
        crmEnsureMigrations();
        if ($method === 'GET') {
            rateLimit('crm-sign-view', 60, 600);
            $quote = crmQuoteByToken($token);
            crmAssertSignable($quote);
            if ($isPdf) {
                crmSendPdf($quote['quote_reference'] . '.pdf', crmQuotePdf($quote));
            }
            header('X-Robots-Tag: noindex, nofollow');
            crmRespond(['document' => crmSignDocument($quote)]);
        }
        if ($method === 'POST' && !$isPdf) {
            rateLimit('crm-sign-submit', 10, 600, 'Too many signing attempts. Please wait a few minutes and try again.');
            crmRespond(['document' => crmSignQuote($token, requestData())]);
        }
        fail(404, 'Not found.');
    }
    if ($route === '/cron/crm' && $method === 'GET') {
        $secret = setting('CRM_CRON_SECRET');
        $key = is_string($_GET['key'] ?? null) ? (string) $_GET['key'] : '';
        // Compare digests so the check takes the same time whatever the key length.
        if (strlen($secret) < 32 || !hash_equals(hash('sha256', $secret), hash('sha256', $key))) {
            fail(404, 'Not found.');
        }
        rateLimit('crm-cron', 30, 600);
        crmEnsureMigrations();
        $followups = crmRunFollowups(50);
        try {
            $sync = crmSyncInbox();
        } catch (Throwable $error) {
            error_log('[omni-api] inbox sync failed: ' . get_class($error));
            $sync = ['status' => 'failed', 'imported' => 0, 'message' => 'Inbox sync failed.'];
        }
        database()->prepare("UPDATE site_settings SET setting_value = ? WHERE setting_key = 'crm.followups_last_run'")->execute([crmNow()]);
        crmMaybeRunAiAnalysis();
        crmRespond(['result' => ['followups' => $followups, 'sync' => $sync]]);
    }
}

/* ---------------------------------------------------------------------------
 * Staff routes (called from handleCrmRoute after authentication)
 * ------------------------------------------------------------------------ */

function handleCrmSalesRoute(string $method, string $path, array $user, ?int $userId, array $body): void
{
    if (preg_match('#^/quotes/(\d+)(?:/(pdf|send|revise))?$#', $path, $match)) {
        $id = (int) $match[1];
        $action = $match[2] ?? '';
        if ($method === 'GET' && $action === '') {
            crmRespond(['quote' => crmQuoteOut(crmRequireQuote($id), crmLookups())]);
        }
        if ($method === 'GET' && $action === 'pdf') {
            $quote = crmRequireQuote($id);
            crmSendPdf($quote['quote_reference'] . '.pdf', crmQuotePdf($quote));
        }
        if ($method === 'POST' && $action === 'send') {
            crmRespond(crmSendQuote($id, $body, $userId));
        }
        if ($method === 'POST' && $action === 'revise') {
            crmRespond(['quote' => crmReviseQuote($id, $userId)], 201);
        }
    }
    if ($method === 'POST' && preg_match('#^/invoices/from-quote/(\d+)$#', $path, $match)) {
        crmRespond(['invoice' => crmInvoiceFromQuote((int) $match[1], $body, $userId)], 201);
    }
    if (preg_match('#^/invoices/(\d+)(?:/(pdf|send))?$#', $path, $match)) {
        $id = (int) $match[1];
        $action = $match[2] ?? '';
        if ($method === 'GET' && $action === '') {
            crmRespond(['invoice' => crmInvoiceOut(crmRequireInvoice($id), crmLookups())]);
        }
        if ($method === 'GET' && $action === 'pdf') {
            $invoice = crmRequireInvoice($id);
            crmSendPdf($invoice['invoice_reference'] . '.pdf', crmInvoicePdf($invoice));
        }
        if ($method === 'POST' && $action === 'send') {
            crmRespond(crmSendInvoice($id, $body, $userId));
        }
    }
    if ($path === '/emails') {
        if ($method === 'GET') {
            crmRespond(['records' => crmListEmails()]);
        }
        if ($method === 'POST') {
            crmRespond(['email' => crmComposeEmail($body, $userId)], 201);
        }
    }
    if ($method === 'POST' && $path === '/emails/sync') {
        try {
            $result = crmSyncInbox();
        } catch (Throwable $error) {
            error_log('[omni-api] inbox sync failed: ' . get_class($error));
            $result = ['status' => 'failed', 'imported' => 0, 'message' => 'Inbox sync failed. Please try again later.'];
        }
        crmRespond(['result' => $result]);
    }
    if ($method === 'GET' && $path === '/email-templates') {
        crmRespond(['templates' => crmTemplates()]);
    }
    if ($method === 'PATCH' && preg_match('#^/email-templates/([a-z0-9_]{1,64})$#', $path, $match)) {
        crmRespond(['template' => crmUpdateTemplate($match[1], $body)]);
    }
    if ($method === 'GET' && $path === '/followups') {
        crmRespond(['records' => crmListFollowups()]);
    }
    if ($method === 'POST' && $path === '/followups/run') {
        database()->prepare("UPDATE site_settings SET setting_value = ? WHERE setting_key = 'crm.followups_last_run'")->execute([crmNow()]);
        crmRespond(['result' => crmRunFollowups(50)]);
    }
    if ($method === 'GET' && $path === '/mail-status') {
        crmRespond(['status' => crmMailStatus()]);
    }
    if ($path === '/mail-settings') {
        if ($method === 'GET') {
            crmRespond(['settings' => crmMailSettingsOut()]);
        }
        if ($method === 'PATCH') {
            crmRequireManager($user, 'Only owners and administrators can change the email settings.');
            crmRespond(['settings' => crmUpdateMailSettings($body)]);
        }
    }
    if ($method === 'POST' && $path === '/mail-test') {
        crmRespond(['result' => crmMailTest($body)]);
    }
    if ($method === 'POST' && $path === '/imap-test') {
        crmRespond(['result' => crmImapTest()]);
    }
    if ($path === '/agent') {
        if ($method === 'GET') crmRespond(crmAiAnalysisOut());
        if ($method === 'POST') crmRespond(crmRunAiAnalysis());
    }
    if ($path === '/agent/settings') {
        if ($method === 'GET') {
            crmRequireManager($user, 'Only owners and administrators can view the AI settings.');
            crmRespond(['settings' => crmAiSettingsOut()]);
        }
        if ($method === 'PATCH') {
            crmRequireManager($user, 'Only owners and administrators can change the AI settings.');
            crmRespond(['settings' => crmUpdateAiSettings($body)]);
        }
    }
    if ($path === '/settings') {
        if ($method === 'GET') {
            crmRespond(['settings' => crmCompanySettings()]);
        }
        if ($method === 'PATCH') {
            crmRequireManager($user, 'Only owners and administrators can change company settings.');
            crmRespond(['settings' => crmUpdateSettings($body)]);
        }
    }
}
