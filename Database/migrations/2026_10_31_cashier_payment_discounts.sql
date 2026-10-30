ALTER TABLE `orders`
  ADD COLUMN `customer_category` VARCHAR(20) NOT NULL DEFAULT 'Regular',
  ADD COLUMN `subtotal_amount` DECIMAL(10,2) NULL,
  ADD COLUMN `vat_adjustment_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `discount_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN `gcash_reference` VARCHAR(20) NULL;

CREATE UNIQUE INDEX `uq_orders_gcash_reference`
  ON `orders` (`gcash_reference`);

UPDATE `orders`
SET `subtotal_amount` = `total_amount`
WHERE `subtotal_amount` IS NULL;
