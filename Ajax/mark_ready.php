
<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../db.php';

class InventoryProblem extends RuntimeException {}

function respond($status, $data) {
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

/**
 * Deduct estimated servings from one inventory item.
 * stock_quantity = available packages/stock units
 * serving_count  = estimated servings per stock unit
 * servings_used  = servings consumed from the current unit
 */
function deductTrackedStock(
    PDO $pdo,
    int $branchId,
    string $ingredientName,
    float $servingsToUse
): void {
    if ($servingsToUse <= 0) {
        return;
    }

    $query = $pdo->prepare(
        "SELECT id, ingredient_name, stock_quantity,
                serving_count, servings_used
         FROM ingredients
         WHERE branch_id = :branch_id
           AND LOWER(ingredient_name) = LOWER(:ingredient_name)
         LIMIT 1
         FOR UPDATE"
    );

    $query->execute([
        'branch_id' => $branchId,
        'ingredient_name' => $ingredientName
    ]);

    $stock = $query->fetch(PDO::FETCH_ASSOC);

    if (!$stock) {
        throw new InventoryProblem(
            "Inventory item '{$ingredientName}' is missing for this branch."
        );
    }

    $servingCount = (int) ($stock['serving_count'] ?? 0);

    if ($servingCount < 1) {
        throw new InventoryProblem(
            "A valid serving_count is required for '{$ingredientName}'."
        );
    }

    $stockQuantity = (float) $stock['stock_quantity'];
    $servingsUsed = (float) ($stock['servings_used'] ?? 0);

    $available = ($stockQuantity * $servingCount) - $servingsUsed;

    if ($available + 0.000001 < $servingsToUse) {
        throw new InventoryProblem(
            "Insufficient {$ingredientName} stock. Available servings: " .
            number_format(max(0, $available), 2) . '.'
        );
    }

    $totalUsed = round($servingsUsed + $servingsToUse, 2);

    $unitsToRemove = (int) floor(
        ($totalUsed + 0.000001) / $servingCount
    );

    $remainingUsed = round(
        $totalUsed - ($unitsToRemove * $servingCount),
        2
    );

    if ($remainingUsed < 0) {
        $remainingUsed = 0;
    }

    $newStockQuantity = $stockQuantity - $unitsToRemove;

    if ($newStockQuantity < 0) {
        throw new InventoryProblem(
            "Insufficient {$ingredientName} stock."
        );
    }

    $update = $pdo->prepare(
        "UPDATE ingredients
         SET stock_quantity = :stock_quantity,
             servings_used = :servings_used
         WHERE id = :id
           AND branch_id = :branch_id"
    );

    $update->execute([
        'stock_quantity' => $newStockQuantity,
        'servings_used' => $remainingUsed,
        'id' => $stock['id'],
        'branch_id' => $branchId
    ]);
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

if (!$orderId || $orderId < 1 || !$branchId || $branchId < 1) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid order ID or branch ID.'
    ]);
}

