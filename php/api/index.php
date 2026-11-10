<?php

declare(strict_types=1);

const MAX_UPLOAD_BYTES = 8388608;

final class ApiError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

final class DatabaseConfigurationError extends RuntimeException {}
final class DatabaseUnavailableError extends RuntimeException {}
function loadConfig(): array
{
    $defaults = [
        'APP_URL' => '',
        'DATABASE_HOST' => '',
        'DATABASE_PORT' => '3306',
        'DATABASE_NAME' => '',
        'DATABASE_USER' => '',
        'DATABASE_PASSWORD' => '',
        'BOOTSTRAP_ADMIN_NAME' => 'Omni Administrator',
        'BOOTSTRAP_ADMIN_EMAIL' => '',
        'BOOTSTRAP_ADMIN_PASSWORD' => '',
        'COOKIE_SECURE' => 'true',
        'TRUST_PROXY' => '',
        'STAGING_MODE' => 'false',
        'DEMO_MODE' => 'false',
        'DEMO_LOGIN_EMAIL' => 'admin@omnidevelopment.co.uk',
        'DEMO_LOGIN_PASSWORD' => '',
        'DEMO_STAFF_EMAIL' => 'staff@omnidevelopment.co.uk',
        'DEMO_STAFF_PASSWORD' => '',
        'PUBLIC_PHONE' => '07928 149 731',
        'PUBLIC_EMAIL' => 'admin@omnidevelopment.co.uk',
        'PUBLIC_WHATSAPP' => 'https://wa.me/447928149731',
        'UPLOAD_DIR' => '',
        'PROJECT_UPLOAD_DIR' => '',
        'CRM_WEBHOOK_SECRET' => '',
        // Email (SMTP out, IMAP in), e-signature links and the cron endpoint. See config.example.php.
        // Mail keys default to '' on purpose: an empty value lets the CRM mail settings stored in the
        // database apply, then the Zoho UK defaults (crm_sales.php CRM_MAIL_SETTINGS).
        'OUTBOUND_MESSAGES_ENABLED' => '',
        'SMTP_HOST' => '',
        'SMTP_PORT' => '',
        'SMTP_SECURE' => '',
        'SMTP_USER' => '',
        'SMTP_PASSWORD' => '',
        'EMAIL_FROM' => '',
        'EMAIL_FROM_NAME' => '',
        'EMAIL_REPLY_TO' => '',
        'IMAP_HOST' => '',
        'IMAP_PORT' => '',
        'IMAP_USER' => '',
        'IMAP_PASSWORD' => '',
        'IMAP_MAILBOX' => '',
        'SIGNING_BASE_URL' => '',
        'CRM_CRON_SECRET' => '',
        'DEEPSEEK_API_KEY' => '',
        'DEEPSEEK_MODEL' => '',
    ];
    // Precedence: environment variable > omni-crm-config.php (one level above the web root, so a
    // deploy that replaces public_html never deletes it) > api/config.local.php > defaults.
    $sources = [];
    foreach ([configFileOutsideWebRoot(), __DIR__ . '/config.local.php'] as $file) {
        $values = is_file($file) ? require $file : [];
        if (!is_array($values)) {
            throw new RuntimeException(basename($file) . ' must return an array.');
        }
        $sources[] = $values;
    }
    foreach ($defaults as $key => $value) {
        $environment = getenv($key);
        if ($environment !== false && $environment !== '') {
            $defaults[$key] = $environment;
            continue;
        }
        foreach ($sources as $source) {
            if (array_key_exists($key, $source) && $source[$key] !== '' && $source[$key] !== null) {
                $defaults[$key] = is_bool($source[$key]) ? ($source[$key] ? 'true' : 'false') : (string) $source[$key];
                break;
            }
        }
    }
    return $defaults;
}

/** Live settings file that sits next to public_html (never inside a deploy package). */
function configFileOutsideWebRoot(): string
{
    return dirname(__DIR__, 2) . '/omni-crm-config.php';
}

$config = loadConfig();

function setting(string $key): string
{
    global $config;
    return (string) ($config[$key] ?? '');
}

function flag(string $key): bool
{
    return in_array(strtolower(trim(setting($key))), ['1', 'true', 'yes', 'on'], true);
}

/**
 * The demo sign-in accounts advertised on /staff/login. Only returned when DEMO_MODE
 * is enabled, and only ever holds throwaway review credentials from config.local.php.
 */
