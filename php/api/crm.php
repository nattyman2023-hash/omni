<?php

declare(strict_types=1);

/*
 * Omni CRM for the PHP (shared-hosting) API.
 *
 * Mirrors server/crm.ts: same routes, JSON shapes, validation messages and pipeline rules.
 * Loaded by index.php; uses its helpers (database(), requestData(), fail(), jsonResponse(),
 * currentStaffUser(), rateLimit(), setting()). All SQL uses prepared statements, and column
 * names only ever come from the fixed whitelists below.
 */

const CRM_STAGES = ['new', 'contacted', 'site_visit', 'quoted', 'won', 'lost'];
const CRM_PIPELINE = ['new', 'contacted', 'site_visit', 'quoted', 'won'];
const CRM_STAGE_LABELS = ['new' => 'New', 'contacted' => 'Contacted', 'site_visit' => 'Site visit', 'quoted' => 'Quoted', 'won' => 'Won', 'lost' => 'Lost'];
/** Staff account roles, matching the users.role enum in deploy/schema.sql. */
const CRM_ROLES = ['owner', 'admin', 'staff'];
const CRM_COLUMNS = [
    'crm_leads' => ['public_reference', 'source', 'source_detail', 'external_id', 'contact_enquiry_id', 'quote_request_id', 'name', 'email', 'phone', 'postcode', 'address', 'project_type', 'property_type', 'budget', 'desired_start', 'description', 'preferred_contact', 'stage', 'lost_reason', 'estimated_value_pence', 'assigned_user_id', 'raw_payload', 'stage_changed_at', 'created_at'],
    'crm_lead_activities' => ['lead_id', 'user_id', 'kind', 'body'],
    'crm_site_visits' => ['lead_id', 'scheduled_at', 'address', 'duration_minutes', 'assigned_user_id', 'status', 'notes'],
    'crm_tasks' => ['lead_id', 'assigned_user_id', 'title', 'notes', 'due_at', 'status', 'completed_at'],
    'crm_quotes' => ['quote_reference', 'lead_id', 'title', 'amount_pence', 'status', 'valid_until', 'notes', 'sent_at', 'decided_at'],
    'crm_invoices' => ['lead_id', 'quote_id', 'invoice_reference', 'customer_name', 'amount_pence', 'status', 'due_at', 'notes', 'issued_at', 'paid_at'],
];
const CRM_GENERIC_INVALID = 'Please check the details entered.';
const CRM_MAX_PENCE = 100000000000;

/* ---------------------------------------------------------------------------
 * Pure helpers
 * ------------------------------------------------------------------------ */

/** The stage a lead should move to when $target happens, or null (never backwards, never out of won/lost). */
function crmAdvancedStage(string $current, string $target): ?string
{
    if ($current === 'won' || $current === 'lost') {
        return null;
    }
    $from = array_search($current, CRM_PIPELINE, true);
    $to = array_search($target, CRM_PIPELINE, true);
    return ($to !== false && ($from === false || $to > $from)) ? $target : null;
}

function crmNow(): string
{
    return gmdate('Y-m-d H:i:s');
}

/** DATETIME/TIMESTAMP (stored in UTC) → ISO-8601 like JS toISOString(). */
function crmIso(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    try {
        $date = new DateTimeImmutable((string) $value, new DateTimeZone('UTC'));
    } catch (Throwable $error) {
        return null;
    }
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

function crmDate(mixed $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    return preg_match('/^\d{4}-\d{2}-\d{2}/', (string) $value, $match) ? $match[0] : null;
}

function crmMoney(int $pence): string
{
    return '£' . number_format($pence / 100, 2, '.', ',');
}

/** 'Y-m-d H:i:s' UTC → "6 Nov 2026, 10:30" in UK time, matching the Express activity text. */
function crmWhen(string $sqlUtc): string
{
    $date = (new DateTimeImmutable($sqlUtc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/London'));
    $month = $date->format('n') === '9' ? 'Sept' : $date->format('M');
    return $date->format('j') . ' ' . $month . ' ' . $date->format('Y, H:i');
}

function crmText(mixed $value): string
{
    return $value === null ? '' : (string) $value;
}

function crmNullableInt(mixed $value): ?int
{
    return ($value === null || $value === '') ? null : (int) $value;
}

function crmSignature(string $secret, string $timestamp, string $rawBody): string
{
    return hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
}

function crmVerifyWebhook(string $secret, string $timestamp, string $signature, string $rawBody): bool
{
    if (strlen($secret) < 32 || !preg_match('/^\d{9,12}$/', $timestamp) || abs(time() - (int) $timestamp) > 300) {
        return false;
    }
    $provided = preg_replace('/^sha256=/', '', $signature) ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $provided)) {
        return false;
    }
    return hash_equals(crmSignature($secret, $timestamp, $rawBody), $provided);
}

/** Maps a WordPress/Elementor submission's loosely named fields onto lead columns. */
function crmMapWordPressFields(array $fields): array
{
    $flat = [];
    foreach ($fields as $key => $value) {
        if (is_array($value)) {
            $text = implode(', ', array_map(fn ($item) => is_scalar($item) ? (string) $item : (string) json_encode($item), $value));
        } elseif (is_bool($value)) {
            $text = $value ? 'true' : 'false';
        } elseif ($value === null) {
            $text = '';
        } elseif (is_scalar($value)) {
            $text = (string) $value;
        } else {
            $text = (string) json_encode($value);
        }
        $normalised = trim((string) preg_replace('/[^a-z0-9]+/', '_', strtolower((string) $key)), '_');
        $flat[$normalised] = trim($text);
    }
    $pick = function (string ...$keys) use ($flat): string {
        foreach ($keys as $key) {
            if (($flat[$key] ?? '') !== '') {
                return $flat[$key];
            }
        }
        return '';
    };
    $first = $pick('first_name', 'firstname');
    $last = $pick('last_name', 'lastname', 'surname');
    return [
        'name' => $pick('name', 'full_name', 'your_name', 'contact_name') ?: trim(implode(' ', array_filter([$first, $last], fn ($part) => $part !== ''))),
        'email' => $pick('email', 'email_address', 'your_email'),
        'phone' => $pick('phone', 'telephone', 'tel', 'mobile', 'phone_number'),
        'postcode' => $pick('postcode', 'post_code', 'zip'),
        'address' => $pick('address', 'property_address', 'site_address'),
        'projectType' => $pick('project', 'project_type', 'service', 'services'),
        'propertyType' => $pick('property', 'property_type'),
        'budget' => $pick('budget', 'budget_range'),
        'desiredStart' => $pick('start', 'desired_start', 'start_date', 'timescale'),
        'description' => $pick('message', 'description', 'details', 'project_details', 'your_message'),
        'preferredContact' => $pick('contact_pref', 'preferred_contact', 'contact_preference', 'contact_method'),
        'plans' => $pick('plans', 'drawings', 'has_plans'),
    ];
}

/* ---------------------------------------------------------------------------
 * Validation (mirrors the zod schemas in server/crm.ts)
 * ------------------------------------------------------------------------ */

/**
 * Validates $input against $spec. Returns only the keys present (plus defaults when not partial).
 * Rule keys: type (text|email|enum|pence|id|int|datetime|date|bool), max, min, required, message,
 * values, default, nullable, positive.
 */
function crmValidate(array $input, array $spec, bool $partial = false): array
{
    $out = [];
    foreach ($spec as $key => $rule) {
        $present = array_key_exists($key, $input) && !($input[$key] === null && empty($rule['nullable']));
        if (!$present) {
            if (!$partial && array_key_exists('default', $rule)) {
                $out[$key] = $rule['default'];
            } elseif (!$partial && !empty($rule['required'])) {
                fail(400, $rule['message'] ?? CRM_GENERIC_INVALID);
            }
            continue;
        }
        $value = $input[$key];
        $message = $rule['message'] ?? CRM_GENERIC_INVALID;
        if ($value === null) {
            $out[$key] = null;
            continue;
        }
        switch ($rule['type']) {
            case 'text':
                if (!is_string($value)) {
                    fail(400, $message);
                }
                $value = trim($value);
                $length = mb_strlen($value);
                if ($length < ($rule['min'] ?? 0)) {
                    fail(400, $message);
                }
                if ($length > $rule['max']) {
                    fail(400, CRM_GENERIC_INVALID);
                }
                $out[$key] = $value;
                break;
            case 'email':
                if (!is_string($value)) {
                    fail(400, 'Enter a valid email address.');
                }
                $value = strtolower(trim($value));
                if ($value !== '' && (filter_var($value, FILTER_VALIDATE_EMAIL) === false || strlen($value) > 190)) {
                    fail(400, 'Enter a valid email address.');
                }
                $out[$key] = $value;
                break;
            case 'enum':
                if (!is_string($value) || !in_array($value, $rule['values'], true)) {
                    fail(400, $message);
                }
                $out[$key] = $value;
                break;
            case 'pence':
                if (!is_int($value) || $value < 0 || $value > CRM_MAX_PENCE) {
                    fail(400, $message);
                }
                $out[$key] = $value;
                break;
            case 'id':
                if (!is_int($value) || $value < (empty($rule['positive']) ? 0 : 1)) {
                    fail(400, $message);
                }
                $out[$key] = $value;
                break;
            case 'int':
                if (!is_int($value) || $value < $rule['min'] || $value > $rule['max']) {
                    fail(400, $message);
                }
                $out[$key] = $value;
                break;
            case 'datetime':
                if (!is_string($value) || trim($value) === '') {
                    fail(400, 'Enter a valid date and time.');
                }
                try {
                    $date = new DateTimeImmutable(trim($value), new DateTimeZone('UTC'));
                } catch (Throwable $error) {
                    fail(400, 'Enter a valid date and time.');
                }
                $out[$key] = $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
                break;
            case 'date':
                if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($value))) {
                    fail(400, 'Enter a valid date.');
                }
                $out[$key] = trim($value);
                break;
            case 'bool':
                if (!is_bool($value)) {
                    fail(400, $message);
                }
                $out[$key] = $value;
                break;
            default:
                throw new LogicException('Unknown validation rule.');
        }
    }
    return $out;
}

