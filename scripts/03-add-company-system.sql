-- Adding company and invitation tables for role-based signup system
-- Add companies table for multi-tenant support
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    admin_id TEXT, -- Changed from INTEGER to TEXT to match users.id type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add invitations table for user invitation system
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'inventory')),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Update users table to include company relationship
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Update foreign key constraint for companies admin_id
-- Fixed foreign key constraint to match TEXT type
ALTER TABLE companies ADD CONSTRAINT fk_companies_admin FOREIGN KEY (admin_id) REFERENCES users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
