<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';

// Get the branch ID from the request.
$branchId = filter_input(
    INPUT_GET,
    'branch_id',
    FILTER_VALIDATE_INT
);

// Require a valid branch ID.
if ($branchId === false || $branchId === null || $branchId < 1) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => 'A valid branch_id is required.'
    ]);

    exit;
}

try {
    // Fetch products belonging to the selected branch.
    $sql = "
        SELECT
            id,
            product_name,
            category,
            description,
            price,
            tag,
            mood_tags,
            bible_verse,
            image_url,
            requires_customization,
            availability,
            branch_id
        FROM products
        WHERE branch_id = :branch_id
        ORDER BY category, product_name
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        'branch_id' => $branchId
    ]);

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'branch_id' => $branchId,
        'count' => count($products),
        'products' => $products
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    error_log('get_products.php: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Unable to load products.'
    ]);
}