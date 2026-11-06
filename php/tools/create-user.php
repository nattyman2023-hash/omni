<?php

declare(strict_types=1);

/**
 * Creates or resets one staff account from the command line.
 *
 *   php php/tools/create-user.php --email=admin@omnidevelopment.co.uk --password='OmniDemo2026!' --name='Omni Owner' --role=owner
 *   php php/tools/create-user.php --list
 *
 * Runs over the CLI SAPI only, reads the same php/api/config.local.php as the API,
 * hashes with PASSWORD_BCRYPT and never echoes the password back. Re-running with an
 * existing email resets that account instead of creating a duplicate.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("Not found.\n");
}

$configFile = dirname(__DIR__) . '/api/config.local.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "config.local.php was not found at php/api/config.local.php\n");
    exit(1);
}
$config = require $configFile;
if (!is_array($config)) {
    fwrite(STDERR, "config.local.php must return an array.\n");
    exit(1);
}

function configValue(array $config, string $key): string
{
    $environment = getenv($key);
    if ($environment !== false && $environment !== '') {
        return (string) $environment;
    }
    return isset($config[$key]) ? (string) $config[$key] : '';
}

function connect(array $config): PDO
{
    foreach (['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'] as $key) {
        if (configValue($config, $key) === '') {
            fwrite(STDERR, "Database setting {$key} is empty.\n");
            exit(1);
        }
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        configValue($config, 'DATABASE_HOST'),
        (int) (configValue($config, 'DATABASE_PORT') ?: '3306'),
        configValue($config, 'DATABASE_NAME')
    );
    return new PDO($dsn, configValue($config, 'DATABASE_USER'), configValue($config, 'DATABASE_PASSWORD'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

$options = getopt('', ['email:', 'password:', 'name::', 'role::', 'list']);

try {
    $pdo = connect($config);

    if (isset($options['list'])) {
        $rows = $pdo->query('SELECT email, display_name, role, is_active FROM users ORDER BY id')->fetchAll();
        if ($rows === []) {
            fwrite(STDOUT, "No staff accounts exist yet.\n");
            exit(0);
        }
        foreach ($rows as $row) {
            printf("%-38s %-22s %-6s %s\n", $row['email'], $row['display_name'], $row['role'], $row['is_active'] ? 'active' : 'disabled');
        }
        exit(0);
    }

    $email = strtolower(trim((string) ($options['email'] ?? '')));
    $password = (string) ($options['password'] ?? '');
    $name = trim((string) ($options['name'] ?? '')) ?: 'Omni Staff';
    $role = strtolower(trim((string) ($options['role'] ?? 'staff')));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fwrite(STDERR, "A valid --email is required.\n");
        exit(1);
    }
    if (strlen($password) < 12) {
        fwrite(STDERR, "The password must be at least 12 characters (the API enforces the same rule).\n");
        exit(1);
    }
    if (!in_array($role, ['owner', 'admin', 'staff'], true)) {
        fwrite(STDERR, "The role must be owner, admin or staff.\n");
        exit(1);
    }

    $statement = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $existingId = $statement->fetchColumn();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    if ($existingId !== false) {
        $update = $pdo->prepare('UPDATE users SET password_hash = ?, display_name = ?, role = ?, is_active = TRUE WHERE id = ?');
        $update->execute([$hash, substr($name, 0, 120), $role, (int) $existingId]);
        printf("Updated %s (%s) — password reset.\n", $email, $role);
    } else {
        $insert = $pdo->prepare('INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, TRUE)');
        $insert->execute([$email, $hash, substr($name, 0, 120), $role]);
        printf("Created %s (%s).\n", $email, $role);
    }
    fwrite(STDOUT, "Sign in at /staff/login. Delete or rotate this account before real customer data is entered.\n");
    exit(0);
} catch (PDOException $error) {
    fwrite(STDERR, 'Database error: ' . $error->getMessage() . "\n");
    exit(1);
}
