import { sql } from './db';

/**
 * Updates the stock column in the items table based on stock ledger entries
 * @param itemId - The item ID to update
 * @param companyId - The company ID for multi-tenancy
 */
export async function updateItemStock(itemId: number, companyId: number) {
  try {
    // Calculate current stock by summing all stock ledger entries for this item
    const result = await sql`
      SELECT COALESCE(SUM(actual_qty), 0) as current_stock
      FROM stock_ledger
      WHERE item_id = ${itemId} AND company_id = ${companyId}
    `;

    const currentStock = result[0]?.current_stock || 0;

    // Update the stock column in items table
    await sql`
      UPDATE items
      SET stock = ${currentStock}, updated_at = NOW()
      WHERE id = ${itemId} AND company_id = ${companyId}
    `;

    console.log(`📦 Updated stock for item ${itemId}: ${currentStock}`);
    return currentStock;
  } catch (error) {
    console.error('Error updating item stock:', error);
    throw error;
  }
}

/**
 * Updates stock for multiple items at once
 * @param itemIds - Array of item IDs to update
 * @param companyId - The company ID for multi-tenancy
 */
export async function updateMultipleItemStocks(itemIds: number[], companyId: number) {
  try {
    const promises = itemIds.map(itemId => updateItemStock(itemId, companyId));
    await Promise.all(promises);
    console.log(`📦 Updated stock for ${itemIds.length} items`);
  } catch (error) {
    console.error('Error updating multiple item stocks:', error);
    throw error;
  }
}

/**
 * Recalculates stock for all items in a company
 * This is useful for initial setup or data correction
 * @param companyId - The company ID for multi-tenancy
 */
export async function recalculateAllStocks(companyId: number) {
  try {
    console.log('🔄 Recalculating stocks for all items...');

    // Get all item IDs for the company
    const items = await sql`
      SELECT id FROM items
      WHERE company_id = ${companyId} AND is_active = true
    `;

    const itemIds = items.map(item => item.id);
    await updateMultipleItemStocks(itemIds, companyId);

    console.log('✅ All stocks recalculated successfully');
  } catch (error) {
    console.error('Error recalculating all stocks:', error);
    throw error;
  }
}