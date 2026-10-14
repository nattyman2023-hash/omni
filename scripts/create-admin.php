<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$email = strtolower(trim((string) ($argv[1] ?? '')));
$password = (string) ($argv[2] ?? '');
$name = trim((string) ($argv[3] ?? 'Omni Administrator'));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Usage: php scripts/create-admin.php email@example.com 'password-at-least-12-chars' ['Display Name']\n");
    exit(1);
}

$configFile = dirname(__DIR__) . '/api/config.local.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "Create api/config.local.php from api/config.example.php first.\n");
    exit(1);
}
$config = require $configFile;
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['DATABASE_HOST'], (int) ($config['DATABASE_PORT'] ?? 3306), $config['DATABASE_NAME']);
$pdo = new PDO($dsn, $config['DATABASE_USER'], $config['DATABASE_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$statement = $pdo->prepare("INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, 'owner', TRUE) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), display_name = VALUES(display_name), is_active = TRUE");
$statement->execute([$email, password_hash($password, PASSWORD_BCRYPT), substr($name, 0, 120)]);
fwrite(STDOUT, "Administrator created or updated.\n");
