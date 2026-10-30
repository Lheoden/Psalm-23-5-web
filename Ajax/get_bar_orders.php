
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
            o.id AS order_id,
            o.order_number,
            o.order_date,
            o.branch_id,
            o.order_type,
            o.order_status,
            o.total_amount,
            o.payment_method,
            o.amount_paid,
            o.change_amount,
            o.paid_at,
            o.preparation_started_at,
            o.ready_at,
            o.created_at,
            oi.id AS order_item_id,
            oi.product_id,
            oi.product_name,
            oi.unit_price,
            oi.quantity,
            oi.size,
            oi.temperature,
            oi.sugar_percent,
            oi.subtotal
        FROM orders o
        LEFT JOIN order_items oi
            ON oi.order_id = o.id
        WHERE o.branch_id = :branch_id
          AND o.order_status IN ('PAID', 'PREPARING')
        ORDER BY o.created_at ASC, oi.id ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['branch_id' => $branchId]);

    $orders = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $id = (int) $row['order_id'];

        if (!isset($orders[$id])) {
            $orders[$id] = [
                'id' => $id,
                'number' => $row['order_number'],
                'status' => $row['order_status'],
                'timestamp' => $row['created_at'] ?: $row['order_date'],
                'paidAt' => $row['paid_at'],
                'startedAt' => $row['preparation_started_at'],
                'readyAt' => $row['ready_at'],
                'type' => $row['order_type'],
                'payment' => $row['payment_method'] ?: 'Cash',
                'paidAmount' => (float) ($row['amount_paid'] ?? 0),
                'change' => (float) ($row['change_amount'] ?? 0),
                'total' => (float) $row['total_amount'],
                'items' => []
            ];
        }

        if ($row['order_item_id'] !== null) {
            $orders[$id]['items'][] = [
                'id' => (int) $row['product_id'],
                'name' => $row['product_name'],
                'qty' => (int) $row['quantity'],
                'price' => (float) $row['unit_price'],
                'size' => $row['size'] ?: '-',
                'temp' => $row['temperature'] ?: '-',
                'sugar' => $row['sugar_percent'] !== null
                    ? ((int) $row['sugar_percent']) . '%'
                    : '-',
                'subtotal' => (float) $row['subtotal']
            ];
        }
    }

    respond(200, [
        'success' => true,
        'branch_id' => $branchId,
        'count' => count($orders),
        'orders' => array_values($orders)
    ]);

} catch (Throwable $e) {
    error_log('get_bar_orders.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to retrieve Bar orders.'
    ]);
}
