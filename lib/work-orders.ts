import { sql } from "./db"

export interface WorkOrder {
  id: number
  wo_number: string
  manufacturing_order_id: number
  work_center_id: number
  operation_name: string
  planned_qty: number
  completed_qty: number
  status: "pending" | "in_progress" | "completed" | "on_hold"
  planned_start_time?: string
  planned_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  // Joined fields
  mo_number?: string
  work_center_name?: string
  assigned_user_name?: string
  item_name?: string
}

export interface WorkCenter {
  id: number
  name: string
  description?: string
  capacity_per_hour: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getAllWorkOrders(): Promise<WorkOrder[]> {
  const result = await sql`
    SELECT 
      wo.*,
      mo.mo_number,
      wc.name as work_center_name,
      u.name as assigned_user_name,
      i.item_name
    FROM work_orders wo
    LEFT JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
    LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
    LEFT JOIN users u ON wo.assigned_to = u.id
    LEFT JOIN items i ON mo.item_id = i.id
    ORDER BY wo.created_at DESC
  `
  return result as WorkOrder[]
}

export async function getWorkOrderById(id: number): Promise<WorkOrder | null> {
  const result = await sql`
    SELECT 
      wo.*,
      mo.mo_number,
      wc.name as work_center_name,
      u.name as assigned_user_name,
      i.item_name
    FROM work_orders wo
    LEFT JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
    LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
    LEFT JOIN users u ON wo.assigned_to = u.id
    LEFT JOIN items i ON mo.item_id = i.id
    WHERE wo.id = ${id}
  `
  return (result[0] as WorkOrder) || null
}

export async function createWorkOrder(data: {
  manufacturing_order_id: number
  work_center_id: number
  operation_name: string
  planned_qty: number
  planned_start_time?: string
  planned_end_time?: string
  assigned_to?: string
}): Promise<WorkOrder> {
  // Generate WO number
  const woNumber = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  const result = await sql`
    INSERT INTO work_orders (
      wo_number, manufacturing_order_id, work_center_id, operation_name, 
      planned_qty, planned_start_time, planned_end_time, assigned_to
    )
    VALUES (
      ${woNumber}, ${data.manufacturing_order_id}, ${data.work_center_id}, 
      ${data.operation_name}, ${data.planned_qty}, 
      ${data.planned_start_time || null}, ${data.planned_end_time || null}, 
      ${data.assigned_to || null}
    )
    RETURNING *
  `
  return result[0] as WorkOrder
}

export async function updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder> {
  const updateFields = Object.keys(data)
    .filter((key) => key !== "id" && data[key as keyof WorkOrder] !== undefined)
    .map((key) => `${key} = $${key}`)
    .join(", ")

  if (!updateFields) {
    throw new Error("No fields to update")
  }

  const result = await sql`
    UPDATE work_orders 
    SET ${sql.unsafe(updateFields)}
    WHERE id = ${id}
    RETURNING *
  `
  return result[0] as WorkOrder
}

export async function getAllWorkCenters(): Promise<WorkCenter[]> {
  const result = await sql`
    SELECT * FROM work_centers 
    WHERE is_active = true
    ORDER BY name
  `
  return result as WorkCenter[]
}

export async function createWorkCenter(data: {
  name: string
  description?: string
  capacity_per_hour: number
}): Promise<WorkCenter> {
  const result = await sql`
    INSERT INTO work_centers (name, description, capacity_per_hour)
    VALUES (${data.name}, ${data.description || null}, ${data.capacity_per_hour})
    RETURNING *
  `
  return result[0] as WorkCenter
}

export async function getActiveManufacturingOrders() {
  const result = await sql`
    SELECT 
      mo.id,
      mo.mo_number,
      i.item_name,
      mo.planned_qty
    FROM manufacturing_orders mo
    LEFT JOIN items i ON mo.item_id = i.id
    WHERE mo.status IN ('draft', 'in_progress')
    ORDER BY mo.mo_number
  `
  return result
}

export async function getAvailableUsers() {
  const result = await sql`
    SELECT id, name, email, role
    FROM users 
    WHERE role IN ('operator', 'manager')
    ORDER BY name
  `
  return result
}
