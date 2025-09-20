-- Add BOM operations table to define work centers and durations for each component
-- This enables detailed manufacturing recipes with operations

-- Create bom_operations table
CREATE TABLE IF NOT EXISTS bom_operations (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE,
    bom_item_id INTEGER REFERENCES bom_items(id) ON DELETE CASCADE,
    work_center_id INTEGER REFERENCES work_centers(id) ON DELETE CASCADE,
    operation_name VARCHAR(255) NOT NULL,
    operation_description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    execution_order INTEGER NOT NULL DEFAULT 1,
    is_parallel BOOLEAN DEFAULT FALSE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bom_operations_bom_id ON bom_operations(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_operations_bom_item_id ON bom_operations(bom_item_id);
CREATE INDEX IF NOT EXISTS idx_bom_operations_work_center_id ON bom_operations(work_center_id);
CREATE INDEX IF NOT EXISTS idx_bom_operations_company_id ON bom_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_operations_execution_order ON bom_operations(execution_order);

-- Add updated_at trigger
CREATE TRIGGER update_bom_operations_updated_at
    BEFORE UPDATE ON bom_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE bom_operations ADD CONSTRAINT check_duration_positive CHECK (duration_minutes >= 0);
ALTER TABLE bom_operations ADD CONSTRAINT check_execution_order_positive CHECK (execution_order > 0);