function demoAccounts(): array
{
    return [
        ['role' => 'Owner', 'email' => setting('DEMO_LOGIN_EMAIL'), 'password' => setting('DEMO_LOGIN_PASSWORD')],
        ['role' => 'Staff', 'email' => setting('DEMO_STAFF_EMAIL'), 'password' => setting('DEMO_STAFF_PASSWORD')],
    ];
}

function jsonResponse(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $message): never
{
    throw new ApiError($status, $message);
}

function database(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    foreach (['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'] as $key) {
        if (setting($key) === '') {
            throw new DatabaseConfigurationError('Database configuration is incomplete.');
        }
    }
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            setting('DATABASE_HOST'),
            (int) setting('DATABASE_PORT'),
            setting('DATABASE_NAME')
        );
        $pdo = new PDO($dsn, setting('DATABASE_USER'), setting('DATABASE_PASSWORD'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // NOW()/CURRENT_TIMESTAMP and PHP formatting must agree, whatever the host's zone is.
        $pdo->exec("SET time_zone = '+00:00'");
        return $pdo;
    } catch (PDOException $error) {
        error_log('[database] connection failed: ' . $error->getCode());
        throw new DatabaseUnavailableError('Database connection is unavailable.', 0, $error);
    }
}

function requestData(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($contentType, 'application/json')) {
        $decoded = json_decode((string) file_get_contents('php://input'), true);
        return is_array($decoded) ? $decoded : [];
    }
    return $_POST;
}

function textValue(array $input, string $key, int $min, int $max, string $message): string
{
    $value = trim((string) ($input[$key] ?? ''));
    $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    if ($length < $min || $length > $max) {
        fail(400, $message);
    }
    return $value;
}

function boolValue(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

function reference(string $prefix): string
{
    return $prefix . '-' . strtoupper(bin2hex(random_bytes(5)));
}

function ensureSameOrigin(): void
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return;
    }
    $originHost = parse_url($origin, PHP_URL_HOST);
    $requestHost = explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0];
    if (!is_string($originHost) || !hash_equals(strtolower($requestHost), strtolower($originHost))) {
        fail(403, 'This request was not accepted.');
    }
}

/**
 * Client address for rate limiting and audit hashes. With TRUST_PROXY set to a
 * hop count (Hostinger: 1), the address appended by the trusted proxy is used;
 * otherwise only REMOTE_ADDR is trusted so clients cannot spoof their bucket.
 */
function clientIp(): string
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $hops = (int) setting('TRUST_PROXY');
    $forwarded = trim((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    if ($hops < 1 || $forwarded === '') {
        return $remote;
    }
    $chain = array_values(array_filter(array_map('trim', explode(',', $forwarded)), fn ($ip) => filter_var($ip, FILTER_VALIDATE_IP) !== false));
    if (!$chain) {
        return $remote;
    }
    return $chain[max(0, count($chain) - $hops)];
}

function rateLimit(string $bucket, int $limit, int $windowSeconds, string $message = 'Too many requests from this network. Please try again shortly.'): void
{
    $ip = clientIp();
    $file = sys_get_temp_dir() . '/omni-rate-' . hash('sha256', $bucket . '|' . $ip) . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false) {
        return;
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            return;
        }
        $raw = stream_get_contents($handle);
        $times = json_decode($raw ?: '[]', true);
        $times = is_array($times) ? array_values(array_filter($times, fn ($time) => is_int($time) && $time > time() - $windowSeconds)) : [];
        if (count($times) >= $limit) {
            fail(429, $message);
        }
        $times[] = time();
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($times));
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function sessionToken(): string
{
    return trim((string) ($_COOKIE['omni_staff_session'] ?? ''));
}

