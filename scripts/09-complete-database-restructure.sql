-- COMPLETE DATABASE RESTRUCTURE FOR BOM OPERATIONS
-- This script creates a clean, consolidated database schema
-- that matches the new frontend and backend structure

-- =====================================================
-- CLEAN START: Drop all existing tables and recreate
-- =====================================================

DROP TABLE IF EXISTS bom_operations CASCADE;
DROP TABLE IF EXISTS bom_items CASCADE;
DROP TABLE IF EXISTS stock_ledger CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS manufacturing_orders CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS work_centers CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Companies table (multi-tenancy)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    admin_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (with company relationship)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator')),
    password TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations table
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'inventory')),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- =====================================================
-- INVENTORY & BOM SYSTEM
-- =====================================================

-- Items table (products, materials, components)
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    item_code TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
    item_type TEXT NOT NULL DEFAULT 'finished_good' CHECK (item_type IN ('raw_material', 'finished_good', 'semi_finished')),
    standard_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Centers table
CREATE TABLE work_centers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    capacity_per_hour INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOM (Bill of Materials) table
CREATE TABLE bom (
    id SERIAL PRIMARY KEY,
    bom_name TEXT NOT NULL,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOM Items table (components/materials in a BOM)
CREATE TABLE bom_items (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOM Operations table (manufacturing steps at BOM level)
CREATE TABLE bom_operations (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE,
    work_center_id INTEGER REFERENCES work_centers(id) ON DELETE CASCADE,
    operation_name TEXT NOT NULL,
    operation_description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    execution_order INTEGER NOT NULL DEFAULT 1,
    is_parallel BOOLEAN DEFAULT FALSE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MANUFACTURING SYSTEM
-- =====================================================

-- Manufacturing Orders table
CREATE TABLE manufacturing_orders (
    id SERIAL PRIMARY KEY,
    mo_number TEXT UNIQUE NOT NULL,
    item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
    bom_id INTEGER REFERENCES bom(id) ON DELETE RESTRICT,
    planned_qty DECIMAL(10,3) NOT NULL,
    produced_qty DECIMAL(10,3) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_by TEXT REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Orders table (created from BOM operations)
CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    wo_number TEXT UNIQUE NOT NULL,
    manufacturing_order_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    work_center_id INTEGER REFERENCES work_centers(id) ON DELETE RESTRICT,
    operation_name TEXT NOT NULL,
    planned_qty DECIMAL(10,3) NOT NULL,
    completed_qty DECIMAL(10,3) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
    planned_start_time TIMESTAMP WITH TIME ZONE,
    planned_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    assigned_to TEXT REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Ledger table
CREATE TABLE stock_ledger (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
    voucher_type TEXT NOT NULL,
    voucher_no TEXT NOT NULL,
    actual_qty DECIMAL(10,3) NOT NULL,
    qty_after_transaction DECIMAL(10,3) NOT NULL,
    rate DECIMAL(10,2) DEFAULT 0,
    value_after_transaction DECIMAL(12,2) DEFAULT 0,
    posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_time TIME NOT NULL DEFAULT CURRENT_TIME,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONSTRAINTS & INDEXES
-- =====================================================

-- Add foreign key constraints
ALTER TABLE companies ADD CONSTRAINT fk_companies_admin FOREIGN KEY (admin_id) REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_items_company_id ON items(company_id);
CREATE INDEX idx_work_centers_company_id ON work_centers(company_id);
CREATE INDEX idx_bom_company_id ON bom(company_id);
CREATE INDEX idx_bom_items_company_id ON bom_items(company_id);
CREATE INDEX idx_bom_operations_bom_id ON bom_operations(bom_id);
CREATE INDEX idx_bom_operations_work_center_id ON bom_operations(work_center_id);
CREATE INDEX idx_bom_operations_company_id ON bom_operations(company_id);
CREATE INDEX idx_bom_operations_execution_order ON bom_operations(execution_order);
CREATE INDEX idx_manufacturing_orders_company_id ON manufacturing_orders(company_id);
CREATE INDEX idx_manufacturing_orders_status ON manufacturing_orders(status);
CREATE INDEX idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_stock_ledger_company_id ON stock_ledger(company_id);
CREATE INDEX idx_stock_ledger_item_id ON stock_ledger(item_id);
CREATE INDEX idx_stock_ledger_posting_date ON stock_ledger(posting_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_centers_updated_at BEFORE UPDATE ON work_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bom_updated_at BEFORE UPDATE ON bom FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bom_operations_updated_at BEFORE UPDATE ON bom_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON manufacturing_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA FOR NEW STRUCTURE
-- =====================================================

-- Insert default company
INSERT INTO companies (name, domain, created_at, updated_at)
VALUES ('Default Company', 'default.com', NOW(), NOW());

-- Insert users with hashed passwords (password123)
INSERT INTO users (id, email, name, role, password, company_id) VALUES
('admin-1', 'admin@company.com', 'System Administrator', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6', 1),
('manager-1', 'manager@company.com', 'Production Manager', 'manager', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6', 1),
('operator-1', 'operator1@company.com', 'Machine Operator 1', 'operator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6', 1),
('operator-2', 'operator2@company.com', 'Machine Operator 2', 'operator', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYQmHqU3jK6', 1);

-- Update company admin
UPDATE companies SET admin_id = 'admin-1' WHERE id = 1;

-- Insert work centers
INSERT INTO work_centers (name, description, capacity_per_hour, company_id) VALUES
('Assembly Line 1', 'Main assembly line for finished products', 10, 1),
('CNC Machine 1', 'Computer Numerical Control machine for precision parts', 5, 1),
('Quality Control', 'Quality inspection and testing station', 20, 1),
('Packaging Station', 'Final packaging and labeling', 15, 1),
('Raw Material Prep', 'Raw material preparation and cutting', 8, 1);

-- Insert items (converted to INR: 1 USD ≈ 83 INR)
INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate, company_id) VALUES
-- Raw Materials
('RM001', 'Steel Rod 10mm', '10mm diameter steel rod', 'meter', 'raw_material', 456.50, 1),
('RM002', 'Aluminum Sheet', '2mm thick aluminum sheet', 'sqm', 'raw_material', 996.00, 1),
('RM003', 'Plastic Pellets', 'High-grade plastic pellets', 'kg', 'raw_material', 269.75, 1),
('RM004', 'Screws M6', 'M6 stainless steel screws', 'pcs', 'raw_material', 12.45, 1),
('RM005', 'Paint - Blue', 'Industrial blue paint', 'liter', 'raw_material', 726.25, 1),

-- Semi-finished goods
('SF001', 'Machined Rod', 'Processed steel rod component', 'pcs', 'semi_finished', 1245.00, 1),
('SF002', 'Cut Aluminum Panel', 'Cut and shaped aluminum panel', 'pcs', 'semi_finished', 2075.00, 1),
('SF003', 'Molded Plastic Part', 'Injection molded plastic component', 'pcs', 'semi_finished', 705.00, 1),

-- Finished goods
('FG001', 'Product A', 'Complete assembled product A', 'pcs', 'finished_good', 12450.00, 1),
('FG002', 'Product B', 'Complete assembled product B', 'pcs', 'finished_good', 16600.00, 1),
('FG003', 'Product C', 'Premium assembled product C', 'pcs', 'finished_good', 29050.00, 1);

-- Insert sample BOM with operations
INSERT INTO bom (bom_name, item_id, quantity, company_id) VALUES
('BOM for Product A', (SELECT id FROM items WHERE item_code = 'FG001'), 1, 1);

-- Insert BOM components
INSERT INTO bom_items (bom_id, item_id, quantity, company_id) VALUES
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'SF001'), 2, 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'SF003'), 1, 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'RM004'), 4, 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM items WHERE item_code = 'RM005'), 0.1, 1);

-- Insert BOM operations (manufacturing steps)
INSERT INTO bom_operations (bom_id, work_center_id, operation_name, operation_description, duration_minutes, execution_order, company_id) VALUES
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM work_centers WHERE name = 'Assembly Line 1'), 'Assembly', 'Assemble components into final product', 60, 1, 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM work_centers WHERE name = 'Quality Control'), 'Quality Check', 'Inspect assembled product', 30, 2, 1),
((SELECT id FROM bom WHERE bom_name = 'BOM for Product A'), (SELECT id FROM work_centers WHERE name = 'Packaging Station'), 'Packaging', 'Package final product', 20, 3, 1);

