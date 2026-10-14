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
function loadConfig(): array
{
    $defaults = [
        'APP_URL' => '',
        'DATABASE_HOST' => '',
        'DATABASE_PORT' => '3306',
        'DATABASE_NAME' => '',
        'DATABASE_USER' => '',
        'DATABASE_PASSWORD' => '',
        'COOKIE_SECURE' => 'true',
        'STAGING_MODE' => 'false',
        'PUBLIC_PHONE' => '07928 149 731',
        'PUBLIC_EMAIL' => 'admin@omnidevelopment.co.uk',
        'PUBLIC_WHATSAPP' => 'https://wa.me/447928149731',
        'UPLOAD_DIR' => '',
        'PROJECT_UPLOAD_DIR' => '',
    ];
    $localFile = __DIR__ . '/config.local.php';
    $local = is_file($localFile) ? require $localFile : [];
    if (!is_array($local)) {
        throw new RuntimeException('config.local.php must return an array.');
    }
    foreach ($defaults as $key => $value) {
        $environment = getenv($key);
        if ($environment !== false && $environment !== '') {
            $defaults[$key] = $environment;
        } elseif (array_key_exists($key, $local) && $local[$key] !== '') {
            $defaults[$key] = (string) $local[$key];
        }
    }
    return $defaults;
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
            fail(503, "We couldn't send your enquiry, please call or email us.");
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
        return $pdo;
    } catch (PDOException $error) {
        error_log('[database] connection failed: ' . $error->getCode());
        fail(503, "We couldn't send your enquiry, please call or email us.");
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

function rateLimit(string $bucket, int $limit, int $windowSeconds): void
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
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
            fail(429, 'Too many requests from this network. Please try again shortly.');
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

function requireAdmin(): void
{
    if (empty($_SESSION['omni_admin_id']) || empty($_SESSION['omni_admin_expires']) || (int) $_SESSION['omni_admin_expires'] < time()) {
        fail(401, 'Staff authentication required.');
    }
    $_SESSION['omni_admin_expires'] = time() + 28800;
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
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/api'), PHP_URL_PATH) ?: '/api';
    $position = strpos($path, '/api');
    return $position === false ? '/' : ('/' . ltrim(substr($path, $position + 4), '/'));
}

ini_set('display_errors', '0');
ini_set('session.gc_maxlifetime', '28800');
ini_set('session.use_strict_mode', '1');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
if (flag('STAGING_MODE')) {
    header('X-Robots-Tag: noindex, nofollow, noarchive');
}
session_name('omni_staff_session');
session_set_cookie_params([
    'lifetime' => 28800,
    'path' => '/',
    'secure' => flag('COOKIE_SECURE'),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

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
            foreach (['users', 'projects', 'contact_enquiries', 'quote_requests', 'quote_request_files'] as $table) {
                $pdo->query("SELECT 1 FROM `$table` LIMIT 0");
            }
            jsonResponse(['status' => 'ok', 'service' => 'omni-development-site-php', 'timestamp' => date(DATE_ATOM), 'database' => 'connected']);
        } catch (Throwable $error) {
            jsonResponse(['status' => 'degraded', 'service' => 'omni-development-site-php', 'timestamp' => date(DATE_ATOM), 'database' => 'unavailable'], 503);
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
        rateLimit('admin-login', 10, 900);
        $input = requestData();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $statement = database()->prepare("SELECT id, password_hash FROM users WHERE email = ? AND is_active = TRUE LIMIT 1");
        $statement->execute([$email]);
        $user = $statement->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            fail(401, 'The email or password was not recognised.');
        }
        session_regenerate_id(true);
        $_SESSION['omni_admin_id'] = (int) $user['id'];
        $_SESSION['omni_admin_expires'] = time() + 28800;
        jsonResponse(['authenticated' => true]);
    }

    if ($route === '/admin/logout' && $method === 'POST') {
        requireAdmin();
        $_SESSION = [];
        session_destroy();
        http_response_code(204);
        exit;
    }

    if ($method === 'GET' && $route === '/admin/summary') {
        requireAdmin();
        $pdo = database();
        jsonResponse([
            'contacts' => (int) $pdo->query('SELECT COUNT(*) FROM contact_enquiries')->fetchColumn(),
            'quotes' => (int) $pdo->query('SELECT COUNT(*) FROM quote_requests')->fetchColumn(),
            'database' => 'configured',
        ]);
    }

    if ($method === 'GET' && $route === '/admin/projects') {
        requireAdmin();
        jsonResponse(['projects' => listProjects(true), 'database' => 'configured']);
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

    fail(404, 'Not found.');
} catch (ApiError $error) {
    jsonResponse(['message' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log('[omni-api] ' . get_class($error) . ': ' . $error->getMessage());
    jsonResponse(['message' => 'The request could not be completed. Please try again.'], 500);
}