function crmOptionalText(int $max): array
{
    return ['type' => 'text', 'max' => $max];
}

function crmLeadSpec(): array
{
    return [
        'name' => ['type' => 'text', 'min' => 1, 'max' => 120, 'required' => true, 'message' => 'Enter the customer name.'],
        'email' => ['type' => 'email'],
        'phone' => crmOptionalText(40),
        'postcode' => crmOptionalText(20),
        'address' => crmOptionalText(255),
        'projectType' => crmOptionalText(120),
        'propertyType' => crmOptionalText(120),
        'budget' => crmOptionalText(100),
        'desiredStart' => crmOptionalText(100),
        'description' => crmOptionalText(8000),
        'preferredContact' => crmOptionalText(40),
        'valuePence' => ['type' => 'pence', 'nullable' => true],
        'assignedUserId' => ['type' => 'id', 'nullable' => true],
        'stage' => ['type' => 'enum', 'values' => CRM_STAGES],
        'lostReason' => crmOptionalText(255),
    ];
}

/* ---------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------ */

function crmAssertColumns(string $table, array $row): void
{
    if (!isset(CRM_COLUMNS[$table])) {
        throw new LogicException('Unknown CRM table.');
    }
    foreach (array_keys($row) as $column) {
        if (!in_array($column, CRM_COLUMNS[$table], true)) {
            throw new LogicException("Unknown column $table.$column");
        }
    }
}

function crmInsert(string $table, array $row): int
{
    crmAssertColumns($table, $row);
    $columns = array_keys($row);
    $sql = sprintf(
        'INSERT INTO `%s` (%s) VALUES (%s)',
        $table,
        implode(', ', array_map(fn ($column) => "`$column`", $columns)),
        implode(', ', array_fill(0, count($columns), '?'))
    );
    $pdo = database();
    $pdo->prepare($sql)->execute(array_values($row));
    return (int) $pdo->lastInsertId();
}

function crmUpdate(string $table, int $id, array $patch): void
{
    if (!$patch) {
        return;
    }
    crmAssertColumns($table, $patch);
    $sets = implode(', ', array_map(fn ($column) => "`$column` = ?", array_keys($patch)));
    database()->prepare("UPDATE `$table` SET $sets WHERE id = ?")->execute([...array_values($patch), $id]);
}