function sessionCookie(string $token, int $expiresAt): void
{
    setcookie('omni_staff_session', $token, [
        'expires' => $expiresAt,
        'path' => '/',
        'secure' => flag('COOKIE_SECURE'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function createStaffSession(PDO $pdo, int $userId): void
{
    $token = bin2hex(random_bytes(32));
    $expiresAt = time() + 28800;
    $pdo->prepare('DELETE FROM staff_sessions WHERE expires_at <= UTC_TIMESTAMP() OR user_id = ?')->execute([$userId]);
    $statement = $pdo->prepare('INSERT INTO staff_sessions (token_hash, user_id, expires_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([
        hash('sha256', $token),
        $userId,
        gmdate('Y-m-d H:i:s', $expiresAt),
        hash('sha256', clientIp()),
        substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
    ]);
    sessionCookie($token, $expiresAt);
}

function currentStaffUser(): ?array
{
    $token = sessionToken();
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }
    $pdo = database();
    $statement = $pdo->prepare("SELECT u.id, u.email, u.display_name, u.role FROM staff_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.is_active = TRUE AND u.role IN ('owner','admin','staff') LIMIT 1");
    $statement->execute([hash('sha256', $token)]);
    $user = $statement->fetch();
    if ($user === false) {
        return null;
    }
    $pdo->prepare('UPDATE staff_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?')->execute([hash('sha256', $token)]);
    return $user;
}

function requireAdmin(): int
{
    $user = currentStaffUser();
    if ($user === null) {
        fail(401, 'Staff authentication required.');
    }
    return (int) $user['id'];
}

/** ISO-8601 timestamps so every browser parses CRM dates identically. */
function isoTimestamps(array $rows, array $keys): array
{
    return array_map(function (array $row) use ($keys): array {
        foreach ($keys as $key) {
            if (!empty($row[$key])) {
                $row[$key] = date(DATE_ATOM, strtotime((string) $row[$key]));
            }
        }
        return $row;
    }, $rows);
}

function auditAuthentication(PDO $pdo, ?int $userId, string $action, string $email): void
{
    try {
        $statement = $pdo->prepare("INSERT INTO activity_audit_records (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, 'authentication', ?, ?)");
        $statement->execute([
            $userId,
            $action,
            $userId,
            json_encode([
                'email_hash' => hash('sha256', strtolower(trim($email))),
                'ip_hash' => hash('sha256', clientIp()),
            ], JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable $error) {
        error_log('[authentication] audit write failed.');
    }
}

function bootstrapAdministrator(PDO $pdo): void
{
    $administratorCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role IN ('owner','admin')")->fetchColumn();
    if ($administratorCount > 0) {
        return;
    }
    $name = trim(setting('BOOTSTRAP_ADMIN_NAME')) ?: 'Omni Administrator';
    $email = strtolower(trim(setting('BOOTSTRAP_ADMIN_EMAIL')));
    $password = setting('BOOTSTRAP_ADMIN_PASSWORD');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
        throw new DatabaseConfigurationError('Staff bootstrap configuration is incomplete.');
    }
    $statement = $pdo->prepare("INSERT INTO users (email, password_hash, display_name, role, is_active) SELECT ?, ?, ?, 'owner', TRUE WHERE NOT EXISTS (SELECT 1 FROM users WHERE role IN ('owner','admin'))");
    $statement->execute([$email, password_hash($password, PASSWORD_BCRYPT), substr($name, 0, 120)]);
    if ($statement->rowCount() > 0) {
        auditAuthentication($pdo, (int) $pdo->lastInsertId(), 'administrator_bootstrapped', $email);
    }
}

function normaliseFiles(string $field): array
{
    if (!isset($_FILES[$field])) {
        return [];
    }
    $entry = $_FILES[$field];
    $names = is_array($entry['name']) ? $entry['name'] : [$entry['name']];
    $result = [];
    foreach ($names as $index => $name) {
        $result[] = [
            'name' => (string) $name,
            'type' => (string) (is_array($entry['type']) ? $entry['type'][$index] : $entry['type']),
            'tmp_name' => (string) (is_array($entry['tmp_name']) ? $entry['tmp_name'][$index] : $entry['tmp_name']),
            'error' => (int) (is_array($entry['error']) ? $entry['error'][$index] : $entry['error']),
            'size' => (int) (is_array($entry['size']) ? $entry['size'][$index] : $entry['size']),
        ];
    }
    return $result;
}

function checkedUpload(array $file, bool $imagesOnly): array
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        fail(400, $file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
            ? 'Each upload must be 8 MB or smaller.'
            : 'Upload could not be processed.');
    }
    if ($file['size'] < 1 || $file['size'] > MAX_UPLOAD_BYTES || !is_uploaded_file($file['tmp_name'])) {
        fail(400, 'Each upload must be 8 MB or smaller.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!$imagesOnly) {
        $allowed['application/pdf'] = 'pdf';
    }
    if (!is_string($mime) || !isset($allowed[$mime])) {
        fail(400, $imagesOnly ? 'Project uploads must be JPG, PNG or WebP images.' : 'One or more uploads could not be verified as a supported file type.');
    }
    return ['mime' => $mime, 'extension' => $allowed[$mime]];
}

function uploadDirectory(bool $public): string
{
    $configured = setting($public ? 'PROJECT_UPLOAD_DIR' : 'UPLOAD_DIR');
    $directory = $configured !== ''
        ? $configured
        : ($public ? dirname(__DIR__, 2) . '/uploads/projects' : __DIR__ . '/private/uploads');
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        fail(500, 'Upload storage is unavailable.');
    }
    return rtrim($directory, '/\\');
}

function listProjects(bool $includeUnpublished): array
{
    $pdo = database();
    $where = $includeUnpublished ? '' : "WHERE p.publication_status = 'published'";
    $rows = $pdo->query("SELECT p.id, p.slug, p.title, p.location_label, p.description, pc.name AS category_name, p.publication_status, p.created_at, p.updated_at FROM projects p LEFT JOIN project_categories pc ON pc.id = p.category_id $where ORDER BY p.updated_at DESC, p.id DESC")->fetchAll();
    if (!$rows) {
        return [];
    }
    $ids = array_map(fn ($row) => (int) $row['id'], $rows);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $mediaStatement = $pdo->prepare("SELECT project_id, stored_filename FROM project_media WHERE project_id IN ($marks) AND media_kind = 'image' ORDER BY sort_order, id");
    $mediaStatement->execute($ids);
    $tagStatement = $pdo->prepare("SELECT project_id, tag FROM project_tags WHERE project_id IN ($marks) ORDER BY sort_order, id");
    $tagStatement->execute($ids);
    $media = [];
    foreach ($mediaStatement->fetchAll() as $item) {
        $media[(int) $item['project_id']][] = $item['stored_filename'];
    }
    $tags = [];
    foreach ($tagStatement->fetchAll() as $item) {
        $tags[(int) $item['project_id']][] = $item['tag'];
    }
    return array_map(function (array $row) use ($media, $tags): array {
        $id = (int) $row['id'];
        $gallery = $media[$id] ?? [];
        return [
            'id' => $id,
            'slug' => $row['slug'],
            'title' => $row['title'],
            'location' => $row['location_label'] ?: 'Project gallery',
            'category' => $row['category_name'] ?: 'Project',
            'description' => $row['description'],
            'image' => $gallery[0] ?? '',
            'gallery' => $gallery,
            'tags' => $tags[$id] ?? [],
            'published' => $row['publication_status'] === 'published',
            'publicationStatus' => $row['publication_status'],
            'createdAt' => date(DATE_ATOM, strtotime($row['created_at'])),
            'updatedAt' => date(DATE_ATOM, strtotime($row['updated_at'])),
        ];
    }, $rows);
}

function validateProject(array $input): array
{
    $project = [
        'slug' => textValue($input, 'slug', 2, 160, 'Add a valid project URL slug.'),
        'title' => textValue($input, 'title', 2, 190, 'Add a project title.'),
        'location' => textValue($input, 'location', 2, 190, 'Add a location label.'),
        'category' => textValue($input, 'category', 2, 120, 'Choose a category.'),
        'description' => textValue($input, 'description', 10, 3000, 'Add a project description.'),
        'image' => textValue($input, 'image', 1, 255, 'Choose a main image.'),
        'gallery' => is_array($input['gallery'] ?? null) ? array_values($input['gallery']) : [],
        'tags' => is_array($input['tags'] ?? null) ? array_values($input['tags']) : [],
        'published' => boolValue($input['published'] ?? false),
    ];
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $project['slug'])) {
        fail(400, 'Use lowercase letters, numbers and hyphens for the URL slug.');
    }
    $assets = array_merge([$project['image']], $project['gallery']);
    if (count($project['gallery']) > 24 || count($project['tags']) > 12) {
        fail(400, 'The project contains too many gallery images or tags.');
    }
    foreach ($assets as $asset) {
        if (!is_string($asset) || strlen($asset) > 255 || (!str_starts_with($asset, '/images/') && !str_starts_with($asset, '/uploads/'))) {
            fail(400, 'Images must use an approved local asset path.');
        }
    }
    foreach ($project['tags'] as $tag) {
        if (!is_string($tag) || trim($tag) === '' || strlen($tag) > 80) {
            fail(400, 'Project tags must be between 1 and 80 characters.');
        }
    }
    return $project;
}

