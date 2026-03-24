-- SQL Seed File for Categories and Subcategories

INSERT INTO categories (id, name, created_at, updated_at) VALUES
-- Main Categories
(1, 'Electronics', '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(2, 'Fashion', '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(3, 'Home & Living', '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(4, 'Beauty & Health', '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(5, 'Sports & Outdoors', '2026-03-24 15:51:21', '2026-03-24 15:51:21');

INSERT INTO subcategories (id, name, category_id, created_at, updated_at) VALUES
-- Subcategories for Electronics
(1, 'Mobile Phones', 1, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(2, 'Laptops', 1, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(3, 'Cameras', 1, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
-- Subcategories for Fashion
(4, 'Men', 2, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(5, 'Women', 2, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(6, 'Kids', 2, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
-- Subcategories for Home & Living
(7, 'Furniture', 3, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(8, 'Decor', 3, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(9, 'Kitchen', 3, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
-- Subcategories for Beauty & Health
(10, 'Skincare', 4, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(11, 'Makeup', 4, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
-- Subcategories for Sports & Outdoors
(12, 'Fitness', 5, '2026-03-24 15:51:21', '2026-03-24 15:51:21'),
(13, 'Camping', 5, '2026-03-24 15:51:21', '2026-03-24 15:51:21');