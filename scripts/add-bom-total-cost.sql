-- Add total_cost column to bom table
ALTER TABLE bom ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0;

-- Update existing BOMs with calculated total costs
UPDATE bom
SET total_cost = COALESCE((
  SELECT SUM(bi.quantity * i.standard_rate)
  FROM bom_items bi
  LEFT JOIN items i ON bi.item_id = i.id
  WHERE bi.bom_id = bom.id
), 0)
WHERE total_cost IS NULL OR total_cost = 0;