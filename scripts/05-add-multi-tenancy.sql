-- Add multi-tenancy support by adding company_id to all business tables
-- This ensures data isolation between different companies

-- Add company_id to work_centers table
ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to bom table
ALTER TABLE bom ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to bom_items table (inherited from bom)
ALTER TABLE bom_items ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to manufacturing_orders table
ALTER TABLE manufacturing_orders ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to stock_ledger table
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Create settings table for application settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    company_name TEXT,
    company_domain TEXT,
    email_notifications BOOLEAN DEFAULT TRUE,
    auto_backup BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    theme TEXT DEFAULT 'system',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Create indexes for better performance on company-specific queries
CREATE INDEX IF NOT EXISTS idx_work_centers_company_id ON work_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_items_company_id ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_company_id ON bom(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_company_id ON bom_items(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company_id ON manufacturing_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_id ON stock_ledger(company_id);

-- Update existing records to belong to the first company (if any exists)
-- This is for existing data migration
DO $$
DECLARE
    first_company_id INTEGER;
BEGIN
    SELECT id INTO first_company_id FROM companies LIMIT 1;

    IF first_company_id IS NOT NULL THEN
        UPDATE work_centers SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE items SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE bom SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE bom_items SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE manufacturing_orders SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE work_orders SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE stock_ledger SET company_id = first_company_id WHERE company_id IS NULL;
    END IF;
END $$;

-- Make company_id NOT NULL for new records (existing records can be NULL during migration)
-- Note: We'll handle this in application logic rather than making it NOT NULL immediately
-- to avoid breaking existing data