-- Insert initial stock (converted to INR)
INSERT INTO stock_ledger (item_id, voucher_type, voucher_no, actual_qty, qty_after_transaction, rate, value_after_transaction, company_id) VALUES
-- Raw materials initial stock
((SELECT id FROM items WHERE item_code = 'RM001'), 'stock_adjustment', 'INIT-001', 1000, 1000, 456.50, 456500.00, 1),
((SELECT id FROM items WHERE item_code = 'RM002'), 'stock_adjustment', 'INIT-002', 500, 500, 996.00, 498000.00, 1),
((SELECT id FROM items WHERE item_code = 'RM003'), 'stock_adjustment', 'INIT-003', 200, 200, 269.75, 53950.00, 1),
((SELECT id FROM items WHERE item_code = 'RM004'), 'stock_adjustment', 'INIT-004', 5000, 5000, 12.45, 62250.00, 1),
((SELECT id FROM items WHERE item_code = 'RM005'), 'stock_adjustment', 'INIT-005', 100, 100, 726.25, 72625.00, 1),

-- Semi-finished goods initial stock
((SELECT id FROM items WHERE item_code = 'SF001'), 'stock_adjustment', 'INIT-006', 50, 50, 1245.00, 62250.00, 1),
((SELECT id FROM items WHERE item_code = 'SF002'), 'stock_adjustment', 'INIT-007', 30, 30, 2075.00, 62250.00, 1),
((SELECT id FROM items WHERE item_code = 'SF003'), 'stock_adjustment', 'INIT-008', 80, 80, 705.00, 56400.00, 1);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE RESTRUCTURE COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New BOM Operations Structure:';
    RAISE NOTICE '- Components: Stored in bom_items table';
    RAISE NOTICE '- Operations: Stored in bom_operations table (BOM-level)';
    RAISE NOTICE '- Work Centers: Linked to operations';
    RAISE NOTICE '- Multi-tenancy: All tables have company_id';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample Data Created:';
    RAISE NOTICE '- 1 Company (Default Company)';
    RAISE NOTICE '- 4 Users (admin, manager, 2 operators)';
    RAISE NOTICE '- 5 Work Centers';
    RAISE NOTICE '- 11 Items (raw materials, semi-finished, finished goods)';
    RAISE NOTICE '- 1 BOM with 4 components and 3 operations';
    RAISE NOTICE '- Initial stock ledger entries';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '- admin@company.com : password123';
    RAISE NOTICE '- manager@company.com : password123';
    RAISE NOTICE '- operator1@company.com : password123';
    RAISE NOTICE '- operator2@company.com : password123';
    RAISE NOTICE '========================================';
END $$;