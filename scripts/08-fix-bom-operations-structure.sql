-- Fix BOM operations structure to link to BOM instead of individual components
-- Operations should be at the BOM level, not component level

-- Remove the bom_item_id column since operations are at BOM level
ALTER TABLE bom_operations DROP COLUMN IF EXISTS bom_item_id;

-- Add any missing constraints or indexes if needed
-- The table should now have: bom_id, work_center_id, operation_name, etc.

-- Update existing data if any (though there shouldn't be any yet)
-- This is just for safety in case there's test data