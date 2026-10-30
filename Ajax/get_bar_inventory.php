
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';

function respond($status, $data) {
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

$branchId = filter_input(
    INPUT_GET,
    'branch_id',
    FILTER_VALIDATE_INT
);

if ($branchId === false || $branchId === null || $branchId < 1) {
    respond(400, [
        'success' => false,
        'message' => 'A valid branch_id is required.'
    ]);
}

try {
    $sql = "
        SELECT
            id,
            ingredient_name,
            container_type,
            stock_quantity,
            serving_count,
            servings_used,
            unit,
            low_stock_threshold,
            last_counted_at
        FROM ingredients
        WHERE branch_id = :branch_id
        ORDER BY ingredient_name
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['branch_id' => $branchId]);

    $ingredients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond(200, [
        'success' => true,
        'branch_id' => $branchId,
        'count' => count($ingredients),
        'ingredients' => $ingredients
    ]);

} catch (Throwable $e) {
    error_log('get_bar_inventory.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to retrieve inventory.'
    ]);
}
