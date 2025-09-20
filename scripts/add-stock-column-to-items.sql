-- Add stock column to items table
-- This script adds a stock column to track current inventory levels

-- Add stock column to items table
ALTER TABLE items ADD COLUMN stock DECIMAL(10,3) DEFAULT 0;

-- Update existing items with current stock from stock_ledger
-- Calculate current stock by summing actual_qty for each item
UPDATE items
SET stock = COALESCE((
    SELECT SUM(sl.actual_qty)
    FROM stock_ledger sl
    WHERE sl.item_id = items.id
    AND sl.company_id = items.company_id
), 0);

-- Add comment to document the column
COMMENT ON COLUMN items.stock IS 'Current stock quantity for the item';

-- Create index for better performance
CREATE INDEX idx_items_stock ON items(stock);

-- Update the updated_at timestamp for all items
UPDATE items SET updated_at = NOW() WHERE true;