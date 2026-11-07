<?php
declare(strict_types=1);

// Start a secure PHP session.
if (session_status() !== PHP_SESSION_ACTIVE) {

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/Psalm235/',
        'secure' => !empty($_SERVER['HTTPS']) &&
                    $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}


// Check if a user is logged in.
function isLoggedIn(): bool
{
    return isset($_SESSION['user']['id']);
}


// Get the currently logged-in user's information.
function currentUser(): ?array
{
    if (!isLoggedIn()) {
        return null;
    }

    return $_SESSION['user'];
}


// Require the user to log in before accessing a page.
function requireLogin(): void
{
    if (!isLoggedIn()) {
        header('Location: /Psalm235/Auth/Login.php');
        exit;
    }
}


// Restrict access based on account role.
function requireRole(array $allowedRoles): void
{
    requireLogin();

    $userRole = strtolower(
        trim($_SESSION['user']['role'] ?? '')
    );

    $allowedRoles = array_map(
        'strtolower',
        $allowedRoles
    );

    if (!in_array($userRole, $allowedRoles, true)) {
        http_response_code(403);
        exit('Access denied. You do not have permission to access this page.');
    }
}

function getLogoutCsrfToken(): string
{
    if (empty($_SESSION['logout_csrf'])) {
        $_SESSION['logout_csrf'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['logout_csrf'];
}