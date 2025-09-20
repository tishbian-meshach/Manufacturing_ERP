-- Database Performance Optimization Script
-- This script creates indexes to improve query performance for the manufacturing ERP system

-- Indexes for manufacturing_orders table
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_id ON manufacturing_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_status ON manufacturing_orders(status);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_created_at ON manufacturing_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_status ON manufacturing_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_created ON manufacturing_orders(company_id, created_at DESC);

-- Indexes for work_orders table
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_manufacturing_order_id ON work_orders(manufacturing_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_center_id ON work_orders(work_center_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_status ON work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_planned_end_time ON work_orders(planned_end_time);

-- Indexes for work_centers table
CREATE INDEX IF NOT EXISTS idx_work_centers_company_id ON work_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_work_centers_is_active ON work_centers(is_active);

-- Indexes for items table
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_company_active ON items(company_id, is_active);

-- Indexes for stock_ledger table
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_id ON stock_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_id ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_posting_date ON stock_ledger(posting_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_item ON stock_ledger(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_date ON stock_ledger(company_id, posting_date DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_efficiency_calc ON manufacturing_orders(company_id, status, planned_qty, produced_qty);
CREATE INDEX IF NOT EXISTS idx_work_orders_utilization_calc ON work_orders(work_center_id, status, company_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_date_range ON manufacturing_orders(company_id, created_at) WHERE created_at >= CURRENT_DATE - INTERVAL '6 months';
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date_range ON stock_ledger(company_id, posting_date) WHERE posting_date >= CURRENT_DATE - INTERVAL '4 weeks';

-- Analyze tables to update statistics
ANALYZE manufacturing_orders;
ANALYZE work_orders;
ANALYZE work_centers;
ANALYZE items;
ANALYZE stock_ledger;

-- Vacuum tables to reclaim space and update statistics
VACUUM ANALYZE manufacturing_orders;
VACUUM ANALYZE work_orders;
VACUUM ANALYZE work_centers;
VACUUM ANALYZE items;
VACUUM ANALYZE stock_ledger;