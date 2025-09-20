-- Migration: Add stock column to items table
-- This migration adds a stock column to track current inventory levels
-- Run this after the main database restructure

-- =====================================================
-- MIGRATION: Add stock column to items table
-- =====================================================

-- Check if stock column already exists (safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'stock'
    ) THEN
        -- Add stock column to items table
        ALTER TABLE items ADD COLUMN stock DECIMAL(10,3) DEFAULT 0;

        -- Add comment to document the column
        COMMENT ON COLUMN items.stock IS 'Current stock quantity for the item';

        -- Create index for better performance
        CREATE INDEX idx_items_stock ON items(stock);

        RAISE NOTICE '✅ Stock column added to items table';
    ELSE
        RAISE NOTICE '⚠️  Stock column already exists in items table';
    END IF;
END $$;

-- Update existing items with current stock from stock_ledger
-- Calculate current stock by summing actual_qty for each item
UPDATE items
SET stock = COALESCE((
    SELECT SUM(sl.actual_qty)
    FROM stock_ledger sl
    WHERE sl.item_id = items.id
    AND sl.company_id = items.company_id
), 0)
WHERE stock = 0 OR stock IS NULL;

-- Update the updated_at timestamp for all items
UPDATE items SET updated_at = NOW() WHERE true;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    item_count INTEGER;
    stock_column_exists BOOLEAN;
BEGIN
    -- Check if stock column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'items' AND column_name = 'stock'
    ) INTO stock_column_exists;

    -- Count items
    SELECT COUNT(*) INTO item_count FROM items;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Stock column exists: %', stock_column_exists;
    RAISE NOTICE 'Total items: %', item_count;
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;