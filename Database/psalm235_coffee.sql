-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 26, 2026 at 10:39 PM
-- Server version: 10.11.16-MariaDB
-- PHP Version: 8.3.36

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `psalm235_coffee`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int(11) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `branch_name`, `location`, `created_at`) VALUES
(1, 'Calamba', 'Near City College of Calamba', '2026-10-26 18:09:26'),
(2, 'Lipa', 'Near National University Lipa', '2026-10-26 18:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `ingredients`
--

CREATE TABLE `ingredients` (
  `id` int(11) NOT NULL,
  `ingredient_name` varchar(100) NOT NULL,
  `container_type` varchar(100) NOT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `serving_count` int(11) DEFAULT NULL,
  `servings_used` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(50) NOT NULL,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 0,
  `last_counted_at` datetime DEFAULT NULL,
  `branch_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `ingredients`
--

INSERT INTO `ingredients` (`id`, `ingredient_name`, `container_type`, `stock_quantity`, `serving_count`, `servings_used`, `unit`, `low_stock_threshold`, `last_counted_at`, `branch_id`, `created_at`) VALUES
(1, 'Hot Cups', 'pack of 50', 3, 50, 0, 'cup', 1, NULL, 1, '2026-10-26 18:49:57'),
(2, 'Cold Cups', 'pack of 50', 2, 50, 0, 'cup', 1, NULL, 1, '2026-10-26 18:49:57'),
(3, 'Cookies', 'piece', 12, 1, 0, 'piece', 4, NULL, 1, '2026-10-26 18:49:57'),
(4, 'Pasta', 'serving', 8, 1, 0, 'serving', 3, NULL, 1, '2026-10-26 18:49:57'),
(5, 'Hot Cups', 'pack of 50', 2, 50, 0, 'cup', 1, NULL, 2, '2026-10-26 18:49:57'),
(6, 'Cold Cups', 'pack of 50', 1, 50, 0, 'cup', 1, NULL, 2, '2026-10-26 18:49:57'),
(7, 'Cookies', 'piece', 7, 1, 0, 'piece', 4, NULL, 2, '2026-10-26 18:49:57'),
(8, 'Pasta', 'serving', 5, 1, 0, 'serving', 3, NULL, 2, '2026-10-26 18:49:57'),
(9, 'Coffee Beans', 'bag', 2, NULL, 0, 'bag', 1, NULL, 1, '2026-10-26 18:53:33'),
(10, 'Milk', 'box', 3, NULL, 0, 'box', 1, NULL, 1, '2026-10-26 18:53:33'),
(11, 'Syrup', 'bottle', 3, NULL, 0, 'bottle', 1, NULL, 1, '2026-10-26 18:53:33'),
(12, 'Sugar', 'pack', 2, NULL, 0, 'pack', 1, NULL, 1, '2026-10-26 18:53:33'),
(13, 'Lids', 'piece', 36, 1, 0, 'piece', 12, NULL, 1, '2026-10-26 18:53:33'),
(14, 'Coffee Beans', 'bag', 2, NULL, 0, 'bag', 1, NULL, 2, '2026-10-26 18:53:33'),
(15, 'Milk', 'box', 2, NULL, 0, 'box', 1, NULL, 2, '2026-10-26 18:53:33'),
(16, 'Syrup', 'bottle', 2, NULL, 0, 'bottle', 1, NULL, 2, '2026-10-26 18:53:33'),
(17, 'Sugar', 'pack', 2, NULL, 0, 'pack', 1, NULL, 2, '2026-10-26 18:53:33'),
(18, 'Lids', 'piece', 30, 1, 0, 'piece', 12, NULL, 2, '2026-10-26 18:53:33');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_reports`
--

CREATE TABLE `inventory_reports` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `report_type` varchar(100) NOT NULL,
  `total_items` int(11) NOT NULL DEFAULT 0,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(50) NOT NULL,
  `order_date` date NOT NULL DEFAULT curdate(),
  `branch_id` int(11) NOT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `order_type` varchar(50) NOT NULL,
  `order_status` varchar(50) NOT NULL DEFAULT 'UNPAID',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `preparation_started_at` datetime DEFAULT NULL,
  `ready_at` datetime DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `order_date`, `branch_id`, `cashier_id`, `order_type`, `order_status`, `total_amount`, `payment_method`, `amount_paid`, `change_amount`, `paid_at`, `preparation_started_at`, `ready_at`, `voided_at`, `void_reason`, `created_at`) VALUES
(1, '#26102622255412', '2026-10-27', 1, NULL, 'Dine-in', 'UNPAID', 90.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-10-26 21:25:54'),
(2, '#0002', '2026-10-27', 1, NULL, 'Dine-in', 'UNPAID', 90.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-10-26 21:30:03'),
(3, '#0003', '2026-10-27', 1, NULL, 'Dine-in', 'UNPAID', 120.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-10-26 21:30:12'),
(4, '#0004', '2026-10-27', 1, NULL, 'Dine-in', 'UNPAID', 120.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, '2026-10-26 21:32:22');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `size` varchar(20) DEFAULT NULL,
  `temperature` varchar(20) DEFAULT NULL,
  `sugar_percent` tinyint(3) UNSIGNED DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `unit_price`, `quantity`, `size`, `temperature`, `sugar_percent`, `subtotal`) VALUES
(4, 4, 9, 'Caramel Macchiato', 120.00, 1, 'Medium', 'Hot', 50, 120.00);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `tag` varchar(50) DEFAULT NULL,
  `mood_tags` varchar(255) DEFAULT NULL,
  `bible_verse` varchar(255) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `requires_customization` tinyint(1) NOT NULL DEFAULT 0,
  `availability` varchar(50) NOT NULL DEFAULT 'Available',
  `branch_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `product_name`, `category`, `description`, `price`, `tag`, `mood_tags`, `bible_verse`, `image_url`, `requires_customization`, `availability`, `branch_id`, `created_at`) VALUES
(1, 'Psalm Signature', 'Coffee', 'Sweet and bold signature coffee', 150.00, 'Best Seller', 'tired,focused', NULL, 'Espresso.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(2, 'Espresso Matcha', 'Coffee', 'Espresso blended with matcha', 120.00, 'Popular', 'tired,focused', NULL, 'Espresso matcha.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(3, 'Americano', 'Coffee', 'Espresso with water, served hot or iced', 90.00, NULL, 'tired,focused', NULL, 'Americano.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(4, 'Spanish Latte', 'Coffee', 'Espresso shots with vanilla and condensed milk', 125.00, NULL, NULL, NULL, 'Spanish latte.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(5, 'Mocha Latte', 'Coffee', 'Espresso shots with milk, chocolate, and cream', 130.00, NULL, 'sad', NULL, 'Mocha latte.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(6, 'Salted Caramel', 'Coffee', 'Creamy espresso with the aroma of salted caramel', 130.00, NULL, 'stressed', NULL, 'Salted caramel.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(7, 'Latte', 'Coffee', 'Espresso shots mixed with full milk', 120.00, NULL, 'relaxed', NULL, 'Latte.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(8, 'Vanilla Latte', 'Coffee', 'Espresso shots with milk and vanilla', 120.00, NULL, 'stressed,relaxed', NULL, 'Vanilla Latte.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(9, 'Caramel Macchiato', 'Coffee', 'Espresso shots with milk and vanilla topped with caramel', 120.00, NULL, 'tired', NULL, 'Caramel Macchiato.png', 1, 'Available', 1, '2026-10-26 18:15:49'),
(10, 'Strawberry Cream Cheese', 'Frappe', 'Strawberry frappe with creamy cheese', 135.00, NULL, 'happy', NULL, 'Strawberry Cream Cheese.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(11, 'Blueberry Cream Cheese', 'Frappe', 'Blueberry frappe with creamy cheese', 135.00, NULL, NULL, NULL, 'Blueberry Cream Cheese.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(12, 'Matcha Cream Cheese', 'Frappe', 'Matcha frappe with creamy cheese', 135.00, NULL, 'relaxed', NULL, 'Matcha Cream Cheese.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(13, 'Ube Cream Cheese', 'Frappe', 'Ube frappe with creamy cheese', 135.00, NULL, 'stressed', NULL, 'Ube Cream Cheese.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(14, 'Oreo Cream Cheese', 'Frappe', 'Oreo frappe with creamy cheese', 145.00, NULL, 'stressed,sad', NULL, 'Oreo Cream Cheese.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(15, 'Oreo Matcha Frappe', 'Frappe', 'Matcha frappe blended with Oreo', 145.00, NULL, 'focused', NULL, 'Oreo Matcha Frappe.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(16, 'Choco Java Chips Frappe', 'Frappe', 'Chocolate frappe blended with java chips', 155.00, NULL, 'tired', NULL, 'Choco Java Chips Frappe.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(17, 'Mocha Cookie Crumble Frappe', 'Frappe', 'Mocha frappe with cookie crumble', 155.00, NULL, 'sad', NULL, 'Mocha Cookie Crumble Frappe.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(18, 'Biscoff Flavor Frappe', 'Frappe', 'Creamy frappe with Biscoff flavor', 155.00, NULL, 'happy', NULL, 'Biscoff Flavor Frappe.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(19, 'Apple Soda', 'Other', 'Soda-based drink with jelly popping boba', 75.00, NULL, NULL, NULL, 'Apple Soda.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(20, 'Blueberry Soda', 'Other', 'Soda-based drink with jelly popping boba', 75.00, NULL, 'happy', NULL, 'Blueberry Soda.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(21, 'Strawberry Matcha', 'Other', 'Matcha with full milk and strawberry', 120.00, NULL, 'happy', NULL, 'Strawberry Matcha.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(22, 'Blueberry Matcha', 'Other', 'Matcha with full milk and blueberry', 120.00, NULL, 'focused', NULL, 'Blueberry Matcha.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(23, 'Choco Drizzle', 'Other', 'Our signature blend of the famous chocolates', 120.00, NULL, NULL, NULL, 'choco drizzle.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(24, 'Ube Latte', 'Other', 'A rich combination of sweet ube and espresso', 135.00, NULL, 'relaxed', NULL, 'Ube Latte.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(25, 'Ube Matcha', 'Other', 'A rich combination of sweet ube and matcha', 140.00, NULL, 'relaxed', NULL, 'Ube Matcha.png', 0, 'Available', 1, '2026-10-26 18:15:49'),
(26, 'Double Chocolate Cookies', 'Food', 'Rich and chewy double chocolate cookie', 40.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(27, 'Red Velvet Cookies', 'Food', 'Soft and rich red velvet cookie', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(28, 'S\'mores Cookies', 'Food', 'Chocolate cookie with sweet s\'mores flavor', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(29, 'Oreo Brownies', 'Food', 'Rich chocolate brownies with Oreo', 50.00, NULL, 'sad', NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(30, 'Brookie', 'Food', 'Brownie combined with cookies', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(31, 'Cinnamon Cookies', 'Food', 'Soft cookies with cinnamon flavor', 55.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(32, 'Nutella Cookies', 'Food', 'Soft cookies filled with Nutella', 60.00, NULL, 'stressed,sad', NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(33, 'Biscoff Cookies', 'Food', 'Cookies with rich Biscoff flavor', 65.00, NULL, 'happy', NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(34, 'Cheesy Lasagna', 'Food', 'Creamy and cheesy baked lasagna', 160.00, NULL, NULL, NULL, NULL, 0, 'Available', 1, '2026-10-26 18:15:49'),
(35, 'Psalm Signature', 'Coffee', 'Sweet and bold signature coffee', 150.00, 'Best Seller', 'tired,focused', NULL, 'Espresso.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(36, 'Espresso Matcha', 'Coffee', 'Espresso blended with matcha', 120.00, 'Popular', 'tired,focused', NULL, 'Espresso matcha.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(37, 'Americano', 'Coffee', 'Espresso with water, served hot or iced', 90.00, NULL, 'tired,focused', NULL, 'Americano.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(38, 'Spanish Latte', 'Coffee', 'Espresso shots with vanilla and condensed milk', 125.00, NULL, NULL, NULL, 'Spanish latte.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(39, 'Mocha Latte', 'Coffee', 'Espresso shots with milk, chocolate, and cream', 130.00, NULL, 'sad', NULL, 'Mocha latte.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(40, 'Salted Caramel', 'Coffee', 'Creamy espresso with the aroma of salted caramel', 130.00, NULL, 'stressed', NULL, 'Salted caramel.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(41, 'Latte', 'Coffee', 'Espresso shots mixed with full milk', 120.00, NULL, 'relaxed', NULL, 'Latte.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(42, 'Vanilla Latte', 'Coffee', 'Espresso shots with milk and vanilla', 120.00, NULL, 'stressed,relaxed', NULL, 'Vanilla Latte.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(43, 'Caramel Macchiato', 'Coffee', 'Espresso shots with milk and vanilla topped with caramel', 120.00, NULL, 'tired', NULL, 'Caramel Macchiato.png', 1, 'Available', 2, '2026-10-26 18:16:01'),
(44, 'Strawberry Cream Cheese', 'Frappe', 'Strawberry frappe with creamy cheese', 135.00, NULL, 'happy', NULL, 'Strawberry Cream Cheese.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(45, 'Blueberry Cream Cheese', 'Frappe', 'Blueberry frappe with creamy cheese', 135.00, NULL, NULL, NULL, 'Blueberry Cream Cheese.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(46, 'Matcha Cream Cheese', 'Frappe', 'Matcha frappe with creamy cheese', 135.00, NULL, 'relaxed', NULL, 'Matcha Cream Cheese.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(47, 'Ube Cream Cheese', 'Frappe', 'Ube frappe with creamy cheese', 135.00, NULL, 'stressed', NULL, 'Ube Cream Cheese.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(48, 'Oreo Cream Cheese', 'Frappe', 'Oreo frappe with creamy cheese', 145.00, NULL, 'stressed,sad', NULL, 'Oreo Cream Cheese.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(49, 'Oreo Matcha Frappe', 'Frappe', 'Matcha frappe blended with Oreo', 145.00, NULL, 'focused', NULL, 'Oreo Matcha Frappe.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(50, 'Choco Java Chips Frappe', 'Frappe', 'Chocolate frappe blended with java chips', 155.00, NULL, 'tired', NULL, 'Choco Java Chips Frappe.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(51, 'Mocha Cookie Crumble Frappe', 'Frappe', 'Mocha frappe with cookie crumble', 155.00, NULL, 'sad', NULL, 'Mocha Cookie Crumble Frappe.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(52, 'Biscoff Flavor Frappe', 'Frappe', 'Creamy frappe with Biscoff flavor', 155.00, NULL, 'happy', NULL, 'Biscoff Flavor Frappe.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(53, 'Apple Soda', 'Other', 'Soda-based drink with jelly popping boba', 75.00, NULL, NULL, NULL, 'Apple Soda.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(54, 'Blueberry Soda', 'Other', 'Soda-based drink with jelly popping boba', 75.00, NULL, 'happy', NULL, 'Blueberry Soda.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(55, 'Strawberry Matcha', 'Other', 'Matcha with full milk and strawberry', 120.00, NULL, 'happy', NULL, 'Strawberry Matcha.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(56, 'Blueberry Matcha', 'Other', 'Matcha with full milk and blueberry', 120.00, NULL, 'focused', NULL, 'Blueberry Matcha.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(57, 'Choco Drizzle', 'Other', 'Our signature blend of the famous chocolates', 120.00, NULL, NULL, NULL, 'choco drizzle.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(58, 'Ube Latte', 'Other', 'A rich combination of sweet ube and espresso', 135.00, NULL, 'relaxed', NULL, 'Ube Latte.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(59, 'Ube Matcha', 'Other', 'A rich combination of sweet ube and matcha', 140.00, NULL, 'relaxed', NULL, 'Ube Matcha.png', 0, 'Available', 2, '2026-10-26 18:16:01'),
(60, 'Double Chocolate Cookies', 'Food', 'Rich and chewy double chocolate cookie', 40.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(61, 'Red Velvet Cookies', 'Food', 'Soft and rich red velvet cookie', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(62, 'S\'mores Cookies', 'Food', 'Chocolate cookie with sweet s\'mores flavor', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(63, 'Oreo Brownies', 'Food', 'Rich chocolate brownies with Oreo', 50.00, NULL, 'sad', NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(64, 'Brookie', 'Food', 'Brownie combined with cookies', 50.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(65, 'Cinnamon Cookies', 'Food', 'Soft cookies with cinnamon flavor', 55.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(66, 'Nutella Cookies', 'Food', 'Soft cookies filled with Nutella', 60.00, NULL, 'stressed,sad', NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(67, 'Biscoff Cookies', 'Food', 'Cookies with rich Biscoff flavor', 65.00, NULL, 'happy', NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01'),
(68, 'Cheesy Lasagna', 'Food', 'Creamy and cheesy baked lasagna', 160.00, NULL, NULL, NULL, NULL, 0, 'Available', 2, '2026-10-26 18:16:01');

-- --------------------------------------------------------

--
-- Table structure for table `sales_reports`
--

CREATE TABLE `sales_reports` (
  `id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `total_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `top_selling_item` varchar(100) DEFAULT NULL,
  `date_from` date NOT NULL,
  `date_to` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_logs_user` (`user_id`),
  ADD KEY `idx_activity_logs_created_at` (`created_at`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_branches_name` (`branch_name`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ingredient_per_branch` (`branch_id`,`ingredient_name`);

--
-- Indexes for table `inventory_reports`
--
ALTER TABLE `inventory_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventory_reports_branch` (`branch_id`),
  ADD KEY `idx_inventory_reports_generated_by` (`generated_by`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_order_number_per_day` (`branch_id`,`order_date`,`order_number`),
  ADD KEY `idx_orders_branch_status` (`branch_id`,`order_status`),
  ADD KEY `fk_orders_cashier` (`cashier_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_items_order` (`order_id`),
  ADD KEY `fk_items_product` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_per_branch` (`branch_id`,`product_name`);

--
-- Indexes for table `sales_reports`
--
ALTER TABLE `sales_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sales_reports_branch` (`branch_id`),
  ADD KEY `idx_sales_reports_generated_by` (`generated_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`),
  ADD KEY `fk_users_branch` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ingredients`
--
ALTER TABLE `ingredients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_reports`
--
ALTER TABLE `inventory_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_reports`
--
ALTER TABLE `sales_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `fk_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD CONSTRAINT `fk_ing_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `inventory_reports`
--
ALTER TABLE `inventory_reports`
  ADD CONSTRAINT `fk_inventory_reports_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_inventory_reports_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_orders_cashier` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `sales_reports`
--
ALTER TABLE `sales_reports`
  ADD CONSTRAINT `fk_sales_reports_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sales_reports_user` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
