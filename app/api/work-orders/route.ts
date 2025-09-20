import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId

    // Get all work orders for the user's company
    const workOrders = await sql`
      SELECT
        wo.*,
        wc.name as work_center_name,
        mo.mo_number,
        i.item_name,
        u.name as assigned_user_name
      FROM work_orders wo
      LEFT JOIN work_centers wc ON wo.work_center_id = wc.id AND wc.company_id = ${userCompanyId}
      LEFT JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id AND mo.company_id = ${userCompanyId}
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      LEFT JOIN users u ON wo.assigned_to = u.id AND u.company_id = ${userCompanyId}
      WHERE wo.company_id = ${userCompanyId}
      ORDER BY wo.created_at DESC
    `

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error("Get work orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const { manufacturing_order_id, work_center_id, operation_name, planned_qty, planned_start_time, planned_end_time, assigned_to } = await request.json()

    if (!manufacturing_order_id || !work_center_id || !operation_name || !planned_qty) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Generate WO number
    const woNumber = `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    // Create work order
    const newWO = await sql`
      INSERT INTO work_orders (
        wo_number, manufacturing_order_id, work_center_id, operation_name,
        planned_qty, status, planned_start_time, planned_end_time, assigned_to,
        company_id, created_at, updated_at
      )
      VALUES (
        ${woNumber}, ${manufacturing_order_id}, ${work_center_id}, ${operation_name},
        ${planned_qty}, 'pending', ${planned_start_time || null}, ${planned_end_time || null}, ${assigned_to || null},
        ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(newWO[0])
  } catch (error) {
    console.error("Create work order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json({ error: "Work order ID and status are required" }, { status: 400 })
    }

    // Handle automatic field updates based on status
    let updateQuery

    if (status === "in_progress") {
      updateQuery = sql`
        UPDATE work_orders
        SET status = ${status}, actual_start_time = NOW(), updated_at = NOW()
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING *
      `
    } else if (status === "completed") {
      updateQuery = sql`
        UPDATE work_orders
        SET status = ${status}, actual_end_time = NOW(), completed_qty = planned_qty, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING *
      `
    } else {
      updateQuery = sql`
        UPDATE work_orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING *
      `
    }

    const updatedWO = await updateQuery

    if (updatedWO.length === 0) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    return NextResponse.json(updatedWO[0])
  } catch (error) {
    console.error("Update work order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}