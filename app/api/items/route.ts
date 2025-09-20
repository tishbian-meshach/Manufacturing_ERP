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
    console.log("🏢 User company ID from database:", userCompanyId)

    // Get all items for the user's company
    const items = await sql`
      SELECT
        i.*,
        COALESCE(SUM(sl.actual_qty), 0) as current_stock
      FROM items i
      LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${userCompanyId}
      WHERE i.company_id = ${userCompanyId} AND i.is_active = true
      GROUP BY i.id
      ORDER BY i.item_code
    `

    console.log("📦 Items found for company", userCompanyId, ":", items.length)

    return NextResponse.json(items)
  } catch (error) {
    console.error("Get items error:", error)
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
    const { item_code, item_name, description, unit_of_measure, item_type, standard_rate } = await request.json()

    if (!item_code || !item_name || !unit_of_measure || !item_type) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Check if item code already exists for this company
    const existingItem = await sql`
      SELECT id FROM items
      WHERE item_code = ${item_code} AND company_id = ${userCompanyId}
    `

    if (existingItem.length > 0) {
      return NextResponse.json({ error: "Item code already exists" }, { status: 400 })
    }

    // Create new item
    const newItem = await sql`
      INSERT INTO items (
        item_code, item_name, description, unit_of_measure,
        item_type, standard_rate, company_id, created_at, updated_at
      )
      VALUES (
        ${item_code}, ${item_name}, ${description || null}, ${unit_of_measure},
        ${item_type}, ${standard_rate || 0}, ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(newItem[0])
  } catch (error) {
    console.error("Create item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}