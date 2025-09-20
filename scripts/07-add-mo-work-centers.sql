-- Create mo_work_centers table to store work center assignments for manufacturing orders
CREATE TABLE IF NOT EXISTS mo_work_centers (
    id SERIAL PRIMARY KEY,
    manufacturing_order_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    work_center_id INTEGER REFERENCES work_centers(id) ON DELETE CASCADE,
    execution_order INTEGER NOT NULL,
    is_parallel BOOLEAN DEFAULT FALSE,
    estimated_hours DECIMAL(6,2) NULL DEFAULT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mo_work_centers_mo_id ON mo_work_centers(manufacturing_order_id);
CREATE INDEX IF NOT EXISTS idx_mo_work_centers_wc_id ON mo_work_centers(work_center_id);
CREATE INDEX IF NOT EXISTS idx_mo_work_centers_execution_order ON mo_work_centers(execution_order);
CREATE INDEX IF NOT EXISTS idx_mo_work_centers_company_id ON mo_work_centers(company_id);

-- Create updated_at trigger
CREATE TRIGGER update_mo_work_centers_updated_at
    BEFORE UPDATE ON mo_work_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Assign existing data to default company if it exists
DO $$
DECLARE
    default_company_id INTEGER;
BEGIN
    SELECT id INTO default_company_id FROM companies LIMIT 1;

    IF default_company_id IS NOT NULL THEN
        UPDATE mo_work_centers SET company_id = default_company_id WHERE company_id IS NULL;
    END IF;
END $$;