
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';

function respond($status, $data) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
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
        'message' => 'Invalid request data.'
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

$receivedInput = $input['amount_received'] ?? null;

if (!$orderId || $orderId < 1 || !$branchId || $branchId < 1) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid order or branch ID.'
    ]);
}

if (
    !is_numeric($receivedInput) ||
    !is_finite((float) $receivedInput) ||
    (float) $receivedInput < 0
) {
    respond(400, [
        'success' => false,
        'message' => 'Enter a valid amount received.'
    ]);
}

$amountReceived = round((float) $receivedInput, 2);

try {
    $pdo->beginTransaction();

    // Lock the selected order while validating payment.
    $orderQuery = $pdo->prepare(
        "SELECT id, order_number, branch_id, order_status
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

    if ($order['order_status'] !== 'UNPAID') {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'This order is no longer unpaid.'
        ]);
    }

    // Calculate the payable total from database order items.
    $itemsQuery = $pdo->prepare(
        "SELECT
            COUNT(*) AS item_count,
            COALESCE(SUM(subtotal), 0) AS items_total
         FROM order_items
         WHERE order_id = :order_id"
    );

    $itemsQuery->execute(['order_id' => $orderId]);
    $itemsData = $itemsQuery->fetch(PDO::FETCH_ASSOC);

    if ((int) $itemsData['item_count'] < 1) {
        $pdo->rollBack();

        respond(422, [
            'success' => false,
            'message' => 'Cannot accept payment for an order with no items.'
        ]);
    }

    $total = round((float) $itemsData['items_total'], 2);

    if ($amountReceived < $total) {
        $pdo->rollBack();

        respond(422, [
            'success' => false,
            'message' => 'Amount received must be at least ' .
                number_format($total, 2, '.', '') . '.'
        ]);
    }

    $change = round($amountReceived - $total, 2);

    // This prototype currently processes cash payments only.
    $updateQuery = $pdo->prepare(
        "UPDATE orders
         SET total_amount = :total_amount,
             order_status = 'PAID',
             payment_method = 'Cash',
             amount_paid = :amount_paid,
             change_amount = :change_amount,
             paid_at = NOW()
         WHERE id = :order_id
           AND branch_id = :branch_id
           AND order_status = 'UNPAID'"
    );

    $updateQuery->execute([
        'total_amount' => $total,
        'amount_paid' => $amountReceived,
        'change_amount' => $change,
        'order_id' => $orderId,
        'branch_id' => $branchId
    ]);

    if ($updateQuery->rowCount() !== 1) {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'Payment was not recorded. Reload the order and try again.'
        ]);
    }

    $pdo->commit();

    respond(200, [
        'success' => true,
        'message' => 'Payment recorded successfully.',
        'order_id' => (int) $order['id'],
        'order_number' => $order['order_number'],
        'order_status' => 'PAID',
        'payment_method' => 'Cash',
        'total_amount' => $total,
        'amount_paid' => $amountReceived,
        'change_amount' => $change
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('mark_paid.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to record payment. Check the PHP error log.'
    ]);
}
