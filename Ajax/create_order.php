
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
        'message' => 'Invalid JSON request.'
    ]);
}

$branchId = filter_var(
    $input['branch_id'] ?? null,
    FILTER_VALIDATE_INT
);

$orderType = $input['order_type'] ?? '';
$items = $input['items'] ?? [];

if (!$branchId || $branchId < 1) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid branch.'
    ]);
}

if (!in_array($orderType, ['Dine-in', 'Take-out'], true)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid order type.'
    ]);
}

if (!is_array($items) || count($items) < 1) {
    respond(400, [
        'success' => false,
        'message' => 'The order has no items.'
    ]);
}

try {
    // Validate products and calculate prices using MySQL.
    // Do not trust prices sent by the browser.
    $productQuery = $pdo->prepare(
        "SELECT id, product_name, price, availability
         FROM products
         WHERE id = :product_id
           AND branch_id = :branch_id
         LIMIT 1"
    );

    $validatedItems = [];
    $totalAmount = 0;

    foreach ($items as $item) {
        if (!is_array($item)) {
            respond(400, [
                'success' => false,
                'message' => 'Invalid order item.'
            ]);
        }

        $productId = filter_var(
            $item['product_id'] ?? null,
            FILTER_VALIDATE_INT
        );

        $quantity = filter_var(
            $item['quantity'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (
            !$productId || $productId < 1 ||
            !$quantity || $quantity < 1 || $quantity > 99
        ) {
            respond(400, [
                'success' => false,
                'message' => 'Invalid product or quantity.'
            ]);
        }

        $productQuery->execute([
            'product_id' => $productId,
            'branch_id' => $branchId
        ]);

        $product = $productQuery->fetch();

        if (!$product) {
            respond(400, [
                'success' => false,
                'message' => 'A product was not found for this branch.'
            ]);
        }

        $availability = strtolower(
            trim((string) ($product['availability'] ?? 'available'))
        );

        if (in_array(
            $availability,
            ['unavailable', 'out of stock', 'inactive', '0'],
            true
        )) {
            respond(409, [
                'success' => false,
                'message' => $product['product_name'] .
                    ' is currently unavailable.'
            ]);
        }

        $unitPrice = (float) $product['price'];
        $subtotal = round($unitPrice * $quantity, 2);

        $size = isset($item['size']) && $item['size'] !== ''
            ? trim((string) $item['size'])
            : null;

        $temperature = isset($item['temperature']) &&
            $item['temperature'] !== ''
            ? trim((string) $item['temperature'])
            : null;

        $sugar = $item['sugar_percent'] ?? null;

        if ($sugar !== null && $sugar !== '') {
            if (!is_numeric($sugar) || $sugar < 0 || $sugar > 100) {
                respond(400, [
                    'success' => false,
                    'message' => 'Invalid sugar percentage.'
                ]);
            }

            $sugar = (int) $sugar;
        } else {
            $sugar = null;
        }

        $validatedItems[] = [
            'product_id' => (int) $product['id'],
            'product_name' => $product['product_name'],
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'size' => $size,
            'temperature' => $temperature,
            'sugar_percent' => $sugar,
            'subtotal' => $subtotal
        ];

        $totalAmount += $subtotal;
    }

    $totalAmount = round($totalAmount, 2);

    // Create the order and its items as one transaction.
    $pdo->beginTransaction();

    // Unique-style ticket number; database ID remains the true order ID.
    $orderNumber = 'TMP-' . bin2hex(random_bytes(5));

    $orderQuery = $pdo->prepare(
        "INSERT INTO orders (
            order_number,
            order_date,
            branch_id,
            cashier_id,
            order_type,
            order_status,
            total_amount,
            payment_method,
            amount_paid,
            change_amount,
            paid_at,
            created_at
        ) VALUES (
            :order_number,
            NOW(),
            :branch_id,
            NULL,
            :order_type,
            'UNPAID',
            :total_amount,
            NULL,
            0,
            0,
            NULL,
            NOW()
        )"
    );

    $orderQuery->execute([
        'order_number' => $orderNumber,
        'branch_id' => $branchId,
        'order_type' => $orderType,
        'total_amount' => $totalAmount
    ]);

    $orderId = (int) $pdo->lastInsertId();

    $orderNumber = '#' . str_pad(
    (string) $orderId,
    4,
    '0',
    STR_PAD_LEFT
);

$updateNumber = $pdo->prepare(
    "UPDATE orders SET order_number = :order_number WHERE id = :order_id"
);

$updateNumber->execute([
    'order_number' => $orderNumber,
    'order_id' => $orderId
]);

    $itemQuery = $pdo->prepare(
        "INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            size,
            temperature,
            sugar_percent,
            subtotal
        ) VALUES (
            :order_id,
            :product_id,
            :product_name,
            :unit_price,
            :quantity,
            :size,
            :temperature,
            :sugar_percent,
            :subtotal
        )"
    );

    foreach ($validatedItems as $item) {
        $itemQuery->execute([
            'order_id' => $orderId,
            'product_id' => $item['product_id'],
            'product_name' => $item['product_name'],
            'unit_price' => $item['unit_price'],
            'quantity' => $item['quantity'],
            'size' => $item['size'],
            'temperature' => $item['temperature'],
            'sugar_percent' => $item['sugar_percent'],
            'subtotal' => $item['subtotal']
        ]);
    }

    $pdo->commit();

    respond(201, [
        'success' => true,
        'message' => 'Order saved successfully.',
        'order_id' => $orderId,
        'order_number' => $orderNumber,
        'branch_id' => $branchId,
        'order_status' => 'UNPAID',
        'total_amount' => $totalAmount
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('create_order.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to save the order. Check the PHP error log.'
    ]);
}
