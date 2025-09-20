-- Remove voucher_no column from stock_ledger table
-- This script removes the voucher_no field as it's no longer needed

-- Remove the voucher_no column from stock_ledger table
ALTER TABLE stock_ledger DROP COLUMN IF EXISTS voucher_no;

-- Update the table comment to reflect the change
COMMENT ON TABLE stock_ledger IS 'Stock ledger table tracking inventory movements without voucher numbers';

-- Note: Existing data will be preserved, only the column structure changes