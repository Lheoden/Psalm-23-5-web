<?php
declare(strict_types=1);

// TODO CONFIRM: set these only after the owner approves the Student discount.
const STUDENT_RATE_BP = null;

// TODO CONFIRM: set after confirming VAT registration and menu-price treatment.
const VAT_REGISTERED = null;
const VAT_PERCENT = null;

// TODO CONFIRM: set after the statutory PWD/Senior computation is approved.
const PWD_SENIOR_RATE_BP = null;

// TODO CONFIRM: confirm the accounting method for zero-payment Owner orders.
const OWNER_ZERO_PAYMENT_METHOD = 'Complimentary';

const OWNER_RATE_BP = 10000;

function pricing_rules(): array
{
    return [
        'student_rate_bp' => STUDENT_RATE_BP,
        'vat_registered' => VAT_REGISTERED,
        'vat_percent' => VAT_PERCENT,
        'pwd_senior_rate_bp' => PWD_SENIOR_RATE_BP,
        'owner_rate_bp' => OWNER_RATE_BP,
        'owner_zero_payment_method' => OWNER_ZERO_PAYMENT_METHOD
    ];
}

function cents_to_decimal(int $cents): string
{
    $sign = $cents < 0 ? '-' : '';
    $absolute = abs($cents);

    return $sign . intdiv($absolute, 100) . '.' .
        str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
}

function pricing_amount_to_cents($amount): int
{
    if (!is_string($amount) && !is_int($amount)) {
        throw new InvalidArgumentException('Item unit price must be a decimal string or integer.');
    }

    $amount = (string) $amount;
    if (!preg_match('/^(-?)(\d+)(?:\.(\d{1,2}))?$/', $amount, $matches)) {
        throw new InvalidArgumentException('Item unit price must have at most two decimal places.');
    }

    $whole = (int) $matches[2];
    $fraction = isset($matches[3])
        ? (int) str_pad($matches[3], 2, '0', STR_PAD_RIGHT)
        : 0;
    $cents = $whole * 100 + $fraction;

    return ($matches[1] ?? '') === '-' ? -$cents : $cents;
}

function compute_order_pricing(array $items, string $category): array
{
    $validCategories = [
        'Regular',
        'Student',
        'PWD',
        'Senior Citizen',
        'Owner'
    ];

    if (!in_array($category, $validCategories, true)) {
        throw new InvalidArgumentException('Unknown customer category.');
    }

    if ($items === []) {
        throw new InvalidArgumentException('Order must contain at least one item.');
    }

    if ($category === 'Student' && STUDENT_RATE_BP === null) {
        throw new InvalidArgumentException('Student discount settings are pending approval.');
    }

    if (
        in_array($category, ['PWD', 'Senior Citizen'], true) &&
        (
            PWD_SENIOR_RATE_BP === null ||
            VAT_REGISTERED === null ||
            (VAT_REGISTERED && VAT_PERCENT === null)
        )
    ) {
        throw new InvalidArgumentException('PWD/Senior discount and VAT settings are pending approval.');
    }

    $subtotalCents = 0;
    foreach ($items as $item) {
        if (
            !is_array($item) ||
            !isset($item['quantity'], $item['unit_price'])
        ) {
            throw new InvalidArgumentException('Each item needs quantity and unit_price.');
        }

        $quantity = filter_var($item['quantity'], FILTER_VALIDATE_INT);
        $unitPriceCents = pricing_amount_to_cents($item['unit_price']);
        if ($quantity === false || $quantity <= 0 || $unitPriceCents < 0) {
            throw new InvalidArgumentException('Item quantity must be positive and price cannot be negative.');
        }

        $subtotalCents += $quantity * $unitPriceCents;
    }

    $baseCents = $subtotalCents;
    $vatAdjustmentCents = 0;
    $discountRateBp = 0;

    if (
        in_array($category, ['PWD', 'Senior Citizen'], true) &&
        VAT_REGISTERED
    ) {
        $divisor = 100 + VAT_PERCENT;
        $baseCents = intdiv(
            ($subtotalCents * 100) + intdiv($divisor, 2),
            $divisor
        );
        $vatAdjustmentCents = $subtotalCents - $baseCents;
    }

    if ($category === 'Student') {
        $discountRateBp = STUDENT_RATE_BP;
    } elseif (in_array($category, ['PWD', 'Senior Citizen'], true)) {
        $discountRateBp = PWD_SENIOR_RATE_BP;
    } elseif ($category === 'Owner') {
        $discountRateBp = OWNER_RATE_BP;
    }

    $discountCents = $discountRateBp >= 10000
        ? $baseCents
        : intdiv(($baseCents * $discountRateBp) + 5000, 10000);
    $finalCents = $baseCents - $discountCents;

    return [
        'category' => $category,
        'subtotal_cents' => $subtotalCents,
        'base_cents' => $baseCents,
        'vat_adjustment_cents' => $vatAdjustmentCents,
        'discount_rate_bp' => $discountRateBp,
        'discount_cents' => $discountCents,
        'final_cents' => $finalCents
    ];
}
