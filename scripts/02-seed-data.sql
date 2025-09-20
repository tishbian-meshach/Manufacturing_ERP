-- Seed data for Manufacturing ERP-Lite system
-- This script populates the database with initial test data

-- Insert sample users (admin, manager, operator) with default passwords
-- Default password for all seeded users is: "password123"
INSERT INTO users (id, email, name, role, password) VALUES
('admin-1', 'admin@company.com', 'System Administrator', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6'),
('manager-1', 'manager@company.com', 'Production Manager', 'manager', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6'),
('operator-1', 'operator1@company.com', 'Machine Operator 1', 'operator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6'),
('operator-2', 'operator2@company.com', 'Machine Operator 2', 'operator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password = EXCLUDED.password;

-- Insert sample work centers (will be updated with company_id after companies are created)
INSERT INTO work_centers (name, description, capacity_per_hour) VALUES
('Assembly Line 1', 'Main assembly line for finished products', 10),
('CNC Machine 1', 'Computer Numerical Control machine for precision parts', 5),
('Quality Control', 'Quality inspection and testing station', 20),
('Packaging Station', 'Final packaging and labeling', 15),
('Raw Material Prep', 'Raw material preparation and cutting', 8);

-- Insert sample items (company_id will be assigned by migration script)
INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate) VALUES
-- Raw Materials (converted to INR: 1 USD ≈ 83 INR)
('RM001', 'Steel Rod 10mm', '10mm diameter steel rod', 'meter', 'raw_material', 456.50),
('RM002', 'Aluminum Sheet', '2mm thick aluminum sheet', 'sqm', 'raw_material', 996.00),
('RM003', 'Plastic Pellets', 'High-grade plastic pellets', 'kg', 'raw_material', 269.75),
('RM004', 'Screws M6', 'M6 stainless steel screws', 'pcs', 'raw_material', 12.45),
('RM005', 'Paint - Blue', 'Industrial blue paint', 'liter', 'raw_material', 726.25),

-- Semi-finished goods
('SF001', 'Machined Rod', 'Processed steel rod component', 'pcs', 'semi_finished', 1245.00),
('SF002', 'Cut Aluminum Panel', 'Cut and shaped aluminum panel', 'pcs', 'semi_finished', 2075.00),
('SF003', 'Molded Plastic Part', 'Injection molded plastic component', 'pcs', 'semi_finished', 705.00),

-- Finished goods
('FG001', 'Product A', 'Complete assembled product A', 'pcs', 'finished_good', 12450.00),
('FG002', 'Product B', 'Complete assembled product B', 'pcs', 'finished_good', 16600.00),
('FG003', 'Product C', 'Premium assembled product C', 'pcs', 'finished_good', 29050.00);

-- Insert sample BOMs
INSERT INTO bom (item_id, bom_name, quantity) VALUES
((SELECT id FROM items WHERE item_code = 'FG001'), 'BOM for Product A', 1),
((SELECT id FROM items WHERE item_code = 'FG002'), 'BOM for Product B', 1),
((SELECT id FROM items WHERE item_code = 'FG003'), 'BOM for Product C', 1);

-- Insert BOM items (components for each BOM)
-- BOM for Product A
INSERT INTO bom_items (bom_id, item_id, quantity) VALUES
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'SF001'), 2),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'SF003'), 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'RM004'), 4),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'RM005'), 0.1);

-- BOM for Product B
INSERT INTO bom_items (bom_id, item_id, quantity) VALUES
((SELECT id FROM bom WHERE bom_name = 'BOM for Product B'), (SELECT id FROM items WHERE item_code = 'SF001'), 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product B'), (SELECT id FROM items WHERE item_code = 'SF002'), 2),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product B'), (SELECT id FROM items WHERE item_code = 'SF003'), 2),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product B'), (SELECT id FROM items WHERE item_code = 'RM004'), 6);

-- BOM for Product C
INSERT INTO bom_items (bom_id, item_id, quantity) VALUES
((SELECT id FROM bom WHERE bom_name = 'BOM for Product C'), (SELECT id FROM items WHERE item_code = 'SF001'), 3),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product C'), (SELECT id FROM items WHERE item_code = 'SF002'), 2),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product C'), (SELECT id FROM items WHERE item_code = 'SF003'), 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product C'), (SELECT id FROM items WHERE item_code = 'RM004'), 8),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product C'), (SELECT id FROM items WHERE item_code = 'RM005'), 0.2);

-- Insert initial stock for raw materials and semi-finished goods (converted to INR)
INSERT INTO stock_ledger (item_id, voucher_type, voucher_no, actual_qty, qty_after_transaction, rate, value_after_transaction, posting_date) VALUES
-- Raw materials initial stock
((SELECT id FROM items WHERE item_code = 'RM001'), 'stock_adjustment', 'INIT-001', 1000, 1000, 456.50, 456500.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'RM002'), 'stock_adjustment', 'INIT-002', 500, 500, 996.00, 498000.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'RM003'), 'stock_adjustment', 'INIT-003', 200, 200, 269.75, 53950.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'RM004'), 'stock_adjustment', 'INIT-004', 5000, 5000, 12.45, 62250.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'RM005'), 'stock_adjustment', 'INIT-005', 100, 100, 726.25, 72625.00, CURRENT_DATE),

-- Semi-finished goods initial stock
((SELECT id FROM items WHERE item_code = 'SF001'), 'stock_adjustment', 'INIT-006', 50, 50, 1245.00, 62250.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'SF002'), 'stock_adjustment', 'INIT-007', 30, 30, 2075.00, 62250.00, CURRENT_DATE),
((SELECT id FROM items WHERE item_code = 'SF003'), 'stock_adjustment', 'INIT-008', 80, 80, 705.00, 56400.00, CURRENT_DATE);
