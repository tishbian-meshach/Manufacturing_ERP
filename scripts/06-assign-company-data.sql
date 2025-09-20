-- Assign company IDs to existing seed data
-- This script should run after companies have been created

DO $$
DECLARE
    default_company_id INTEGER;
BEGIN
    -- Get the first company (or create a default one if none exists)
    SELECT id INTO default_company_id FROM companies LIMIT 1;

    -- If no companies exist, create a default company
    IF default_company_id IS NULL THEN
        INSERT INTO companies (name, domain, created_at, updated_at)
        VALUES ('Default Company', 'default.com', NOW(), NOW())
        RETURNING id INTO default_company_id;
    END IF;

    -- Assign company_id to work_centers
    UPDATE work_centers SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to items
    UPDATE items SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to bom
    UPDATE bom SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to bom_items
    UPDATE bom_items SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to manufacturing_orders
    UPDATE manufacturing_orders SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to work_orders
    UPDATE work_orders SET company_id = default_company_id WHERE company_id IS NULL;

    -- Assign company_id to stock_ledger
    UPDATE stock_ledger SET company_id = default_company_id WHERE company_id IS NULL;

    RAISE NOTICE 'Assigned company_id % to all existing business data', default_company_id;
END $$;