function crmGet(string $table, int $id): ?array
{
    crmAssertColumns($table, []);
    $statement = database()->prepare("SELECT * FROM `$table` WHERE id = ? LIMIT 1");
    $statement->execute([$id]);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function crmFindBy(string $table, string $column, mixed $value): ?array
{
    crmAssertColumns($table, [$column => $value]);
    $statement = database()->prepare("SELECT * FROM `$table` WHERE `$column` = ? LIMIT 1");
    $statement->execute([$value]);
    $row = $statement->fetch();
    return $row === false ? null : $row;
}

function crmList(string $table, array $where = [], int $limit = 2000): array
{
    crmAssertColumns($table, $where);
    $clause = $where ? ' WHERE ' . implode(' AND ', array_map(fn ($column) => "`$column` = ?", array_keys($where))) : '';
    $limit = max(1, min(5000, $limit));
    $statement = database()->prepare("SELECT * FROM `$table`$clause ORDER BY id DESC LIMIT $limit");
    $statement->execute(array_values($where));
    return $statement->fetchAll();
}

function crmStaff(): array
{
    static $staff = null;
    if ($staff === null) {
        $rows = database()->query("SELECT id, display_name AS name, role FROM users WHERE is_active = TRUE AND role IN ('owner','admin','staff') ORDER BY display_name")->fetchAll();
        $staff = array_map(fn (array $row) => ['id' => (int) $row['id'], 'name' => (string) $row['name'], 'role' => (string) $row['role']], $rows);
    }
    return $staff;
}

/** Copies website enquiries that have no lead yet. Idempotent (unique source-id columns + INSERT IGNORE). */
function crmSyncWebsiteEnquiries(): void
{
    $pdo = database();
    $pdo->exec("INSERT IGNORE INTO crm_leads (public_reference, source, source_detail, contact_enquiry_id, name, email, phone, description, preferred_contact, created_at)
      SELECT ce.public_reference, 'website_contact', ce.source_page, ce.id, ce.name, ce.email, ce.telephone, ce.message, ce.preferred_contact_method, ce.created_at
      FROM contact_enquiries ce LEFT JOIN crm_leads l ON l.contact_enquiry_id = ce.id WHERE l.id IS NULL");
    $pdo->exec("INSERT IGNORE INTO crm_leads (public_reference, source, source_detail, quote_request_id, name, email, phone, postcode, project_type, property_type, budget, desired_start, description, preferred_contact, created_at)
      SELECT q.public_reference, 'website_quote', q.project_stage, q.id, q.contact_name, q.email, q.telephone, q.postcode, q.project_type, q.property_type, q.budget_range, q.desired_start, q.description, q.preferred_contact_method, q.created_at
      FROM quote_requests q LEFT JOIN crm_leads l ON l.quote_request_id = q.id WHERE l.id IS NULL");
}

/* ---------------------------------------------------------------------------
 * Row → API mapping
 * ------------------------------------------------------------------------ */

function crmLookups(): array
{
    $staff = [];
    foreach (crmStaff() as $member) {
        $staff[$member['id']] = $member['name'];
    }
    $leads = [];
    foreach (crmList('crm_leads') as $lead) {
        $leads[(int) $lead['id']] = $lead;
    }
    return ['staff' => $staff, 'leads' => $leads];
}

function crmStaffName(array $lookups, ?int $id): string
{
    return $id === null ? '' : ($lookups['staff'][$id] ?? '');
}

function crmLeadOut(array $row, array $lookups): array
{
    $assigned = crmNullableInt($row['assigned_user_id'] ?? null);
    return [
        'id' => (int) $row['id'],
        'reference' => crmText($row['public_reference']),
        'source' => crmText($row['source']),
        'sourceDetail' => crmText($row['source_detail']),
        'name' => crmText($row['name']),
        'email' => crmText($row['email']),
        'phone' => crmText($row['phone']),
        'postcode' => crmText($row['postcode']),
        'address' => crmText($row['address']),
        'projectType' => crmText($row['project_type']),
        'propertyType' => crmText($row['property_type']),
        'budget' => crmText($row['budget']),
        'desiredStart' => crmText($row['desired_start']),
        'description' => crmText($row['description']),
        'preferredContact' => crmText($row['preferred_contact']),
        'stage' => crmText($row['stage']),
        'lostReason' => crmText($row['lost_reason']),
        'valuePence' => crmNullableInt($row['estimated_value_pence']),
        'assignedUserId' => $assigned,
        'assignedName' => crmStaffName($lookups, $assigned),
        'stageChangedAt' => crmIso($row['stage_changed_at']),
        'createdAt' => crmIso($row['created_at']),
        'updatedAt' => crmIso($row['updated_at']),
        'possibleDuplicates' => [],
    ];
}

function crmLeadLink(array $row, array $lookups): array
{
    $leadId = crmNullableInt($row['lead_id'] ?? null);
    $lead = $leadId === null ? null : ($lookups['leads'][$leadId] ?? null);
    return ['leadId' => $leadId, 'leadName' => $lead ? crmText($lead['name']) : '', 'leadReference' => $lead ? crmText($lead['public_reference']) : ''];
}

function crmVisitOut(array $row, array $lookups): array
{
    $link = crmLeadLink($row, $lookups);
    $assigned = crmNullableInt($row['assigned_user_id']);
    $address = crmText($row['address']);
    if ($address === '' && $link['leadId'] !== null) {
        $address = crmText($lookups['leads'][$link['leadId']]['postcode'] ?? '');
    }
    return ['id' => (int) $row['id'], ...$link, 'scheduledAt' => crmIso($row['scheduled_at']), 'durationMinutes' => (int) ($row['duration_minutes'] ?: 60), 'address' => $address, 'status' => crmText($row['status']), 'notes' => crmText($row['notes']), 'assignedUserId' => $assigned, 'assignedName' => crmStaffName($lookups, $assigned), 'createdAt' => crmIso($row['created_at']), 'updatedAt' => crmIso($row['updated_at'])];
}

function crmTaskOut(array $row, array $lookups): array
{
    $assigned = crmNullableInt($row['assigned_user_id']);
    return ['id' => (int) $row['id'], ...crmLeadLink($row, $lookups), 'title' => crmText($row['title']), 'notes' => crmText($row['notes']), 'dueAt' => crmIso($row['due_at']), 'status' => crmText($row['status']), 'completedAt' => crmIso($row['completed_at']), 'assignedUserId' => $assigned, 'assignedName' => crmStaffName($lookups, $assigned), 'createdAt' => crmIso($row['created_at']), 'updatedAt' => crmIso($row['updated_at'])];
}

function crmQuoteOut(array $row, array $lookups): array
{
    return ['id' => (int) $row['id'], 'reference' => crmText($row['quote_reference']), ...crmLeadLink($row, $lookups), 'title' => crmText($row['title']), 'amountPence' => (int) $row['amount_pence'], 'status' => crmText($row['status']), 'validUntil' => crmDate($row['valid_until']), 'notes' => crmText($row['notes']), 'sentAt' => crmIso($row['sent_at']), 'decidedAt' => crmIso($row['decided_at']), 'createdAt' => crmIso($row['created_at']), 'updatedAt' => crmIso($row['updated_at'])];
}

function crmInvoiceOut(array $row, array $lookups): array
{
    return ['id' => (int) $row['id'], 'reference' => crmText($row['invoice_reference']), ...crmLeadLink($row, $lookups), 'quoteId' => crmNullableInt($row['quote_id']), 'customerName' => crmText($row['customer_name']), 'amountPence' => (int) $row['amount_pence'], 'status' => crmText($row['status']), 'dueAt' => crmDate($row['due_at']), 'notes' => crmText($row['notes']), 'issuedAt' => crmIso($row['issued_at']), 'paidAt' => crmIso($row['paid_at']), 'createdAt' => crmIso($row['created_at']), 'updatedAt' => crmIso($row['updated_at'])];
}

function crmActivityOut(array $row, array $lookups): array
{
    $userId = crmNullableInt($row['user_id']);
    return ['id' => (int) $row['id'], ...crmLeadLink($row, $lookups), 'kind' => crmText($row['kind']), 'body' => crmText($row['body']), 'userName' => crmStaffName($lookups, $userId), 'createdAt' => crmIso($row['created_at'])];
}

/* ---------------------------------------------------------------------------
 * Rules
 * ------------------------------------------------------------------------ */

function crmBlankToNull(?string $value): ?string
{
    return ($value === null || $value === '') ? null : $value;
}

function crmRequireLead(int $id): array
{
    $lead = crmGet('crm_leads', $id);
    if ($lead === null) {
        fail(404, 'Lead not found.');
    }
    return $lead;
}

function crmValidStaff(?int $userId): void
{
    if ($userId === null) {
        return;
    }
    foreach (crmStaff() as $member) {
        if ($member['id'] === $userId) {
            return;
        }
    }
    fail(400, 'Choose a member of staff from the list.');
}

function crmLog(?int $leadId, string $kind, string $body, ?int $userId): void
{
    if (!$leadId) {
        return;
    }
    crmInsert('crm_lead_activities', ['lead_id' => $leadId, 'user_id' => $userId ?: null, 'kind' => $kind, 'body' => $body]);
}

function crmMoveStage(array $lead, string $target, ?int $userId, string $reason, bool $force = false): void
{
    $current = (string) $lead['stage'];
    $next = $force ? ($current === $target ? null : $target) : crmAdvancedStage($current, $target);
    if ($next === null) {
        return;
    }
    crmUpdate('crm_leads', (int) $lead['id'], ['stage' => $next, 'stage_changed_at' => crmNow()]);
    $from = CRM_STAGE_LABELS[$current] ?? $current;
    crmLog((int) $lead['id'], 'stage', "Stage changed from $from to " . CRM_STAGE_LABELS[$next] . ($reason !== '' ? " ($reason)" : '') . '.', $userId);
}

function crmLeadColumns(array $input): array
{
    $row = [];
    $map = ['name' => 'name', 'email' => 'email', 'phone' => 'phone', 'postcode' => 'postcode', 'address' => 'address', 'projectType' => 'project_type', 'propertyType' => 'property_type', 'budget' => 'budget', 'desiredStart' => 'desired_start', 'description' => 'description', 'preferredContact' => 'preferred_contact', 'lostReason' => 'lost_reason'];
    foreach ($map as $key => $column) {
        if (array_key_exists($key, $input)) {
            $row[$column] = $key === 'name' ? $input[$key] : crmBlankToNull($input[$key]);
        }
    }
    if (array_key_exists('valuePence', $input)) {
        $row['estimated_value_pence'] = $input['valuePence'];
    }
    if (array_key_exists('assignedUserId', $input)) {
        $row['assigned_user_id'] = $input['assignedUserId'];
    }
    return $row;
}

function crmListLeads(string $stage, string $query): array
{
    crmSyncWebsiteEnquiries();
    $lookups = crmLookups();
    $needle = mb_strtolower(trim($query));
    $leads = [];
    foreach ($lookups['leads'] as $row) {
        if ($stage !== '' && $row['stage'] !== $stage) {
            continue;
        }
        $lead = crmLeadOut($row, $lookups);
        if ($needle !== '' && !str_contains(mb_strtolower(implode(' ', [$lead['name'], $lead['email'], $lead['phone'], $lead['postcode'], $lead['reference'], $lead['projectType'], $lead['address']])), $needle)) {
            continue;
        }
        $leads[] = $lead;
    }
    usort($leads, fn ($a, $b) => strcmp((string) $b['createdAt'], (string) $a['createdAt']) ?: $b['id'] <=> $a['id']);
    // Duplicates are looked for across every lead, not just the filtered view.
    return crmMarkDuplicates($leads);
}

function crmLeadDetail(int $id): array
{
    crmSyncWebsiteEnquiries();
    $lookups = crmLookups();
    $row = $lookups['leads'][$id] ?? null;
    if ($row === null) {
        fail(404, 'Lead not found.');
    }
    $raw = is_string($row['raw_payload'] ?? null) ? json_decode($row['raw_payload'], true) : null;
    $lead = crmLeadOut($row, $lookups);
    // Duplicates are looked for across every lead, not just this one.
    $all = crmMarkDuplicates(array_map(fn (array $other) => crmLeadOut($other, $lookups), array_values($lookups['leads'])));
    foreach ($all as $candidate) {
        if ($candidate['id'] === $id) {
            $lead['possibleDuplicates'] = $candidate['possibleDuplicates'];
            break;
        }
    }
    $lead['submission'] = is_array($raw) && isset($raw['fields']) && is_array($raw['fields']) ? (object) $raw['fields'] : null;
    return [
        'lead' => $lead,
        'activities' => array_map(fn ($item) => crmActivityOut($item, $lookups), crmList('crm_lead_activities', ['lead_id' => $id], 500)),
        'visits' => array_map(fn ($item) => crmVisitOut($item, $lookups), crmList('crm_site_visits', ['lead_id' => $id], 200)),
        'tasks' => array_map(fn ($item) => crmTaskOut($item, $lookups), crmList('crm_tasks', ['lead_id' => $id], 200)),
        'quotes' => array_map(fn ($item) => crmQuoteOut($item, $lookups), crmList('crm_quotes', ['lead_id' => $id], 200)),
        'invoices' => array_map(fn ($item) => crmInvoiceOut($item, $lookups), crmList('crm_invoices', ['lead_id' => $id], 200)),
        'files' => crmLeadFiles(crmNullableInt($row['quote_request_id'] ?? null)),
    ];
}

/** Customer drawings uploaded with the website quote request behind this lead. */
function crmLeadFiles(?int $quoteRequestId): array
{
    if ($quoteRequestId === null) {
        return [];
    }
    $statement = database()->prepare('SELECT id, original_filename, mime_type, size_bytes, created_at FROM quote_request_files WHERE quote_request_id = ? ORDER BY id');
    $statement->execute([$quoteRequestId]);
    return array_map(fn (array $file) => [
        'id' => (int) $file['id'],
        'originalFilename' => crmText($file['original_filename']),
        'mimeType' => crmText($file['mime_type']),
        'sizeBytes' => (int) $file['size_bytes'],
        'createdAt' => crmIso($file['created_at'] ?? null),
    ], $statement->fetchAll());
}

/** Streams one attachment. The file id must belong to this lead's own quote request. */
function crmDownloadLeadFile(int $leadId, int $fileId): never
{
    $lead = crmGet('crm_leads', $leadId);
    if ($lead === null) {
        fail(404, 'Lead not found.');
    }
    $quoteRequestId = crmNullableInt($lead['quote_request_id'] ?? null);
    if ($quoteRequestId === null) {
        fail(404, 'File not found.');
    }
    $statement = database()->prepare('SELECT stored_filename, original_filename, mime_type FROM quote_request_files WHERE id = ? AND quote_request_id = ? LIMIT 1');
    $statement->execute([$fileId, $quoteRequestId]);
    $file = $statement->fetch();
    if ($file === false) {
        fail(404, 'File not found.');
    }
    // basename() keeps a crafted stored_filename from escaping the private upload directory.
    $stored = basename((string) $file['stored_filename']);
    $absolute = uploadDirectory(false) . DIRECTORY_SEPARATOR . $stored;
    if ($stored === '' || !is_file($absolute)) {
        fail(404, 'The file is no longer available.');
    }
    $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    $mime = in_array((string) $file['mime_type'], $allowed, true) ? (string) $file['mime_type'] : 'application/octet-stream';
    $original = (string) $file['original_filename'];
    $fallback = preg_replace('/[^A-Za-z0-9._ -]+/', '_', $original) ?: 'attachment';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($absolute));
    header('Content-Disposition: attachment; filename="' . $fallback . '"; filename*=UTF-8\'\'' . rawurlencode($original));
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    readfile($absolute);
    exit;
}

function crmCreateLead(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmLeadSpec());
    if (($input['email'] ?? '') === '' && ($input['phone'] ?? '') === '') {
        fail(400, 'Add a phone number or email address.');
    }
    crmValidStaff($input['assignedUserId'] ?? null);
    $id = crmInsert('crm_leads', crmLeadColumns($input) + [
        'public_reference' => 'LEAD-' . strtoupper(bin2hex(random_bytes(5))),
        'source' => 'manual',
        'stage' => $input['stage'] ?? 'new',
        'stage_changed_at' => crmNow(),
    ]);
    crmLog($id, 'system', 'Lead added by staff.', $userId);
    return crmLeadDetail($id)['lead'];
}

function crmUpdateLead(int $id, array $body, ?int $userId): array
{
    $lead = crmRequireLead($id);
    $input = crmValidate($body, crmLeadSpec(), true);
    crmValidStaff($input['assignedUserId'] ?? null);
    crmUpdate('crm_leads', $id, crmLeadColumns($input));
    if (array_key_exists('assignedUserId', $input) && crmNullableInt($lead['assigned_user_id']) !== $input['assignedUserId']) {
        $name = '';
        foreach (crmStaff() as $member) {
            if ($member['id'] === $input['assignedUserId']) {
                $name = $member['name'];
            }
        }
        crmLog($id, 'system', $name !== '' ? "Assigned to $name." : 'Unassigned.', $userId);
    }
    if (isset($input['stage']) && $input['stage'] !== $lead['stage']) {
        crmMoveStage($lead, $input['stage'], $userId, $input['stage'] === 'lost' && ($input['lostReason'] ?? '') !== '' ? $input['lostReason'] : '', true);
    }
    return crmLeadDetail($id)['lead'];
}

function crmAddActivity(int $id, array $body, ?int $userId): array
{
    crmRequireLead($id);
    $input = crmValidate($body, [
        'kind' => ['type' => 'enum', 'values' => ['note', 'call', 'email'], 'default' => 'note'],
        'body' => ['type' => 'text', 'min' => 1, 'max' => 5000, 'required' => true, 'message' => 'Write a note first.'],
    ]);
    crmLog($id, $input['kind'], $input['body'], $userId);
    if ($input['kind'] !== 'note') {
        crmMoveStage(crmRequireLead($id), 'contacted', $userId, $input['kind'] . ' logged');
    }
    return crmLeadDetail($id)['activities'];
}

function crmVisitSpec(bool $create): array
{
    $spec = [
        'scheduledAt' => ['type' => 'datetime', 'required' => true],
        'durationMinutes' => ['type' => 'int', 'min' => 15, 'max' => 600] + ($create ? ['default' => 60] : []),
        'address' => crmOptionalText(255),
        'notes' => crmOptionalText(5000),
        'status' => ['type' => 'enum', 'values' => ['scheduled', 'completed', 'cancelled']] + ($create ? ['default' => 'scheduled'] : []),
        'assignedUserId' => ['type' => 'id', 'nullable' => true],
    ];
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'required' => true, 'message' => 'Choose a lead.']] + $spec : $spec;
}