try {
    $pdo->beginTransaction();

    $orderQuery = $pdo->prepare(
        "SELECT id, order_number, order_status, order_type
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

    if ($order['order_status'] !== 'PREPARING') {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'Only PREPARING orders can be marked READY.'
        ]);
    }

    $itemsQuery = $pdo->prepare(
        "SELECT
            oi.product_id,
            oi.product_name,
            oi.quantity,
            oi.temperature,
            oi.sugar_percent,
            p.category
         FROM order_items oi
         INNER JOIN products p
            ON p.id = oi.product_id
           AND p.branch_id = :branch_id
         WHERE oi.order_id = :order_id
         ORDER BY oi.id"
    );

    $itemsQuery->execute([
        'branch_id' => $branchId,
        'order_id' => $orderId
    ]);

    $items = $itemsQuery->fetchAll(PDO::FETCH_ASSOC);

    if (!$items) {
        $pdo->rollBack();

        respond(422, [
            'success' => false,
            'message' => 'Cannot mark an order with no items as READY.'
        ]);
    }

    $deductions = [
        'Coffee Beans' => 0.0,
        'Milk' => 0.0,
        'Sugar' => 0.0,
        'Syrup' => 0.0,
        'Hot Cups' => 0.0,
        'Cold Cups' => 0.0,
        'Lids' => 0.0,
        'Cookies' => 0.0,
        'Pasta' => 0.0
    ];

    $untrackedItems = [];

    $orderType = strtolower(trim((string) $order['order_type']));
    $isTakeout = in_array(
        $orderType,
        ['take-out', 'takeout', 'take out'],
        true
    );

    // Flavor-based syrup use is an estimate, not a verified recipe.
    $syrupKeywords = [
        'spanish',
        'mocha',
        'caramel',
        'vanilla',
        'choco',
        'chocolate',
        'ube',
        'strawberry',
        'blueberry',
        'biscoff',
        'oreo'
    ];

    foreach ($items as $item) {
        $quantity = (int) $item['quantity'];

        if ($quantity < 1) {
            throw new InventoryProblem(
                'An order item has an invalid quantity.'
            );
        }

        $category = strtolower(trim((string) $item['category']));
        $name = strtolower(trim((string) $item['product_name']));
        $temperature = strtolower(trim((string) ($item['temperature'] ?? '')));

        if ($category === 'food') {
            if (strpos($name, 'cookie') !== false) {
                $deductions['Cookies'] += $quantity;
            } elseif (strpos($name, 'lasagna') !== false) {
                $deductions['Pasta'] += $quantity;
            } else {
                $untrackedItems[] = $item['product_name'];
            }

            continue;
        }

        // Container estimate: one cup for every beverage.
        // Drinks without an explicit Hot temperature default to cold.
        if ($category === 'frappe' || $temperature !== 'hot') {
            $deductions['Cold Cups'] += $quantity;
        } else {
            $deductions['Hot Cups'] += $quantity;
        }

        // Assume one lid per beverage for take-out orders.
        if ($isTakeout) {
            $deductions['Lids'] += $quantity;
        }

        // Estimated 18 g coffee serving for products in the coffee category.
        if ($category === 'coffee') {
            $deductions['Coffee Beans'] += $quantity;
        }

        // Estimated 250 ml milk serving for milk-based drinks.
        $isSoda = strpos($name, 'soda') !== false;
        $usesMilk = (
            $category === 'coffee' &&
            strpos($name, 'americano') === false
        ) || $category === 'frappe' ||
            ($category === 'other' && !$isSoda);

        if ($usesMilk) {
            $deductions['Milk'] += $quantity;
        }

        // Deduct a fractional sugar serving when the order stores
        // a sugar percentage. 100% is one estimated 12 g serving.
        $sugarPercent = $item['sugar_percent'];

        if ($sugarPercent !== null && $sugarPercent !== '') {
            if (
                !is_numeric($sugarPercent) ||
                $sugarPercent < 0 ||
                $sugarPercent > 100
            ) {
                throw new InventoryProblem(
                    'Invalid sugar percentage for ' . $item['product_name'] . '.'
                );
            }

            $deductions['Sugar'] +=
                $quantity * ((float) $sugarPercent / 100);
        }

        // Estimated 30 ml syrup serving for named flavored drinks.
        foreach ($syrupKeywords as $keyword) {
            if (strpos($name, $keyword) !== false) {
                $deductions['Syrup'] += $quantity;
                break;
            }
        }
    }

    // Deduct stock within the same transaction as the READY status update.
    foreach ($deductions as $ingredientName => $servings) {
        deductTrackedStock(
            $pdo,
            $branchId,
            $ingredientName,
            (float) $servings
        );
    }

    $updateOrder = $pdo->prepare(
        "UPDATE orders
         SET order_status = 'READY',
             ready_at = NOW()
         WHERE id = :order_id
           AND branch_id = :branch_id
           AND order_status = 'PREPARING'"
    );

    $updateOrder->execute([
        'order_id' => $orderId,
        'branch_id' => $branchId
    ]);

    if ($updateOrder->rowCount() !== 1) {
        throw new InventoryProblem(
            'Order status was not changed. Refresh and try again.'
        );
    }

    $pdo->commit();

    respond(200, [
        'success' => true,
        'message' => 'Order marked READY.',
        'order_id' => (int) $order['id'],
        'order_number' => $order['order_number'],
        'order_status' => 'READY',
        'estimated_inventory_deductions' => $deductions,
        'not_tracked_by_current_rules' => array_values(
            array_unique($untrackedItems)
        )
    ]);

} catch (InventoryProblem $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond(409, [
        'success' => false,
        'message' => $e->getMessage()
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('mark_ready.php: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to mark order READY. Check the PHP error log.'
    ]);
}
