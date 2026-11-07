<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once dirname(__DIR__) . '/db.php';

// Redirect users who already have an active session.
function getDashboardPath(string $role): ?string
{
    switch (strtolower(trim($role))) {
     case 'admin':
    return '../Admin.php';
        case 'cashier':
            return '../Cashier.html';

        case 'bar':
            return '../Bar.html';

        default:
            return null;
    }
}

if (isLoggedIn()) {
    $dashboard = getDashboardPath(
        $_SESSION['user']['role'] ?? ''
    );

    if ($dashboard !== null) {
        header("Location: $dashboard");
        exit;
    }
}

// Generate CSRF token.
if (empty($_SESSION['login_csrf'])) {
    $_SESSION['login_csrf'] = bin2hex(random_bytes(32));
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $token = $_POST['csrf_token'] ?? '';

    if (
        !is_string($token) ||
        !hash_equals($_SESSION['login_csrf'], $token)
    ) {
        $error = 'Invalid request. Please refresh the page.';

    } else {

        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if ($username === '' || $password === '') {

            $error = 'Please enter your username and password.';

        } else {

            try {
                $stmt = $pdo->prepare("
                    SELECT
                        id,
                        full_name,
                        username,
                        password,
                        role,
                        branch_id,
                        status
                    FROM users
                    WHERE username = :username
                    LIMIT 1
                ");

                $stmt->execute([
                    'username' => $username
                ]);

                $user = $stmt->fetch();

                $validPassword =
                    is_array($user) &&
                    isset($user['password']) &&
                    password_verify(
                        $password,
                        $user['password']
                    );

                $isActive =
                    is_array($user) &&
                    strtolower(trim($user['status'])) === 'active';

                if (!$validPassword || !$isActive) {

                    $error = 'Invalid username or password.';

                } else {

                    $role = strtolower(trim($user['role']));
                    $dashboard = getDashboardPath($role);

                    if ($dashboard === null) {

                        $error = 'Your account role is not configured.';

                    } elseif (
                        $role !== 'admin' &&
                        ($user['branch_id'] === null ||
                         (int) $user['branch_id'] <= 0)
                    ) {

                        $error = 'Your account has no assigned branch.';

                    } else {

                        // Prevent session fixation.
                        session_regenerate_id(true);

                        // Store authenticated account information.
                        $_SESSION['user'] = [
                            'id' => (int) $user['id'],
                            'full_name' => $user['full_name'],
                            'username' => $user['username'],
                            'role' => $user['role'],
                            'branch_id' => $user['branch_id'] === null
                                ? null
                                : (int) $user['branch_id']
                        ];

                        unset($_SESSION['login_csrf']);

                        header("Location: $dashboard");
                        exit;
                    }
                }

            } catch (PDOException $e) {

                error_log('Login error: ' . $e->getMessage());

                $error = 'Unable to process login. Please try again.';
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Login | Psalm 23:5 Coffee</title>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at top, #244b39, transparent 55%),
                #101c16;
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            padding: 42px;
            background: #f2e9dc;
            border-radius: 18px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .brand {
            text-align: center;
            margin-bottom: 32px;
        }

        .brand h1 {
            color: #0c3327;
            font-size: 27px;
            margin-bottom: 8px;
        }

        .brand p {
            color: #756b5c;
            font-size: 13px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #1a100c;
            font-size: 14px;
            font-weight: bold;
        }

        input {
            width: 100%;
            padding: 14px;
            border: 1px solid #d3c4ae;
            border-radius: 9px;
            background: #fffdf9;
            outline: none;
            font-size: 14px;
        }

        input:focus {
            border-color: #0c6245;
            box-shadow: 0 0 0 3px rgba(12, 98, 69, 0.12);
        }

        button {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 9px;
            background: #0c3327;
            color: white;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
        }

        button:hover {
            background: #164b38;
        }

        .error {
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 8px;
            color: #9b2525;
            background: #f8dddd;
            font-size: 13px;
        }

        .footer {
            margin-top: 25px;
            text-align: center;
            color: #897d6b;
            font-size: 11px;
        }
    </style>
</head>

<body>

    <main class="login-card">

        <div class="brand">
            <h1>Psalm 23:5</h1>
            <p>Centralized Coffee Management System</p>
        </div>

        <?php if ($error !== ''): ?>
            <div class="error" role="alert">
                <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
            </div>
        <?php endif; ?>

        <form method="POST">

            <input
                type="hidden"
                name="csrf_token"
                value="<?= htmlspecialchars($_SESSION['login_csrf'], ENT_QUOTES, 'UTF-8') ?>"
            >

            <div class="form-group">
                <label for="username">Username</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    autocomplete="username"
                    required
                >
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    autocomplete="current-password"
                    required
                >
            </div>

            <button type="submit">Sign In</button>

        </form>

        <div class="footer">
            All Glory to God
        </div>

    </main>

</body>
</html>