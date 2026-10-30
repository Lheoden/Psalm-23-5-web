<?php

$host = '127.0.0.1';
$dbname = 'psalm235_coffee';
$username = 'root';
$password = ''; // Default XAMPP setup

$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO(
        $dsn,
        $username,
        $password,
        $options
    );
} catch (PDOException $e) {
    error_log($e->getMessage());

    http_response_code(500);
    exit('Database connection failed. Check MySQL and db.php settings.');
}