function crmCreateVisit(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmVisitSpec(true));
    $lead = crmRequireLead($input['leadId']);
    crmValidStaff($input['assignedUserId'] ?? null);
    $address = crmBlankToNull($input['address'] ?? null) ?? crmBlankToNull(crmText($lead['address']));
    $id = crmInsert('crm_site_visits', ['lead_id' => $input['leadId'], 'scheduled_at' => $input['scheduledAt'], 'duration_minutes' => $input['durationMinutes'], 'address' => $address, 'notes' => crmBlankToNull($input['notes'] ?? null), 'status' => $input['status'], 'assigned_user_id' => $input['assignedUserId'] ?? null]);
    crmLog($input['leadId'], 'visit', 'Site visit booked for ' . crmWhen($input['scheduledAt']) . '.', $userId);
    crmMoveStage($lead, 'site_visit', $userId, 'site visit booked');
    return crmVisitOut(crmGet('crm_site_visits', $id), crmLookups());
}

function crmUpdateVisit(int $id, array $body, ?int $userId): array
{
    $visit = crmGet('crm_site_visits', $id);
    if ($visit === null) {
        fail(404, 'Site visit not found.');
    }
    $input = crmValidate($body, crmVisitSpec(false), true);
    crmValidStaff($input['assignedUserId'] ?? null);
    $patch = [];
    foreach (['scheduledAt' => 'scheduled_at', 'durationMinutes' => 'duration_minutes', 'status' => 'status', 'assignedUserId' => 'assigned_user_id'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    foreach (['address' => 'address', 'notes' => 'notes'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = crmBlankToNull($input[$key]);
        }
    }
    crmUpdate('crm_site_visits', $id, $patch);
    $leadId = crmNullableInt($visit['lead_id']);
    if (isset($input['status']) && $input['status'] !== $visit['status']) {
        $text = ['completed' => 'Site visit completed.', 'cancelled' => 'Site visit cancelled.'][$input['status']] ?? 'Site visit re-scheduled.';
        crmLog($leadId, 'visit', $text, $userId);
    } elseif (isset($input['scheduledAt']) && $input['scheduledAt'] !== substr((string) $visit['scheduled_at'], 0, 19)) {
        crmLog($leadId, 'visit', 'Site visit moved to ' . crmWhen($input['scheduledAt']) . '.', $userId);
    }
    return crmVisitOut(crmGet('crm_site_visits', $id), crmLookups());
}

function crmTaskSpec(bool $create): array
{
    $spec = [
        'title' => ['type' => 'text', 'min' => 1, 'max' => 190, 'required' => true, 'message' => 'Give the task a title.'],
        'notes' => crmOptionalText(5000),
        'dueAt' => ['type' => 'datetime', 'nullable' => true],
        'status' => ['type' => 'enum', 'values' => ['open', 'completed', 'cancelled']] + ($create ? ['default' => 'open'] : []),
        'assignedUserId' => ['type' => 'id', 'nullable' => true],
    ];
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'nullable' => true]] + $spec : $spec;
}

