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

    // Get all manufacturing orders for the user's company
    const manufacturingOrders = await sql`
      SELECT
        mo.*,
        i.item_name,
        i.item_code
      FROM manufacturing_orders mo
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId}
      ORDER BY mo.created_at DESC
    `

    return NextResponse.json(manufacturingOrders)
  } catch (error) {
    console.error("Get manufacturing orders error:", error)
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
    const { item_id, bom_id, planned_qty, planned_start_date, planned_end_date, priority } = await request.json()

    if (!item_id || !planned_qty) {
      return NextResponse.json({ error: "Item and planned quantity are required" }, { status: 400 })
    }

    // Generate MO number
    const moNumber = `MO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    // Create manufacturing order
    const newMO = await sql`
      INSERT INTO manufacturing_orders (
        mo_number, item_id, bom_id, planned_qty, status, priority,
        planned_start_date, planned_end_date, company_id, created_at, updated_at
      )
      VALUES (
        ${moNumber}, ${item_id}, ${bom_id || null}, ${planned_qty}, 'draft', ${priority || 'medium'},
        ${planned_start_date || null}, ${planned_end_date || null}, ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(newMO[0])
  } catch (error) {
    console.error("Create manufacturing order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}