<?php

require_once __DIR__ . '/auth.php';

// Only allow POST requests.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method not allowed.');
}

// Validate the logout CSRF token.
$submittedToken = $_POST['csrf_token'] ?? '';
$sessionToken = $_SESSION['logout_csrf'] ?? '';

if (
    !is_string($submittedToken) ||
    !is_string($sessionToken) ||
    $sessionToken === '' ||
    !hash_equals($sessionToken, $submittedToken)
) {
    http_response_code(403);
    exit('Invalid logout request.');
}

// Clear session data.
$_SESSION = [];

// Remove the session cookie.
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();

    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?? 'Lax'
    ]);
}

// Destroy the session.
session_destroy();

// Return to login page.
header('Location: Login.php?logged_out=1');
exit;