function categorySlug(string $value): string
{
    $slug = trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower($value)), '-');
    return substr($slug ?: 'projects', 0, 160);
}

function saveProject(array $project, ?int $id = null): array
{
    $pdo = database();
    $pdo->beginTransaction();
    try {
        $category = $pdo->prepare('INSERT INTO project_categories (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
        $category->execute([$project['category'], categorySlug($project['category'])]);
        $categoryId = (int) $pdo->lastInsertId();
        $status = $project['published'] ? 'published' : 'draft';
        if ($id === null) {
            $statement = $pdo->prepare('INSERT INTO projects (slug, title, location_label, description, category_id, publication_status) VALUES (?, ?, ?, ?, ?, ?)');
            $statement->execute([$project['slug'], $project['title'], $project['location'], $project['description'], $categoryId, $status]);
            $id = (int) $pdo->lastInsertId();
        } else {
            $statement = $pdo->prepare('UPDATE projects SET slug = ?, title = ?, location_label = ?, description = ?, category_id = ?, publication_status = ? WHERE id = ?');
            $statement->execute([$project['slug'], $project['title'], $project['location'], $project['description'], $categoryId, $status, $id]);
            if ($statement->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT id FROM projects WHERE id = ?');
                $exists->execute([$id]);
                if (!$exists->fetch()) {
                    fail(404, 'Project not found.');
                }
            }
        }
        $pdo->prepare('DELETE FROM project_media WHERE project_id = ?')->execute([$id]);
        $assets = array_values(array_unique(array_merge([$project['image']], array_filter($project['gallery'], fn ($asset) => $asset !== $project['image']))));
        $media = $pdo->prepare("INSERT INTO project_media (project_id, stored_filename, alt_text, media_kind, sort_order) VALUES (?, ?, ?, 'image', ?)");
        foreach ($assets as $order => $asset) {
            $media->execute([$id, $asset, $project['title'] . ' - supplied project photography', $order]);
        }
        $pdo->prepare('DELETE FROM project_tags WHERE project_id = ?')->execute([$id]);
        $tagStatement = $pdo->prepare('INSERT INTO project_tags (project_id, tag, sort_order) VALUES (?, ?, ?)');
        foreach ($project['tags'] as $order => $tag) {
            $tagStatement->execute([$id, trim($tag), $order]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error instanceof ApiError) {
            throw $error;
        }
        if ($error instanceof PDOException && $error->getCode() === '23000') {
            fail(409, 'A project with this URL slug already exists.');
        }
        throw $error;
    }
    foreach (listProjects(true) as $record) {
        if ((int) $record['id'] === $id) {
            return $record;
        }
    }
    fail(500, 'Project could not be loaded after saving.');
}

function routePath(): string
{
    if (($_GET['resource'] ?? '') === 'health') {
        return '/health';
    }
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/api'), PHP_URL_PATH) ?: '/api';
    $position = strpos($path, '/api');
    return $position === false ? '/' : ('/' . ltrim(substr($path, $position + 4), '/'));
}

require_once __DIR__ . '/crm.php';

ini_set('display_errors', '0');
date_default_timezone_set('UTC');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (flag('STAGING_MODE')) {
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$route = routePath();

try {
    if ($method === 'GET' && ($_GET['resource'] ?? '') === 'robots') {
        header('Content-Type: text/plain; charset=utf-8');
        if (flag('STAGING_MODE')) {
            echo "User-agent: *\nDisallow: /\n";
        } else {
            echo "User-agent: *\nAllow: /\nDisallow: /staff\nDisallow: /api\nSitemap: " . rtrim(setting('APP_URL'), '/') . "/sitemap.xml\n";
        }
        exit;
    }
    if ($method === 'GET' && ($_GET['resource'] ?? '') === 'sitemap') {
        $paths = ['/', '/services', '/projects', '/how-it-works', '/about', '/reviews', '/areas', '/guides', '/contact', '/quote'];
        $base = rtrim(setting('APP_URL'), '/');
        header('Content-Type: application/xml; charset=utf-8');
        echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($paths as $path) {
            echo '<url><loc>' . htmlspecialchars($base . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc></url>';
        }
        echo '</urlset>';
        exit;
    }
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($method !== 'GET') {
        ensureSameOrigin();
    }

    if ($method === 'GET' && $route === '/health') {
        try {
            $pdo = database();
            foreach (['users', 'projects', 'contact_enquiries', 'quote_requests', 'quote_request_files', 'staff_sessions', 'activity_audit_records', 'crm_site_visits', 'crm_tasks', 'crm_calendar_events', 'crm_invoices', 'crm_leads', 'crm_lead_activities', 'crm_quotes'] as $table) {
                $pdo->query("SELECT 1 FROM `$table` LIMIT 0");
            }
            $payload = ['status' => 'ok', 'service' => 'omni-development-site-php', 'timestamp' => date(DATE_ATOM)];
            if (!flag('STAGING_MODE')) {
                $payload['database'] = 'connected';
            }
            jsonResponse($payload);
        } catch (Throwable $error) {
            $payload = ['status' => 'degraded', 'service' => 'omni-development-site-php', 'timestamp' => date(DATE_ATOM)];
            if (!flag('STAGING_MODE')) {
                $payload['database'] = $error instanceof DatabaseConfigurationError ? 'not-configured' : 'unavailable';
            }
            jsonResponse($payload, 503);
        }
    }

    if ($method === 'GET' && $route === '/site-settings') {
        jsonResponse([
            'name' => 'Omni Developments',
            'area' => 'Greater Manchester & Cheshire',
            'phone' => setting('PUBLIC_PHONE'),
            'email' => setting('PUBLIC_EMAIL'),
            'whatsapp' => setting('PUBLIC_WHATSAPP'),
            'stagingMode' => flag('STAGING_MODE'),
            // Demo credentials are only published when DEMO_MODE is on, so a real deployment
            // never leaks a working password through this public endpoint.
            'demoMode' => flag('DEMO_MODE'),
            'demoAccounts' => flag('DEMO_MODE') ? demoAccounts() : [],
            'outboundMessagesEnabled' => false,
        ]);
    }

    if ($method === 'GET' && $route === '/projects') {
        jsonResponse(['projects' => listProjects(false), 'database' => 'configured']);
    }
    if ($method === 'GET' && preg_match('#^/projects/([a-z0-9]+(?:-[a-z0-9]+)*)$#', $route, $matches)) {
        foreach (listProjects(false) as $project) {
            if ($project['slug'] === $matches[1]) {
                jsonResponse($project);
            }
        }
        fail(404, 'Project not found.');
    }

    if ($method === 'POST' && $route === '/contact') {
        rateLimit('contact', 8, 600);
        $input = requestData();
        if (trim((string) ($input['website'] ?? '')) !== '') {
            fail(400, 'Unable to process this enquiry.');
        }
        $name = textValue($input, 'name', 2, 120, 'Please enter your name.');
        $email = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        if ($email === false || strlen((string) $email) > 190) {
            fail(400, 'Please enter a valid email address.');
        }
        $phone = textValue($input, 'phone', 7, 40, 'Please enter a valid telephone number.');
        $message = textValue($input, 'message', 10, 5000, 'Please add a little more detail.');
        $preferred = (string) ($input['preferredContact'] ?? 'Email');
        if (!in_array($preferred, ['Email', 'Telephone', 'WhatsApp'], true) || !boolValue($input['consent'] ?? false)) {
            fail(400, 'Privacy consent is required.');
        }
        $source = substr(trim((string) ($input['source'] ?? 'unknown')), 0, 120);
        $publicReference = reference('ENQ');
        $statement = database()->prepare("INSERT INTO contact_enquiries (public_reference, name, email, telephone, preferred_contact_method, message, source_page, privacy_consent, notification_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'not-configured', NOW())");
        $statement->execute([$publicReference, $name, $email, $phone, $preferred, $message, $source]);
        jsonResponse(['reference' => $publicReference, 'message' => 'Your enquiry has been received. We will follow up using the details you provided.'], 201);
    }

    if ($method === 'POST' && $route === '/quote') {
        rateLimit('quote', 4, 1200);
        $input = requestData();
        $fields = [
            'projectType' => [1, 80], 'propertyType' => [1, 80], 'postcode' => [3, 20],
            'description' => [10, 8000], 'stage' => [1, 100], 'start' => [1, 100],
            'contactName' => [2, 120], 'phone' => [7, 40],
        ];
        $values = [];
        foreach ($fields as $key => [$min, $max]) {
            $values[$key] = textValue($input, $key, $min, $max, 'Please check the submitted details.');
        }
        $email = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $preferred = (string) ($input['preferredContact'] ?? 'Email');
        if ($email === false || strlen((string) $email) > 190 || !in_array($preferred, ['Email', 'Telephone', 'WhatsApp'], true) || !boolValue($input['consent'] ?? false)) {
            fail(400, 'Please check the submitted details.');
        }
        $budget = substr(trim((string) ($input['budget'] ?? '')), 0, 100);
        $files = normaliseFiles('files');
        if (count($files) > 8) {
            fail(400, 'A maximum of 8 files can be uploaded.');
        }
        $stored = [];
        $directory = uploadDirectory(false);
        try {
            foreach ($files as $file) {
                $checked = checkedUpload($file, false);
                $storedName = bin2hex(random_bytes(16)) . '.' . $checked['extension'];
                if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $storedName)) {
                    fail(500, 'Upload storage is unavailable.');
                }
                $stored[] = ['stored' => $storedName, 'original' => substr(basename($file['name']), 0, 180), 'mime' => $checked['mime'], 'size' => $file['size']];
            }
            $pdo = database();
            $pdo->beginTransaction();
            $publicReference = reference('QTE');
            $statement = $pdo->prepare("INSERT INTO quote_requests (public_reference, project_type, property_type, postcode, description, project_stage, budget_range, desired_start, contact_name, email, telephone, preferred_contact_method, privacy_consent, notification_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'not-configured', NOW())");
            $statement->execute([$publicReference, $values['projectType'], $values['propertyType'], $values['postcode'], $values['description'], $values['stage'], $budget, $values['start'], $values['contactName'], $email, $values['phone'], $preferred]);
            $quoteId = (int) $pdo->lastInsertId();
            $fileStatement = $pdo->prepare('INSERT INTO quote_request_files (quote_request_id, stored_filename, original_filename, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
            foreach ($stored as $file) {
                $fileStatement->execute([$quoteId, $file['stored'], $file['original'], $file['mime'], $file['size']]);
            }
            $pdo->commit();
            jsonResponse(['reference' => $publicReference, 'message' => 'Your quote request has been received.', 'files' => array_column($stored, 'original')], 201);
        } catch (Throwable $error) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            foreach ($stored as $file) {
                @unlink($directory . DIRECTORY_SEPARATOR . $file['stored']);
            }
            throw $error;
        }
    }

    if ($method === 'POST' && $route === '/admin/login') {
        rateLimit('admin-login', 10, 900, 'Too many sign-in attempts. Please wait and try again.');
        $input = requestData();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $pdo = database();
        bootstrapAdministrator($pdo);
        $statement = $pdo->prepare("SELECT id, password_hash FROM users WHERE email = ? AND is_active = TRUE AND role IN ('owner','admin','staff') LIMIT 1");
        $statement->execute([$email]);
        $user = $statement->fetch();
        // Unknown emails are still checked against a fixed hash so response timing does not reveal which accounts exist.
        $hash = $user ? (string) $user['password_hash'] : '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
        $passwordMatches = password_verify($password, $hash);
        if (!$user || !$passwordMatches || $password === '') {
            auditAuthentication($pdo, $user ? (int) $user['id'] : null, 'login_failed', $email);
            fail(401, 'Email or password is incorrect.');
        }
        createStaffSession($pdo, (int) $user['id']);
        auditAuthentication($pdo, (int) $user['id'], 'login_succeeded', $email);
        jsonResponse(['authenticated' => true]);
    }

    if ($method === 'GET' && $route === '/admin/session') {
        header('Cache-Control: no-store');
        $user = currentStaffUser();
        if ($user === null) {
            fail(401, 'Staff authentication required.');
        }
        jsonResponse(['authenticated' => true, 'user' => ['name' => $user['display_name'], 'email' => $user['email'], 'role' => $user['role']]]);
    }

    if ($route === '/admin/logout' && $method === 'POST') {
        // Always clear the browser cookie, even when the server-side session has already expired.
        sessionCookie('', time() - 3600);
        $token = sessionToken();
        if (preg_match('/^[a-f0-9]{64}$/', $token)) {
            $user = currentStaffUser();
            $pdo = database();
            $pdo->prepare('DELETE FROM staff_sessions WHERE token_hash = ?')->execute([hash('sha256', $token)]);
            if ($user !== null) {
                auditAuthentication($pdo, (int) $user['id'], 'logout', (string) $user['email']);
            }
        }
        http_response_code(204);
        exit;
    }

    if ($method === 'GET' && $route === '/admin/summary') {
        requireAdmin();
        $pdo = database();
        jsonResponse([
            'contacts' => (int) $pdo->query('SELECT COUNT(*) FROM contact_enquiries')->fetchColumn(),
            'quotes' => (int) $pdo->query('SELECT COUNT(*) FROM quote_requests')->fetchColumn(),
            'projects' => (int) $pdo->query("SELECT COUNT(*) FROM projects WHERE publication_status <> 'archived'")->fetchColumn(),
            'database' => 'configured',
        ]);
    }

    if ($method === 'GET' && $route === '/admin/projects') {
        requireAdmin();
        jsonResponse(['projects' => listProjects(true), 'database' => 'configured']);
    }

    if ($method === 'GET' && $route === '/admin/leads') {
        requireAdmin();
        $rows = database()->query('SELECT id, public_reference AS reference, name, email, telephone AS phone, preferred_contact_method AS preferredContact, message, source_page AS source, created_at AS createdAt FROM contact_enquiries ORDER BY created_at DESC, id DESC LIMIT 250')->fetchAll();
        jsonResponse(['records' => isoTimestamps($rows, ['createdAt'])]);
    }

    if ($method === 'GET' && $route === '/admin/quotes') {
        requireAdmin();
        $rows = database()->query('SELECT q.id, q.public_reference AS reference, q.project_type AS projectType, q.property_type AS propertyType, q.postcode, q.description, q.project_stage AS stage, q.budget_range AS budget, q.desired_start AS desiredStart, q.contact_name AS contactName, q.email, q.telephone AS phone, q.preferred_contact_method AS preferredContact, q.created_at AS createdAt, COUNT(f.id) AS fileCount FROM quote_requests q LEFT JOIN quote_request_files f ON f.quote_request_id = q.id GROUP BY q.id ORDER BY q.created_at DESC, q.id DESC LIMIT 250')->fetchAll();
        jsonResponse(['records' => isoTimestamps($rows, ['createdAt'])]);
    }

    $crmTables = [
        '/admin/site-visits' => ['crm_site_visits', 'scheduled_at'],
        '/admin/calendar' => ['crm_calendar_events', 'starts_at'],
        '/admin/tasks' => ['crm_tasks', 'created_at'],
        '/admin/invoices' => ['crm_invoices', 'created_at'],
    ];
    if ($method === 'GET' && isset($crmTables[$route])) {
        requireAdmin();
        [$table, $order] = $crmTables[$route];
        $rows = database()->query("SELECT * FROM `$table` ORDER BY `$order` DESC, id DESC LIMIT 250")->fetchAll();
        jsonResponse(['records' => isoTimestamps($rows, ['created_at', 'updated_at', $order])]);
    }

    if ($method === 'POST' && $route === '/admin/project-images') {
        requireAdmin();
        $files = normaliseFiles('images');
        if (!$files || count($files) > 8) {
            fail(400, 'Choose between 1 and 8 JPG, PNG or WebP images.');
        }
        $directory = uploadDirectory(true);
        $images = [];
        try {
            foreach ($files as $file) {
                $checked = checkedUpload($file, true);
                $name = bin2hex(random_bytes(16)) . '.' . $checked['extension'];
                if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $name)) {
                    fail(500, 'Upload storage is unavailable.');
                }
                $images[] = ['path' => '/uploads/projects/' . $name, 'originalName' => substr(basename($file['name']), 0, 180)];
            }
        } catch (Throwable $error) {
            foreach ($images as $image) {
                @unlink($directory . DIRECTORY_SEPARATOR . basename($image['path']));
            }
            throw $error;
        }
        jsonResponse(['images' => $images, 'message' => count($images) . ' project image' . (count($images) === 1 ? '' : 's') . ' uploaded.'], 201);
    }

    if ($method === 'POST' && $route === '/admin/projects') {
        requireAdmin();
        $project = saveProject(validateProject(requestData()));
        jsonResponse(['project' => $project], 201);
    }
    if ($method === 'PATCH' && preg_match('#^/admin/projects/(\d+)$#', $route, $matches)) {
        requireAdmin();
        $project = saveProject(validateProject(requestData()), (int) $matches[1]);
        jsonResponse(['project' => $project]);
    }
    if ($method === 'DELETE' && preg_match('#^/admin/projects/(\d+)$#', $route, $matches)) {
        requireAdmin();
        $statement = database()->prepare("UPDATE projects SET publication_status = 'archived' WHERE id = ?");
        $statement->execute([(int) $matches[1]]);
        if ($statement->rowCount() === 0) {
            fail(404, 'Project not found.');
        }
        jsonResponse(['message' => 'Project archived.']);
    }

    // Public quote signing (/sign/:token) and the cron endpoint (/cron/crm); no staff session.
    handleCrmSalesPublicRoute($method, $route);
    handleCrmRoute($method, $route);

    fail(404, 'Not found.');
} catch (DatabaseConfigurationError $error) {
    $message = str_starts_with($route, '/admin/')
        ? 'Staff access has not been configured.'
        : (in_array($route, ['/contact', '/quote'], true) ? "We couldn't send your enquiry, please call or email us." : 'The service is temporarily unavailable.');
    jsonResponse(['message' => $message], 503);
} catch (DatabaseUnavailableError | PDOException $error) {
    $message = str_starts_with($route, '/admin/')
        ? 'The staff system is temporarily unavailable. Please contact the administrator.'
        : (in_array($route, ['/contact', '/quote'], true) ? "We couldn't send your enquiry, please call or email us." : 'The service is temporarily unavailable.');
    jsonResponse(['message' => $message], 503);
} catch (ApiError $error) {
    jsonResponse(['message' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log('[omni-api] ' . get_class($error) . ': ' . $error->getMessage());
    $message = $route === '/admin/login' ? "We couldn't sign you in. Please try again." : 'The request could not be completed. Please try again.';
    jsonResponse(['message' => $message], 500);
}

