import { sql } from "./db"

export interface ManufacturingOrder {
  id: number
  mo_number: string
  item_id: number
  bom_id: number
  planned_qty: number
  produced_qty: number
  status: "draft" | "in_progress" | "completed" | "cancelled"
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  priority: "low" | "medium" | "high" | "urgent"
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  item_name?: string
  item_code?: string
  bom_name?: string
}

export async function getAllManufacturingOrders(): Promise<ManufacturingOrder[]> {
  const result = await sql`
    SELECT 
      mo.*,
      i.item_name,
      i.item_code,
      b.bom_name
    FROM manufacturing_orders mo
    LEFT JOIN items i ON mo.item_id = i.id
    LEFT JOIN bom b ON mo.bom_id = b.id
    ORDER BY mo.created_at DESC
  `
  return result as ManufacturingOrder[]
}

export async function getManufacturingOrderById(id: number): Promise<ManufacturingOrder | null> {
  const result = await sql`
    SELECT 
      mo.*,
      i.item_name,
      i.item_code,
      b.bom_name
    FROM manufacturing_orders mo
    LEFT JOIN items i ON mo.item_id = i.id
    LEFT JOIN bom b ON mo.bom_id = b.id
    WHERE mo.id = ${id}
  `
  return (result[0] as ManufacturingOrder) || null
}

export async function createManufacturingOrder(data: {
  item_id: number
  bom_id: number
  planned_qty: number
  planned_start_date?: string
  planned_end_date?: string
  priority?: string
  created_by: string
}): Promise<ManufacturingOrder> {
  // Generate MO number
  const moNumber = `MO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  const result = await sql`
    INSERT INTO manufacturing_orders (
      mo_number, item_id, bom_id, planned_qty, 
      planned_start_date, planned_end_date, priority, created_by
    )
    VALUES (
      ${moNumber}, ${data.item_id}, ${data.bom_id}, ${data.planned_qty},
      ${data.planned_start_date || null}, ${data.planned_end_date || null}, 
      ${data.priority || "medium"}, ${data.created_by}
    )
    RETURNING *
  `
  return result[0] as ManufacturingOrder
}

export async function updateManufacturingOrder(
  id: number,
  data: Partial<ManufacturingOrder>,
): Promise<ManufacturingOrder> {
  const updateFields = Object.keys(data)
    .filter((key) => key !== "id" && data[key as keyof ManufacturingOrder] !== undefined)
    .map((key) => `${key} = $${key}`)
    .join(", ")

  if (!updateFields) {
    throw new Error("No fields to update")
  }

  const result = await sql`
    UPDATE manufacturing_orders 
    SET ${sql.unsafe(updateFields)}
    WHERE id = ${id}
    RETURNING *
  `
  return result[0] as ManufacturingOrder
}

export async function getItemsForMO() {
  const result = await sql`
    SELECT id, item_code, item_name, item_type
    FROM items 
    WHERE item_type = 'finished_good' AND is_active = true
    ORDER BY item_name
  `
  return result
}

export async function getBOMsForItem(itemId: number) {
  const result = await sql`
    SELECT id, bom_name, quantity
    FROM bom 
    WHERE item_id = ${itemId} AND is_active = true
    ORDER BY bom_name
  `
  return result
}
