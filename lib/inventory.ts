import { sql } from "./db"

export interface StockLedgerEntry {
  id: number
  item_id: number
  voucher_type: string
  voucher_no: string
  actual_qty: number
  qty_after_transaction: number
  rate: number
  value_after_transaction: number
  posting_date: string
  posting_time: string
  created_at: string
  // Joined fields
  item_code?: string
  item_name?: string
  unit_of_measure?: string
}

export interface Item {
  id: number
  item_code: string
  item_name: string
  description?: string
  unit_of_measure: string
  item_type: "raw_material" | "finished_good" | "semi_finished"
  standard_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
  current_stock?: number
}

export interface BOM {
  id: number
  item_id: number
  bom_name: string
  quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  item_code?: string
  item_name?: string
  components?: BOMItem[]
}

export interface BOMItem {
  id: number
  bom_id: number
  item_id: number
  quantity: number
  created_at: string
  // Joined fields
  item_code?: string
  item_name?: string
  unit_of_measure?: string
  current_stock?: number
}

export async function getAllItems(): Promise<Item[]> {
  const result = await sql`
    SELECT 
      i.*,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM items i
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE i.is_active = true
    GROUP BY i.id, i.item_code, i.item_name, i.description, i.unit_of_measure, 
             i.item_type, i.standard_rate, i.is_active, i.created_at, i.updated_at
    ORDER BY i.item_code
  `
  return result as Item[]
}

export async function getItemById(id: number): Promise<Item | null> {
  const result = await sql`
    SELECT 
      i.*,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM items i
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE i.id = ${id}
    GROUP BY i.id, i.item_code, i.item_name, i.description, i.unit_of_measure, 
             i.item_type, i.standard_rate, i.is_active, i.created_at, i.updated_at
  `
  return (result[0] as Item) || null
}

export async function createItem(data: {
  item_code: string
  item_name: string
  description?: string
  unit_of_measure: string
  item_type: string
  standard_rate: number
}): Promise<Item> {
  const result = await sql`
    INSERT INTO items (item_code, item_name, description, unit_of_measure, item_type, standard_rate)
    VALUES (${data.item_code}, ${data.item_name}, ${data.description || null}, 
            ${data.unit_of_measure}, ${data.item_type}, ${data.standard_rate})
    RETURNING *
  `
  return result[0] as Item
}

export async function getStockLedgerEntries(itemId?: number): Promise<StockLedgerEntry[]> {
  const result = itemId
    ? await sql`
        SELECT 
          sl.*,
          i.item_code,
          i.item_name,
          i.unit_of_measure
        FROM stock_ledger sl
        LEFT JOIN items i ON sl.item_id = i.id
        WHERE sl.item_id = ${itemId}
        ORDER BY sl.posting_date DESC, sl.posting_time DESC, sl.created_at DESC
      `
    : await sql`
        SELECT 
          sl.*,
          i.item_code,
          i.item_name,
          i.unit_of_measure
        FROM stock_ledger sl
        LEFT JOIN items i ON sl.item_id = i.id
        ORDER BY sl.posting_date DESC, sl.posting_time DESC, sl.created_at DESC
        LIMIT 100
      `
  return result as StockLedgerEntry[]
}

export async function createStockEntry(data: {
  item_id: number
  voucher_type: string
  voucher_no: string
  actual_qty: number
  rate?: number
  posting_date?: string
}): Promise<StockLedgerEntry> {
  // Get current stock
  const currentStock = await getCurrentStock(data.item_id)
  const qtyAfterTransaction = currentStock + data.actual_qty
  const rate = data.rate || 0
  const valueAfterTransaction = qtyAfterTransaction * rate

  const result = await sql`
    INSERT INTO stock_ledger (
      item_id, voucher_type, voucher_no, actual_qty, 
      qty_after_transaction, rate, value_after_transaction, 
      posting_date, posting_time
    )
    VALUES (
      ${data.item_id}, ${data.voucher_type}, ${data.voucher_no}, ${data.actual_qty},
      ${qtyAfterTransaction}, ${rate}, ${valueAfterTransaction},
      ${data.posting_date || new Date().toISOString().split("T")[0]}, 
      ${new Date().toTimeString().split(" ")[0]}
    )
    RETURNING *
  `
  return result[0] as StockLedgerEntry
}

async function getCurrentStock(itemId: number): Promise<number> {
  const result = await sql`
    SELECT COALESCE(SUM(actual_qty), 0) as current_stock
    FROM stock_ledger
    WHERE item_id = ${itemId}
  `
  return Number(result[0]?.current_stock || 0)
}

export async function getAllBOMs(): Promise<BOM[]> {
  const result = await sql`
    SELECT 
      b.*,
      i.item_code,
      i.item_name
    FROM bom b
    LEFT JOIN items i ON b.item_id = i.id
    WHERE b.is_active = true
    ORDER BY b.bom_name
  `
  return result as BOM[]
}

export async function getBOMById(id: number): Promise<BOM | null> {
  const result = await sql`
    SELECT 
      b.*,
      i.item_code,
      i.item_name
    FROM bom b
    LEFT JOIN items i ON b.item_id = i.id
    WHERE b.id = ${id}
  `
  return (result[0] as BOM) || null
}

export async function getBOMItems(bomId: number): Promise<BOMItem[]> {
  const result = await sql`
    SELECT 
      bi.*,
      i.item_code,
      i.item_name,
      i.unit_of_measure,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM bom_items bi
    LEFT JOIN items i ON bi.item_id = i.id
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE bi.bom_id = ${bomId}
    GROUP BY bi.id, bi.bom_id, bi.item_id, bi.quantity, bi.created_at,
             i.item_code, i.item_name, i.unit_of_measure
    ORDER BY i.item_code
  `
  return result as BOMItem[]
}

export async function createBOM(data: {
  item_id: number
  bom_name: string
  quantity: number
  components: { item_id: number; quantity: number }[]
}): Promise<BOM> {
  // Create BOM
  const bomResult = await sql`
    INSERT INTO bom (item_id, bom_name, quantity)
    VALUES (${data.item_id}, ${data.bom_name}, ${data.quantity})
    RETURNING *
  `

  const bom = bomResult[0] as BOM

  // Create BOM items
  for (const component of data.components) {
    await sql`
      INSERT INTO bom_items (bom_id, item_id, quantity)
      VALUES (${bom.id}, ${component.item_id}, ${component.quantity})
    `
  }

  return bom
}

export async function getLowStockItems(threshold = 10): Promise<Item[]> {
  const result = await sql`
    SELECT 
      i.*,
      COALESCE(SUM(sl.actual_qty), 0) as current_stock
    FROM items i
    LEFT JOIN stock_ledger sl ON i.id = sl.item_id
    WHERE i.is_active = true
    GROUP BY i.id, i.item_code, i.item_name, i.description, i.unit_of_measure, 
             i.item_type, i.standard_rate, i.is_active, i.created_at, i.updated_at
    HAVING COALESCE(SUM(sl.actual_qty), 0) <= ${threshold}
    ORDER BY current_stock ASC
  `
  return result as Item[]
}
