
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'POST method required.'
    ]);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid JSON request.'
    ]);
}

$orderId = filter_var(
    $input['order_id'] ?? null,
    FILTER_VALIDATE_INT
);

$branchId = filter_var(
    $input['branch_id'] ?? null,
    FILTER_VALIDATE_INT
);

$action = $input['action'] ?? '';

if (!$orderId || $orderId < 1 || !$branchId || $branchId < 1) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid order ID or branch ID.'
    ]);
}

// Only enable Start Preparing for this step.
// READY will be connected after inventory deduction is handled.
if ($action !== 'start_preparing') {
    respond(400, [
        'success' => false,
        'message' => 'Unsupported action. Only start_preparing is enabled.'
    ]);
}

try {
    $pdo->beginTransaction();

    $orderQuery = $pdo->prepare(
        "SELECT id, order_number, order_status
         FROM orders
         WHERE id = :order_id
           AND branch_id = :branch_id
         LIMIT 1
         FOR UPDATE"
    );

    $orderQuery->execute([
        'order_id' => $orderId,
        'branch_id' => $branchId
    ]);

    $order = $orderQuery->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        $pdo->rollBack();

        respond(404, [
            'success' => false,
            'message' => 'Order not found for this branch.'
        ]);
    }

    if ($order['order_status'] !== 'PAID') {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'Only PAID orders can start preparation.'
        ]);
    }

    $itemsQuery = $pdo->prepare(
        "SELECT COUNT(*)
         FROM order_items
         WHERE order_id = :order_id"
    );

    $itemsQuery->execute(['order_id' => $orderId]);

    if ((int) $itemsQuery->fetchColumn() < 1) {
        $pdo->rollBack();

        respond(422, [
            'success' => false,
            'message' => 'Cannot prepare an order with no items.'
        ]);
    }

    $updateQuery = $pdo->prepare(
        "UPDATE orders
         SET order_status = 'PREPARING',
             preparation_started_at = NOW()
         WHERE id = :order_id
           AND branch_id = :branch_id
           AND order_status = 'PAID'"
    );

    $updateQuery->execute([
        'order_id' => $orderId,
        'branch_id' => $branchId
    ]);

    if ($updateQuery->rowCount() !== 1) {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'Order status was not changed. Refresh the queue.'
        ]);
    }

    $pdo->commit();

    respond(200, [
        'success' => true,
        'message' => 'Preparation started.',
        'order_id' => (int) $order['id'],
        'order_number' => $order['order_number'],
        'previous_status' => 'PAID',
        'order_status' => 'PREPARING'
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('update_bar_status.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to update order status.'
    ]);
}
