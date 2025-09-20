-- Add admin_id column to companies table if it doesn't exist
ALTER TABLE companies ADD COLUMN IF NOT EXISTS admin_id TEXT;

-- Add foreign key constraint for admin_id referencing users table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_companies_admin' 
        AND table_name = 'companies'
    ) THEN
        ALTER TABLE companies 
        ADD CONSTRAINT fk_companies_admin 
        FOREIGN KEY (admin_id) REFERENCES users(id);
    END IF;
END $$;

-- Ensure password column exists in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Add company_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER;

-- Add foreign key constraint for company_id referencing companies table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_company' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
END $$;