function crmCreateTask(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmTaskSpec(true));
    $leadId = $input['leadId'] ?? null;
    if ($leadId) {
        crmRequireLead($leadId);
    }
    crmValidStaff($input['assignedUserId'] ?? null);
    $id = crmInsert('crm_tasks', ['lead_id' => $leadId, 'title' => $input['title'], 'notes' => crmBlankToNull($input['notes'] ?? null), 'due_at' => $input['dueAt'] ?? null, 'status' => $input['status'], 'completed_at' => $input['status'] === 'completed' ? crmNow() : null, 'assigned_user_id' => $input['assignedUserId'] ?? null]);
    crmLog($leadId, 'task', 'Task added: ' . $input['title'] . '.', $userId);
    return crmTaskOut(crmGet('crm_tasks', $id), crmLookups());
}

function crmUpdateTask(int $id, array $body, ?int $userId): array
{
    $task = crmGet('crm_tasks', $id);
    if ($task === null) {
        fail(404, 'Task not found.');
    }
    $input = crmValidate($body, crmTaskSpec(false), true);
    crmValidStaff($input['assignedUserId'] ?? null);
    $patch = [];
    foreach (['title' => 'title', 'dueAt' => 'due_at', 'assignedUserId' => 'assigned_user_id'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    if (array_key_exists('notes', $input)) {
        $patch['notes'] = crmBlankToNull($input['notes']);
    }
    if (isset($input['status'])) {
        $patch['status'] = $input['status'];
        $patch['completed_at'] = $input['status'] === 'completed' ? ($task['completed_at'] ?: crmNow()) : null;
    }
    crmUpdate('crm_tasks', $id, $patch);
    if (isset($input['status']) && $input['status'] !== $task['status']) {
        $verb = ['completed' => 'completed', 'cancelled' => 'cancelled'][$input['status']] ?? 're-opened';
        crmLog(crmNullableInt($task['lead_id']), 'task', "Task $verb: " . ($input['title'] ?? $task['title']) . '.', $userId);
    }
    return crmTaskOut(crmGet('crm_tasks', $id), crmLookups());
}

function crmQuoteSpec(bool $create): array
{
    $spec = [
        'title' => ['type' => 'text', 'min' => 1, 'max' => 190, 'required' => true, 'message' => 'Describe the quoted work.'],
        'amountPence' => ['type' => 'pence', 'required' => true],
        'status' => ['type' => 'enum', 'values' => ['draft', 'sent', 'accepted', 'declined']] + ($create ? ['default' => 'draft'] : []),
        'validUntil' => ['type' => 'date', 'nullable' => true],
        'notes' => crmOptionalText(8000),
    ];
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'required' => true, 'message' => 'Choose a lead.']] + $spec : $spec;
}

function crmQuoteStatusEffects(array $quote, string $status, ?int $userId): void
{
    $lead = crmRequireLead((int) $quote['lead_id']);
    $label = $quote['quote_reference'] . ' (' . crmMoney((int) $quote['amount_pence']) . ')';
    if ($status === 'sent') {
        crmLog((int) $lead['id'], 'quote', "Quote $label sent.", $userId);
        crmMoveStage($lead, 'quoted', $userId, 'quote sent');
    } elseif ($status === 'accepted') {
        crmLog((int) $lead['id'], 'quote', "Quote $label accepted.", $userId);
        crmMoveStage($lead, 'won', $userId, 'quote accepted', $lead['stage'] !== 'won');
    } elseif ($status === 'declined') {
        crmLog((int) $lead['id'], 'quote', "Quote $label declined.", $userId);
    }
}

