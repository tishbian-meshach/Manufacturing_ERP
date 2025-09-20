-- Manufacturing ERP-Lite Database Schema
-- This script creates all the required tables for the ERP system

-- Users table (extends the existing users_sync table)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Centers table
CREATE TABLE IF NOT EXISTS work_centers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity_per_hour INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table (for products and raw materials)
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  item_type TEXT NOT NULL DEFAULT 'finished_good' CHECK (item_type IN ('raw_material', 'finished_good', 'semi_finished')),
  standard_rate DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill of Materials (BOM) table
CREATE TABLE IF NOT EXISTS bom (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  bom_name TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOM Items table (components of a BOM)
CREATE TABLE IF NOT EXISTS bom_items (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manufacturing Orders table
CREATE TABLE IF NOT EXISTS manufacturing_orders (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Orders table
CREATE TABLE IF NOT EXISTS work_orders (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Ledger table
CREATE TABLE IF NOT EXISTS stock_ledger (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
  voucher_type TEXT NOT NULL, -- 'manufacturing_order', 'work_order', 'stock_adjustment'
  voucher_no TEXT NOT NULL,
  actual_qty DECIMAL(10,3) NOT NULL, -- positive for inward, negative for outward
  qty_after_transaction DECIMAL(10,3) NOT NULL,
  rate DECIMAL(10,2) DEFAULT 0,
  value_after_transaction DECIMAL(12,2) DEFAULT 0,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_time TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_status ON manufacturing_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_posting_date ON stock_ledger(posting_date);
CREATE INDEX IF NOT EXISTS idx_bom_item_id ON bom(item_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_mo_id ON work_orders(manufacturing_order_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_centers_updated_at BEFORE UPDATE ON work_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bom_updated_at BEFORE UPDATE ON bom FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON manufacturing_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
