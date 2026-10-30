<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Manila');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/pricing_helper.php';

function respond($status, $data)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
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

$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
$branchId = filter_var($input['branch_id'] ?? null, FILTER_VALIDATE_INT);
$expectedFinalAmount = filter_var(
    $input['expected_final_amount'] ?? null,
    FILTER_VALIDATE_INT
);
$category = $input['customer_category'] ?? null;
$paymentMethod = $input['payment_method'] ?? null;
$validCategories = [
    'Regular',
    'Student',
    'PWD',
    'Senior Citizen',
    'Owner'
];
$validMethods = ['Cash', 'GCash', 'None'];

if (
    $orderId === false || $orderId < 1 ||
    $branchId === false || $branchId < 1
) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid order or branch ID.'
    ]);
}

if (!in_array($category, $validCategories, true)) {
    respond(400, [
        'success' => false,
        'message' => 'Select a valid customer category.'
    ]);
}

if (!in_array($paymentMethod, $validMethods, true)) {
    respond(422, [
        'success' => false,
        'message' => 'Select Cash or GCash.'
    ]);
}

if ($expectedFinalAmount === false || $expectedFinalAmount < 0) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid expected final amount in centavos.'
    ]);
}

$transactionStarted = false;

try {
    $pdo->beginTransaction();
    $transactionStarted = true;

    $orderQuery = $pdo->prepare(
        "SELECT id, order_number, branch_id, order_type, order_status
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
        $transactionStarted = false;
        respond(404, [
            'success' => false,
            'message' => 'Order not found for this branch.'
        ]);
    }

    if ($order['order_status'] !== 'UNPAID') {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(409, [
            'success' => false,
            'message' => 'This order is no longer unpaid.'
        ]);
    }

    $itemsQuery = $pdo->prepare(
        "SELECT product_name, quantity, unit_price, size, temperature,
                sugar_percent
         FROM order_items
         WHERE order_id = :order_id
         ORDER BY id ASC"
    );
    $itemsQuery->execute(['order_id' => $orderId]);
    $items = $itemsQuery->fetchAll(PDO::FETCH_ASSOC);

    if ($items === []) {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(422, [
            'success' => false,
            'message' => 'Cannot accept payment for an order with no items.'
        ]);
    }

    try {
        $pricing = compute_order_pricing($items, $category);
    } catch (InvalidArgumentException $e) {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(422, [
            'success' => false,
            'message' => 'This order contains an invalid quantity or price.'
        ]);
    }

    if ($pricing['subtotal_cents'] <= 0) {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(422, [
            'success' => false,
            'message' => 'Cannot accept payment for an order with a zero subtotal.'
        ]);
    }

    if ($expectedFinalAmount !== $pricing['final_cents']) {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(409, [
            'success' => false,
            'message' => 'The order total changed. Review the recalculated amount before paying.',
            'expected_final_amount' => $pricing['final_cents']
        ]);
    }

    $finalCents = $pricing['final_cents'];
    $receivedCents = 0;
    $changeCents = 0;
    $gcashReference = null;
    $storedPaymentMethod = $paymentMethod;

    if ($finalCents === 0) {
        if ($category !== 'Owner' || $paymentMethod !== 'None') {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'Zero-payment orders are allowed only for Owner transactions.'
            ]);
        }

        $storedPaymentMethod = 'Complimentary';
        $receivedInput = $input['amount_received'] ?? 0;
        $receivedCents = filter_var($receivedInput, FILTER_VALIDATE_INT);
        if ($receivedCents === false || $receivedCents !== 0) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'Complimentary transactions must record zero amount received.'
            ]);
        }
    } elseif ($paymentMethod === 'Cash') {
        $receivedCents = filter_var(
            $input['amount_received'] ?? null,
            FILTER_VALIDATE_INT
        );
        if ($receivedCents === false || $receivedCents < $finalCents) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'Amount received must cover the final payable amount.'
            ]);
        }
        $changeCents = $receivedCents - $finalCents;
    } elseif ($paymentMethod === 'GCash') {
        $rawReference = $input['gcash_reference'] ?? '';
        if (!is_string($rawReference)) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'Enter a valid GCash reference number.'
            ]);
        }
        $gcashReference = preg_replace('/\s+/', '', $rawReference);

        if (
            !is_string($gcashReference) ||
            !preg_match('/^[A-Za-z0-9]{8,20}$/', $gcashReference)
        ) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'GCash reference must contain 8–20 letters or numbers.'
            ]);
        }

        if (($input['payment_verified'] ?? null) !== true) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(422, [
                'success' => false,
                'message' => 'Confirm that the exact GCash payment was checked in the merchant account.'
            ]);
        }

        $referenceQuery = $pdo->prepare(
            "SELECT id
             FROM orders
             WHERE gcash_reference = :gcash_reference
               AND id <> :order_id
             LIMIT 1"
        );
        $referenceQuery->execute([
            'gcash_reference' => $gcashReference,
            'order_id' => $orderId
        ]);
        if ($referenceQuery->fetchColumn()) {
            $pdo->rollBack();
            $transactionStarted = false;
            respond(409, [
                'success' => false,
                'message' => 'This GCash reference number has already been used.'
            ]);
        }

        $receivedCents = $finalCents;
        $changeCents = 0;
    } else {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(422, [
            'success' => false,
            'message' => 'Select Cash or GCash for a payable order.'
        ]);
    }

    $paidAt = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
    $paidAtDatabase = $paidAt->format('Y-m-d H:i:s');

    // total_amount now stores the final payable amount.
    $updateQuery = $pdo->prepare(
        "UPDATE orders
         SET order_status = 'PAID',
             customer_category = :customer_category,
             subtotal_amount = :subtotal_amount,
             vat_adjustment_amount = :vat_adjustment_amount,
             discount_rate = :discount_rate,
             discount_amount = :discount_amount,
             total_amount = :total_amount,
             payment_method = :payment_method,
             gcash_reference = :gcash_reference,
             amount_paid = :amount_paid,
             change_amount = :change_amount,
             paid_at = :paid_at
         WHERE id = :order_id
           AND branch_id = :branch_id
           AND order_status = 'UNPAID'"
    );
    $updateQuery->execute([
        'customer_category' => $category,
        'subtotal_amount' => cents_to_decimal($pricing['subtotal_cents']),
        'vat_adjustment_amount' => cents_to_decimal($pricing['vat_adjustment_cents']),
        'discount_rate' => number_format($pricing['discount_rate_bp'] / 10000, 4, '.', ''),
        'discount_amount' => cents_to_decimal($pricing['discount_cents']),
        'total_amount' => cents_to_decimal($finalCents),
        'payment_method' => $storedPaymentMethod,
        'gcash_reference' => $gcashReference,
        'amount_paid' => cents_to_decimal($receivedCents),
        'change_amount' => cents_to_decimal($changeCents),
        'paid_at' => $paidAtDatabase,
        'order_id' => $orderId,
        'branch_id' => $branchId
    ]);

    if ($updateQuery->rowCount() !== 1) {
        $pdo->rollBack();
        $transactionStarted = false;
        respond(409, [
            'success' => false,
            'message' => 'Payment was not recorded. Reload the order and try again.'
        ]);
    }

    $branchQuery = $pdo->prepare(
        'SELECT branch_name FROM branches WHERE id = :branch_id LIMIT 1'
    );
    $branchQuery->execute(['branch_id' => $branchId]);
    $branchName = $branchQuery->fetchColumn();

    if ($branchName === false) {
        throw new RuntimeException('Branch disappeared while completing payment.');
    }

    $pdo->commit();
    $transactionStarted = false;

    respond(200, [
        'success' => true,
        'order_id' => (int) $order['id'],
        'order_number' => $order['order_number'],
        'order_status' => 'PAID',
        'branch_name' => $branchName,
        'order_type' => $order['order_type'],
        'items' => array_map(
            static function (array $item): array {
                $unitPriceCents = pricing_amount_to_cents($item['unit_price']);
                $quantity = (int) $item['quantity'];

                return [
                    'name' => $item['product_name'],
                    'quantity' => $quantity,
                    'unit_price' => cents_to_decimal($unitPriceCents),
                    'line_total' => cents_to_decimal($quantity * $unitPriceCents),
                    'size' => $item['size'],
                    'temperature' => $item['temperature'],
                    'sugar_percent' => $item['sugar_percent']
                ];
            },
            $items
        ),
        'customer_category' => $category,
        'payment_method' => $storedPaymentMethod,
        'gcash_reference' => $gcashReference,
        'subtotal_amount' => cents_to_decimal($pricing['subtotal_cents']),
        'vat_adjustment_amount' => cents_to_decimal($pricing['vat_adjustment_cents']),
        'discount_rate' => number_format($pricing['discount_rate_bp'] / 10000, 4, '.', ''),
        'discount_amount' => cents_to_decimal($pricing['discount_cents']),
        'total_amount' => cents_to_decimal($finalCents),
        'amount_paid' => cents_to_decimal($receivedCents),
        'change_amount' => cents_to_decimal($changeCents),
        'paid_at' => $paidAt->format(DateTimeInterface::ATOM)
    ]);
} catch (PDOException $e) {
    if ($transactionStarted && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (($e->errorInfo[1] ?? null) === 1062) {
        respond(409, [
            'success' => false,
            'message' => 'This GCash reference number has already been used.'
        ]);
    }

    error_log('mark_paid.php: ' . $e->getMessage());
    respond(500, [
        'success' => false,
        'message' => 'Unable to record payment.'
    ]);
} catch (Throwable $e) {
    if ($transactionStarted && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('mark_paid.php: ' . $e->getMessage());
    respond(500, [
        'success' => false,
        'message' => 'Unable to record payment.'
    ]);
}
