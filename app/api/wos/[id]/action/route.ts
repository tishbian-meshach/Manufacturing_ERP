import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, notes } = await request.json()
    const userId = authResult.user.userId

    const updateData: any = { updated_at: new Date() }

    switch (action) {
      case "start":
        updateData.state = "STARTED"
        updateData.started_at = new Date()
        updateData.assigned_to = userId
        break
      case "pause":
        updateData.state = "PAUSED"
        break
      case "done":
        updateData.state = "DONE"
        updateData.ended_at = new Date()
        break
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (notes) {
      updateData.notes = notes
    }

    const result = await sql`
      UPDATE work_orders 
      SET ${sql(updateData)}
      WHERE id = ${params.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    // Update work center utilization
    if (action === "start" || action === "done") {
      await updateWorkCenterUtilization(result[0].work_center_id)
    }

    // Create stock ledger entry if work order is completed
    if (action === "done") {
      await createStockLedgerEntry(result[0])
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("WO action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function updateWorkCenterUtilization(workCenterId: string) {
  const activeWOs = await sql`
    SELECT COUNT(*) as active_count
    FROM work_orders 
    WHERE work_center_id = ${workCenterId} AND state IN ('STARTED', 'PAUSED')
  `

  const workCenter = await sql`
    SELECT capacity FROM work_centers WHERE id = ${workCenterId}
  `

  if (workCenter.length > 0) {
    const utilization = (activeWOs[0].active_count / workCenter[0].capacity) * 100

    await sql`
      UPDATE work_centers 
      SET utilization = ${Math.min(utilization, 100)}
      WHERE id = ${workCenterId}
    `
  }
}

async function createStockLedgerEntry(workOrder: any) {
  // Get the manufacturing order to find the product
  const mo = await sql`
    SELECT product_id, qty FROM manufacturing_orders WHERE id = ${workOrder.mo_id}
  `

  if (mo.length > 0) {
    // Create stock ledger entry for completed production
    await sql`
      INSERT INTO stock_ledger (product_id, qty, type, source, balance, created_at)
      VALUES (
        ${mo[0].product_id}, 
        ${workOrder.required_qty || 1}, 
        'in', 
        ${workOrder.id}, 
        (SELECT COALESCE(MAX(balance), 0) + ${workOrder.required_qty || 1} FROM stock_ledger WHERE product_id = ${mo[0].product_id}),
        NOW()
      )
    `

    // Update product stock quantity
    await sql`
      UPDATE products 
      SET stock_qty = stock_qty + ${workOrder.required_qty || 1}
      WHERE id = ${mo[0].product_id}
    `
  }
}
