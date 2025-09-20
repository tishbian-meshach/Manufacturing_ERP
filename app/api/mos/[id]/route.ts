import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT mo.*, p.name as product_name, u.name as assignee_name
      FROM manufacturing_orders mo
      LEFT JOIN products p ON mo.product_id = p.id
      LEFT JOIN users u ON mo.assignee_id = u.id
      WHERE mo.id = ${params.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found" }, { status: 404 })
    }

    // Get associated work orders
    const workOrders = await sql`
      SELECT wo.*, wc.name as work_center_name, u.name as assigned_to_name
      FROM work_orders wo
      LEFT JOIN work_centers wc ON wo.work_center_id = wc.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      WHERE wo.mo_id = ${params.id}
      ORDER BY wo.created_at
    `

    return NextResponse.json({
      ...result[0],
      work_orders: workOrders,
    })
  } catch (error) {
    console.error("Get MO error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await request.json()

    const result = await sql`
      UPDATE manufacturing_orders 
      SET ${sql(updates)}, updated_at = NOW()
      WHERE id = ${params.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Update MO error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
