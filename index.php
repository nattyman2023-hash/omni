<?php
// One-time helper: copies api/config.local.php to ../omni-crm-config.php (outside public_html)
// so CRM deploys can never delete the live settings. Never outputs file contents. Self-deletes.
declare(strict_types=1);
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
$token = 'd176431f8beabc62b5ac4ef417646d2740285d74';
if (!hash_equals($token, (string) ($_GET['t'] ?? ''))) { http_response_code(404); echo '{}'; exit; }
$src = dirname(__DIR__) . '/api/config.local.php';
$dst = dirname(__DIR__, 2) . '/omni-crm-config.php';
$result = ['sourceExists' => is_file($src), 'targetExistedBefore' => is_file($dst), 'copied' => false];
if ($result['sourceExists'] && !$result['targetExistedBefore']) {
    $result['copied'] = copy($src, $dst);
    if ($result['copied']) { @chmod($dst, 0640); }
}
$result['targetExists'] = is_file($dst);
$result['identical'] = $result['sourceExists'] && $result['targetExists'] && hash_file('sha256', $src) === hash_file('sha256', $dst);
$result['targetBytes'] = $result['targetExists'] ? filesize($dst) : 0;
$loaded = $result['targetExists'] ? (static fn (string $f) => require $f)($dst) : null;
$result['targetReturnsArray'] = is_array($loaded);
$result['targetHasDatabaseName'] = is_array($loaded) && !empty($loaded['DATABASE_NAME']);
$result['targetPath'] = basename(dirname($dst)) . '/' . basename($dst);
if ($result['identical'] && $result['targetReturnsArray'] && (($_GET['keep'] ?? '') !== '1')) {
    $result['helperDeleted'] = @unlink(__FILE__);
}
echo json_encode($result, JSON_UNESCAPED_SLASHES);