function crmCreateQuote(array $body, ?int $userId): array
{
    $input = crmValidate($body, crmQuoteSpec(true));
    crmRequireLead($input['leadId']);
    $now = crmNow();
    $id = crmInsert('crm_quotes', ['quote_reference' => 'TMP-' . bin2hex(random_bytes(8)), 'lead_id' => $input['leadId'], 'title' => $input['title'], 'amount_pence' => $input['amountPence'], 'status' => $input['status'], 'valid_until' => $input['validUntil'] ?? null, 'notes' => crmBlankToNull($input['notes'] ?? null), 'sent_at' => $input['status'] !== 'draft' ? $now : null, 'decided_at' => in_array($input['status'], ['accepted', 'declined'], true) ? $now : null]);
    crmUpdate('crm_quotes', $id, ['quote_reference' => 'Q-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT)]);
    $quote = crmGet('crm_quotes', $id);
    crmLog($input['leadId'], 'quote', 'Quote ' . $quote['quote_reference'] . ' created: ' . $input['title'] . ' (' . crmMoney($input['amountPence']) . ').', $userId);
    if ($input['status'] !== 'draft') {
        crmQuoteStatusEffects($quote, $input['status'], $userId);
    }
    return crmQuoteOut(crmGet('crm_quotes', $id), crmLookups());
}

function crmUpdateQuote(int $id, array $body, ?int $userId): array
{
    $quote = crmGet('crm_quotes', $id);
    if ($quote === null) {
        fail(404, 'Quote not found.');
    }
    $input = crmValidate($body, crmQuoteSpec(false), true);
    $patch = [];
    foreach (['title' => 'title', 'amountPence' => 'amount_pence', 'validUntil' => 'valid_until'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    if (array_key_exists('notes', $input)) {
        $patch['notes'] = crmBlankToNull($input['notes']);
    }
    $changed = isset($input['status']) && $input['status'] !== $quote['status'];
    if ($changed) {
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
    $updated = crmGet('crm_quotes', $id);
    if ($changed) {
        crmQuoteStatusEffects($updated, $input['status'], $userId);
    }
    return crmQuoteOut($updated, crmLookups());
}

function crmInvoiceSpec(bool $create): array
{
    $spec = [
        'customerName' => $create ? crmOptionalText(190) : ['type' => 'text', 'min' => 1, 'max' => 190],
        'amountPence' => ['type' => 'pence', 'required' => true],
        'status' => ['type' => 'enum', 'values' => ['draft', 'issued', 'paid', 'void']] + ($create ? ['default' => 'draft'] : []),
        'dueAt' => ['type' => 'date', 'nullable' => true],
        'notes' => crmOptionalText(8000),
    ];
    return $create ? ['leadId' => ['type' => 'id', 'positive' => true, 'nullable' => true], 'quoteId' => ['type' => 'id', 'positive' => true, 'nullable' => true]] + $spec : $spec;
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
    $customer = ($input['customerName'] ?? '') !== '' ? $input['customerName'] : ($lead ? crmText($lead['name']) : '');
    if ($customer === '') {
        fail(400, 'Choose a lead or enter the customer name.');
    }
    $now = crmNow();
    $id = crmInsert('crm_invoices', ['invoice_reference' => 'TMP-' . bin2hex(random_bytes(8)), 'lead_id' => $leadId, 'quote_id' => $quoteId, 'customer_name' => $customer, 'amount_pence' => $input['amountPence'], 'status' => $input['status'], 'due_at' => $input['dueAt'] ?? null, 'notes' => crmBlankToNull($input['notes'] ?? null), 'issued_at' => in_array($input['status'], ['issued', 'paid'], true) ? $now : null, 'paid_at' => $input['status'] === 'paid' ? $now : null]);
    $reference = 'INV-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
    crmUpdate('crm_invoices', $id, ['invoice_reference' => $reference]);
    crmLog($leadId, 'invoice', "Invoice $reference " . ($input['status'] === 'draft' ? 'drafted' : $input['status']) . ' for ' . crmMoney($input['amountPence']) . '.', $userId);
    return crmInvoiceOut(crmGet('crm_invoices', $id), crmLookups());
}

function crmUpdateInvoice(int $id, array $body, ?int $userId): array
{
    $invoice = crmGet('crm_invoices', $id);
    if ($invoice === null) {
        fail(404, 'Invoice not found.');
    }
    $input = crmValidate($body, crmInvoiceSpec(false), true);
    $patch = [];
    foreach (['customerName' => 'customer_name', 'amountPence' => 'amount_pence', 'dueAt' => 'due_at'] as $key => $column) {
        if (array_key_exists($key, $input)) {
            $patch[$column] = $input[$key];
        }
    }
    if (array_key_exists('notes', $input)) {
        $patch['notes'] = crmBlankToNull($input['notes']);
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
    }
    crmUpdate('crm_invoices', $id, $patch);
    $updated = crmGet('crm_invoices', $id);
    if ($changed) {
        crmLog(crmNullableInt($updated['lead_id']), 'invoice', 'Invoice ' . $updated['invoice_reference'] . ' marked ' . $input['status'] . ' (' . crmMoney((int) $updated['amount_pence']) . ').', $userId);
    }
    return crmInvoiceOut($updated, crmLookups());
}

function crmSummary(): array
{
    crmSyncWebsiteEnquiries();
    $lookups = crmLookups();
    $leads = array_values($lookups['leads']);
    $visits = crmList('crm_site_visits');
    $tasks = crmList('crm_tasks', ['status' => 'open']);
    $quotes = crmList('crm_quotes');
    $invoices = crmList('crm_invoices');
    $activities = crmList('crm_lead_activities', [], 12);
    $now = time();
    $today = gmdate('Y-m-d');
    $stages = [];
    foreach (CRM_STAGES as $stage) {
        $stages[$stage] = count(array_filter($leads, fn ($lead) => $lead['stage'] === $stage));
    }
    $isOpen = fn ($lead) => $lead['stage'] !== 'won' && $lead['stage'] !== 'lost';
    $sum = fn (array $rows) => array_sum(array_map(fn ($row) => (int) $row['amount_pence'], $rows));
    $timeOf = fn ($value) => $value ? strtotime(((string) $value) . ' UTC') : 0;
    $closed = $stages['won'] + $stages['lost'];

    $openTasks = array_map(fn ($task) => crmTaskOut($task, $lookups), $tasks);
    usort($openTasks, fn ($a, $b) => strcmp($a['dueAt'] ?? '9999', $b['dueAt'] ?? '9999'));
    $upcoming = array_map(fn ($visit) => crmVisitOut($visit, $lookups), array_filter($visits, fn ($visit) => $visit['status'] === 'scheduled' && $timeOf($visit['scheduled_at']) >= $now - 3600));
    usort($upcoming, fn ($a, $b) => strcmp((string) $a['scheduledAt'], (string) $b['scheduledAt']));
    $newLeads = array_map(fn ($lead) => crmLeadOut($lead, $lookups), array_filter($leads, fn ($lead) => $lead['stage'] === 'new'));
    usort($newLeads, fn ($a, $b) => strcmp((string) $b['createdAt'], (string) $a['createdAt']));

    return [
        'stages' => $stages,
        'totalLeads' => count($leads),
        'openLeads' => count(array_filter($leads, $isOpen)),
        'newThisWeek' => count(array_filter($leads, fn ($lead) => $timeOf($lead['created_at']) >= $now - 7 * 86400)),
        'conversionRate' => $closed ? (int) round($stages['won'] / $closed * 100) : null,
        'pipelineValuePence' => array_sum(array_map(fn ($lead) => (int) ($lead['estimated_value_pence'] ?? 0), array_filter($leads, $isOpen))),
        'quotesSentPence' => $sum(array_filter($quotes, fn ($quote) => $quote['status'] === 'sent')),
        'quotesAcceptedPence' => $sum(array_filter($quotes, fn ($quote) => $quote['status'] === 'accepted')),
        'invoicesOutstandingPence' => $sum(array_filter($invoices, fn ($invoice) => $invoice['status'] === 'issued')),
        'invoicesPaidPence' => $sum(array_filter($invoices, fn ($invoice) => $invoice['status'] === 'paid')),
        'overdueInvoices' => count(array_filter($invoices, fn ($invoice) => $invoice['status'] === 'issued' && crmDate($invoice['due_at']) !== null && crmDate($invoice['due_at']) < $today)),
        'upcomingVisits' => array_slice($upcoming, 0, 6),
        'overdueTasks' => count(array_filter($openTasks, fn ($task) => $task['dueAt'] !== null && strtotime($task['dueAt']) < $now)),
        'openTasks' => array_slice($openTasks, 0, 8),
        'openTaskCount' => count($openTasks),
        'newLeads' => array_slice($newLeads, 0, 6),
        'recentActivity' => array_map(fn ($item) => crmActivityOut($item, $lookups), $activities),
    ];
}

function crmIngestWordPress(array $body): array
{
    $input = crmValidate($body, [
        'externalId' => ['type' => 'text', 'min' => 1, 'max' => 190, 'required' => true],
        'form' => crmOptionalText(190),
        'page' => crmOptionalText(190),
        'site' => crmOptionalText(190),
        'submittedAt' => ['type' => 'text', 'max' => 64],
    ]);
    if (!isset($body['fields']) || !is_array($body['fields'])) {
        fail(400, CRM_GENERIC_INVALID);
    }
    $existing = crmFindBy('crm_leads', 'external_id', $input['externalId']);
    if ($existing !== null) {
        return ['created' => false, 'reference' => (string) $existing['public_reference']];
    }
    $fields = crmMapWordPressFields($body['fields']);
    if ($fields['name'] === '' && $fields['email'] === '' && $fields['phone'] === '') {
        fail(400, 'The submission has no name, email or phone number.');
    }
    $submitted = crmNow();
    if (($input['submittedAt'] ?? '') !== '') {
        try {
            $submitted = (new DateTimeImmutable($input['submittedAt'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (Throwable $error) {
            $submitted = crmNow();
        }
    }
    $clip = fn (string $value, int $max) => $value === '' ? null : mb_substr($value, 0, $max);
    $description = implode("\n\n", array_filter([$fields['description'], $fields['plans'] !== '' ? 'Plans/drawings: ' . $fields['plans'] : ''], fn ($part) => $part !== ''));
    $reference = 'WP-' . strtoupper(bin2hex(random_bytes(5)));
    $detail = implode(' · ', array_filter([$input['form'] ?? '', $input['page'] ?? ''], fn ($part) => $part !== ''));
    try {
        $id = crmInsert('crm_leads', [
            'public_reference' => $reference,
            'source' => 'wordpress',
            'source_detail' => $clip($detail, 190),
            'external_id' => $input['externalId'],
            'name' => $clip($fields['name'], 120) ?? $clip($fields['email'], 120) ?? $clip($fields['phone'], 120),
            'email' => $clip(strtolower($fields['email']), 190),
            'phone' => $clip($fields['phone'], 40),
            'postcode' => $clip(strtoupper($fields['postcode']), 20),
            'address' => $clip($fields['address'], 255),
            'project_type' => $clip($fields['projectType'], 120),
            'property_type' => $clip($fields['propertyType'], 120),
            'budget' => $clip($fields['budget'], 100),
            'desired_start' => $clip($fields['desiredStart'], 100),
            'description' => $clip($description, 8000),
            'preferred_contact' => $clip($fields['preferredContact'], 40),
            'raw_payload' => json_encode(['form' => $input['form'] ?? null, 'page' => $input['page'] ?? null, 'site' => $input['site'] ?? null, 'fields' => (object) $body['fields']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            'created_at' => $submitted,
        ]);
    } catch (PDOException $error) {
        if ((string) $error->getCode() === '23000' && ($error->errorInfo[1] ?? null) === 1062) {
            $duplicate = crmFindBy('crm_leads', 'external_id', $input['externalId']);
            if ($duplicate !== null) {
                return ['created' => false, 'reference' => (string) $duplicate['public_reference']];
            }
        }
        throw $error;
    }
    $form = ($input['form'] ?? '') !== '' ? ' “' . $input['form'] . '”' : '';
    $page = ($input['page'] ?? '') !== '' ? ' on ' . $input['page'] : '';
    crmLog($id, 'system', "Lead received from the website form$form$page.", null);
    return ['created' => true, 'reference' => $reference];
}

/* ---------------------------------------------------------------------------
 * Duplicates
 * ------------------------------------------------------------------------ */

/** Digits only, with the UK country code collapsed: 07111 111111 and +44 7111 111111 are the same person. */
function crmNormalisePhone(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    return strlen($digits) === 12 && str_starts_with($digits, '44') ? '0' . substr($digits, 2) : $digits;
}

/** Adds `possibleDuplicates` (other leads sharing the email address or phone number). */
function crmMarkDuplicates(array $leads): array
{
    foreach ($leads as $index => $lead) {
        $matches = [];
        $email = strtolower(trim((string) $lead['email']));
        $phone = crmNormalisePhone((string) $lead['phone']);
        foreach ($leads as $other) {
            if ($other['id'] === $lead['id']) {
                continue;
            }
            $sameEmail = $email !== '' && strtolower(trim((string) $other['email'])) === $email;
            $samePhone = strlen($phone) >= 7 && crmNormalisePhone((string) $other['phone']) === $phone;
            if ($sameEmail || $samePhone) {
                $matches[(int) $other['id']] = ['id' => (int) $other['id'], 'name' => (string) $other['name'], 'reference' => (string) $other['reference']];
            }
        }
        $leads[$index]['possibleDuplicates'] = array_values($matches);
    }
    return $leads;
}

/* ---------------------------------------------------------------------------
 * CSV export (RFC 4180) and GDPR erasure
 * ------------------------------------------------------------------------ */

function crmCsvCell(mixed $value): string
{
    $cell = $value === null ? '' : (string) $value;
    return preg_match('/[",\r\n]/', $cell) ? '"' . str_replace('"', '""', $cell) . '"' : $cell;
}

/** UTF-8 BOM for Excel, CRLF rows: the same document the Express API produces. */
function crmCsv(array $headers, array $rows): string
{
    $lines = [implode(',', array_map('crmCsvCell', $headers))];
    foreach ($rows as $row) {
        $lines[] = implode(',', array_map('crmCsvCell', $row));
    }
    return "\xEF\xBB\xBF" . implode("\r\n", $lines) . "\r\n";
}

function crmCsvMoney(mixed $pence): string
{
    return number_format(((int) $pence) / 100, 2, '.', '');
}

function crmExportLeads(): string
{
    $leads = crmListLeads(crmQueryText('stage'), crmQueryText('q'));
    return crmCsv(
        ['Reference', 'Name', 'Email', 'Phone', 'Postcode', 'Address', 'Project', 'Property', 'Budget', 'Desired start', 'Stage', 'Estimated value (GBP)', 'Assigned to', 'Source', 'Source detail', 'Created', 'Last updated'],
        array_map(fn (array $lead) => [
            $lead['reference'], $lead['name'], $lead['email'], $lead['phone'], $lead['postcode'], $lead['address'],
            $lead['projectType'], $lead['propertyType'], $lead['budget'], $lead['desiredStart'],
            CRM_STAGE_LABELS[$lead['stage']] ?? $lead['stage'], crmCsvMoney($lead['valuePence']), $lead['assignedName'],
            $lead['source'], $lead['sourceDetail'], $lead['createdAt'], $lead['updatedAt'],
        ], $leads),
    );
}

function crmExportInvoices(): string
{
    $lookups = crmLookups();
    $status = crmQueryText('status');
    $records = array_map(fn ($row) => crmInvoiceOut($row, $lookups), crmList('crm_invoices', $status !== '' ? ['status' => $status] : []));
    return crmCsv(
        ['Invoice', 'Customer', 'Lead', 'Lead reference', 'Amount (GBP)', 'Status', 'Due', 'Issued', 'Paid', 'Notes'],
        array_map(fn (array $invoice) => [
            $invoice['reference'], $invoice['customerName'] !== '' ? $invoice['customerName'] : $invoice['leadName'],
            $invoice['leadName'], $invoice['leadReference'], crmCsvMoney($invoice['amountPence']), $invoice['status'],
            $invoice['dueAt'], $invoice['issuedAt'], $invoice['paidAt'], $invoice['notes'],
        ], $records),
    );
}

function crmDownloadCsv(string $filename, string $body): never
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo $body;
    exit;
}

/**
 * GDPR erasure. Personal data is removed either way; quotes and invoices are kept when they exist
 * because accounting records have to be retained.
 */
function crmEraseLead(int $id, ?int $userId): array
{
    if (crmGet('crm_leads', $id) === null) {
        fail(404, 'Lead not found.');
    }
    $hasCommercialRecords = crmList('crm_quotes', ['lead_id' => $id], 1) !== [] || crmList('crm_invoices', ['lead_id' => $id], 1) !== [];
    $pdo = database();
    if (!$hasCommercialRecords) {
        $pdo->prepare('DELETE FROM crm_leads WHERE id = ?')->execute([$id]);
        return ['id' => $id, 'erased' => 'deleted'];
    }
    $pdo->prepare('UPDATE crm_leads SET name = ?, email = NULL, phone = NULL, postcode = NULL, address = NULL, project_type = NULL, property_type = NULL, budget = NULL, desired_start = NULL, description = NULL, preferred_contact = NULL, lost_reason = NULL, raw_payload = NULL WHERE id = ?')
        ->execute(['Personal data erased', $id]);
    $pdo->prepare('UPDATE crm_site_visits SET address = NULL, notes = NULL WHERE lead_id = ?')->execute([$id]);
    $pdo->prepare('UPDATE crm_tasks SET notes = NULL WHERE lead_id = ? AND notes IS NOT NULL')->execute([$id]);
    crmLog($id, 'system', 'Personal data erased at the customer’s request. Quotes and invoices were kept for accounting.', $userId);
    return ['id' => $id, 'erased' => 'anonymised'];
}

/* ---------------------------------------------------------------------------
 * Team accounts
 *
 * Mirrors CrmService.team()/createTeamMember()/updateTeamMember()/resetTeamPassword().
 * Owners and administrators manage staff; the password hash is never returned.
 * ------------------------------------------------------------------------ */

function crmTeamMemberOut(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => crmText($row['name']),
        'email' => crmText($row['email']),
        'role' => crmText($row['role']),
        'isActive' => (bool) $row['is_active'],
        'createdAt' => crmIso($row['created_at'] ?? null),
        'lastSeenAt' => crmIso($row['last_seen_at'] ?? null),
    ];
}

function crmTeamQuery(): string
{
    return "SELECT u.id, u.display_name AS name, u.email, u.role, u.is_active, u.created_at,
        (SELECT MAX(s.last_seen_at) FROM staff_sessions s WHERE s.user_id = u.id) AS last_seen_at
        FROM users u WHERE u.role IN ('owner','admin','staff')";
}

function crmTeam(): array
{
    $rows = database()->query(crmTeamQuery() . ' ORDER BY u.is_active DESC, u.display_name')->fetchAll();
    return array_map('crmTeamMemberOut', $rows);
}

function crmTeamFind(int $id): array
{
    $statement = database()->prepare(crmTeamQuery() . ' AND u.id = ? LIMIT 1');
    $statement->execute([$id]);
    $row = $statement->fetch();
    if ($row === false) {
        fail(404, 'Team member not found.');
    }
    return crmTeamMemberOut($row);
}

/** Team management is owner/administrator only, matching the Express API. */
function crmRequireManager(array $user): void
{
    if (!in_array((string) $user['role'], ['owner', 'admin'], true)) {
        fail(403, 'Only owners and administrators can manage the team.');
    }
}

function crmTeamSpec(bool $create): array
{
    $spec = [
        'name' => ['type' => 'text', 'min' => 1, 'max' => 120, 'required' => true, 'message' => 'Enter the team member’s name.'],
        'email' => ['type' => 'email', 'required' => true],
        'role' => ['type' => 'enum', 'values' => CRM_ROLES, 'message' => 'Choose a role from the list.'] + ($create ? ['default' => 'staff'] : []),
    ];
    if ($create) {
        $spec['password'] = ['type' => 'text', 'min' => 12, 'max' => 200, 'required' => true, 'message' => 'Use at least 12 characters for the password.'];
    } else {
        $spec['isActive'] = ['type' => 'bool'];
    }
    return $spec;
}

function crmCreateTeamMember(array $body): array
{
    $input = crmValidate($body, crmTeamSpec(true));
    $email = (string) ($input['email'] ?? '');
    if ($email === '') {
        fail(400, 'Enter a valid email address.');
    }
    $pdo = database();
    $existing = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $existing->execute([$email]);
    if ($existing->fetchColumn() !== false) {
        fail(409, 'A team member with this email address already exists.');
    }
    $insert = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, TRUE)');
    try {
        $insert->execute([$email, password_hash((string) $input['password'], PASSWORD_BCRYPT, ['cost' => 12]), (string) $input['name'], (string) $input['role']]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            fail(409, 'A team member with this email address already exists.');
        }
        throw $error;
    }
    $id = (int) $pdo->lastInsertId();
    auditAuthentication($pdo, $id, 'team_member_created', $email);
    return crmTeamFind($id);
}

function crmUpdateTeamMember(int $id, array $body, array $actor): array
{
    $input = crmValidate($body, crmTeamSpec(false), true);
    $pdo = database();
    $statement = $pdo->prepare("SELECT id, email, display_name, role, is_active FROM users WHERE id = ? AND role IN ('owner','admin','staff') LIMIT 1");
    $statement->execute([$id]);
    $target = $statement->fetch();
    if ($target === false) {
        fail(404, 'Team member not found.');
    }
    $role = (string) ($input['role'] ?? $target['role']);
    $isActive = array_key_exists('isActive', $input) ? (bool) $input['isActive'] : (bool) $target['is_active'];
    if ((int) $actor['id'] === $id && ($role !== (string) $target['role'] || $isActive !== (bool) $target['is_active'])) {
        fail(400, 'You cannot change your own role or deactivate your own access.');
    }
    if ($target['role'] === 'owner' && (bool) $target['is_active'] && ($role !== 'owner' || !$isActive)) {
        $owners = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'owner' AND is_active = TRUE AND id <> ?");
        $owners->execute([$id]);
        if ((int) $owners->fetchColumn() === 0) {
            fail(400, 'At least one owner must keep access. Promote another team member first.');
        }
    }
    $email = (string) ($input['email'] ?? $target['email']);
    if ($email === '') {
        fail(400, 'Enter a valid email address.');
    }
    if ($email !== (string) $target['email']) {
        $duplicate = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $duplicate->execute([$email, $id]);
        if ($duplicate->fetchColumn() !== false) {
            fail(409, 'A team member with this email address already exists.');
        }
    }
    $pdo->prepare('UPDATE users SET email = ?, display_name = ?, role = ?, is_active = ? WHERE id = ?')
        ->execute([$email, (string) ($input['name'] ?? $target['display_name']), $role, $isActive ? 1 : 0, $id]);
    // A deactivated account must not keep working through a session it already had.
    if (!$isActive && (bool) $target['is_active']) {
        $pdo->prepare('DELETE FROM staff_sessions WHERE user_id = ?')->execute([$id]);
    }
    auditAuthentication($pdo, $id, 'team_member_updated', $email);
    return crmTeamFind($id);
}

function crmResetTeamPassword(int $id, array $body): array
{
    $input = crmValidate($body, ['password' => ['type' => 'text', 'min' => 12, 'max' => 200, 'required' => true, 'message' => 'Use at least 12 characters for the password.']]);
    $member = crmTeamFind($id);
    $pdo = database();
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $input['password'], PASSWORD_BCRYPT, ['cost' => 12]), $id]);
    $pdo->prepare('DELETE FROM staff_sessions WHERE user_id = ?')->execute([$id]);
    auditAuthentication($pdo, $id, 'team_member_password_reset', (string) $member['email']);
    return ['id' => $id, 'sessionsCleared' => true];
}

/* ---------------------------------------------------------------------------
 * HTTP
 * ------------------------------------------------------------------------ */

function crmRespond(array $payload, int $status = 200): never
{
    header('Cache-Control: no-store');
    jsonResponse($payload, $status);
}

function crmQueryText(string $key): string
{
    $value = $_GET[$key] ?? '';
    return is_string($value) ? mb_substr($value, 0, 120) : '';
}

/** Dispatches CRM routes; returns without output when the route is not a CRM route. */
function handleCrmRoute(string $method, string $route): void
{
    if ($method === 'POST' && $route === '/integrations/wordpress/lead') {
        rateLimit('crm-webhook', 60, 60, 'Too many webhook requests.');
        $secret = setting('CRM_WEBHOOK_SECRET');
        if (strlen($secret) < 32) {
            fail(503, 'The CRM webhook has not been configured.');
        }
        $raw = (string) file_get_contents('php://input');
        if (strlen($raw) > 204800) {
            fail(413, 'Submission is too large.');
        }
        if (!crmVerifyWebhook($secret, (string) ($_SERVER['HTTP_X_OMNI_TIMESTAMP'] ?? ''), (string) ($_SERVER['HTTP_X_OMNI_SIGNATURE'] ?? ''), $raw)) {
            fail(401, 'Signature check failed.');
        }
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            fail(400, 'Body must be JSON.');
        }
        $result = crmIngestWordPress($body);
        crmRespond($result, $result['created'] ? 201 : 200);
    }

    if (!str_starts_with($route, '/admin/crm/')) {
        return;
    }
    $user = currentStaffUser();
    if ($user === null) {
        fail(401, 'Staff authentication required.');
    }
    $userId = (int) $user['id'] ?: null;
    $path = substr($route, strlen('/admin/crm'));
    $body = in_array($method, ['POST', 'PATCH'], true) ? requestData() : [];

    if ($method === 'GET' && $path === '/summary') {
        crmRespond(crmSummary());
    }
    if ($method === 'GET' && $path === '/staff') {
        crmRespond(['staff' => crmStaff()]);
    }
    if ($path === '/team') {
        if ($method === 'GET') {
            crmRequireManager($user);
            crmRespond(['team' => crmTeam()]);
        }
        if ($method === 'POST') {
            crmRequireManager($user);
            crmRespond(['member' => crmCreateTeamMember($body)], 201);
        }
    }
    if ($method === 'PATCH' && preg_match('#^/team/(\d+)$#', $path, $match)) {
        crmRequireManager($user);
        crmRespond(['member' => crmUpdateTeamMember((int) $match[1], $body, $user)]);
    }
    if ($method === 'POST' && preg_match('#^/team/(\d+)/password$#', $path, $match)) {
        crmRequireManager($user);
        crmRespond(['reset' => crmResetTeamPassword((int) $match[1], $body)]);
    }
    if ($method === 'GET' && $path === '/leads.csv') {
        crmDownloadCsv('omni-leads-' . gmdate('Y-m-d') . '.csv', crmExportLeads());
    }
    if ($method === 'GET' && $path === '/invoices.csv') {
        crmDownloadCsv('omni-invoices-' . gmdate('Y-m-d') . '.csv', crmExportInvoices());
    }
    if ($path === '/leads') {
        if ($method === 'GET') {
            crmRespond(['records' => crmListLeads(crmQueryText('stage'), crmQueryText('q'))]);
        }
        if ($method === 'POST') {
            crmRespond(['lead' => crmCreateLead($body, $userId)], 201);
        }
    }
    if ($method === 'GET' && preg_match('#^/leads/(\d+)/files/(\d+)$#', $path, $match)) {
        crmDownloadLeadFile((int) $match[1], (int) $match[2]);
    }
    if (preg_match('#^/leads/(\d+)$#', $path, $match)) {
        if ($method === 'GET') {
            crmRespond(crmLeadDetail((int) $match[1]));
        }
        if ($method === 'PATCH') {
            crmRespond(['lead' => crmUpdateLead((int) $match[1], $body, $userId)]);
        }
        if ($method === 'DELETE') {
            crmRespond(['result' => crmEraseLead((int) $match[1], $userId)]);
        }
    }
    if ($method === 'POST' && preg_match('#^/leads/(\d+)/activities$#', $path, $match)) {
        crmRespond(['activities' => crmAddActivity((int) $match[1], $body, $userId)], 201);
    }

    $resources = [
        'visits' => ['crm_site_visits', 'crmVisitOut', 'crmCreateVisit', 'crmUpdateVisit', 'visit'],
        'tasks' => ['crm_tasks', 'crmTaskOut', 'crmCreateTask', 'crmUpdateTask', 'task'],
        'quotes' => ['crm_quotes', 'crmQuoteOut', 'crmCreateQuote', 'crmUpdateQuote', 'quote'],
        'invoices' => ['crm_invoices', 'crmInvoiceOut', 'crmCreateInvoice', 'crmUpdateInvoice', 'invoice'],
    ];
    if (preg_match('#^/(visits|tasks|quotes|invoices)(?:/(\d+))?$#', $path, $match)) {
        [$table, $out, $create, $update, $key] = $resources[$match[1]];
        $id = isset($match[2]) && $match[2] !== '' ? (int) $match[2] : null;
        if ($method === 'GET' && $id === null) {
            $status = crmQueryText('status');
            $lookups = crmLookups();
            $records = array_map(fn ($row) => $out($row, $lookups), crmList($table, $status !== '' ? ['status' => $status] : []));
            if ($match[1] === 'visits') {
                usort($records, fn ($a, $b) => strcmp((string) $a['scheduledAt'], (string) $b['scheduledAt']));
            } elseif ($match[1] === 'tasks') {
                usort($records, fn ($a, $b) => (($a['status'] === 'open' ? 0 : 1) <=> ($b['status'] === 'open' ? 0 : 1)) ?: (strcmp($a['dueAt'] ?? '9999', $b['dueAt'] ?? '9999') ?: $b['id'] <=> $a['id']));
            }
            crmRespond(['records' => $records]);
        }
        if ($method === 'POST' && $id === null) {
            crmRespond([$key => $create($body, $userId)], 201);
        }
        if ($method === 'PATCH' && $id !== null) {
            if ($id < 1) {
                fail(400, 'Invalid record id.');
            }
            crmRespond([$key => $update($id, $body, $userId)]);
        }
    }
    fail(404, 'Not found.');
}
