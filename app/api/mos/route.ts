import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state")
    const assignee = searchParams.get("assignee")

    let query = `
      SELECT mo.*, p.name as product_name, u.name as assignee_name,
             COUNT(wo.id) as total_work_orders,
             COUNT(CASE WHEN wo.state = 'DONE' THEN 1 END) as completed_work_orders
      FROM manufacturing_orders mo
      LEFT JOIN products p ON mo.product_id = p.id
      LEFT JOIN users u ON mo.assignee_id = u.id
      LEFT JOIN work_orders wo ON mo.id = wo.mo_id
    `

    const conditions = []
    const params = []

    if (state) {
      conditions.push(`mo.state = $${params.length + 1}`)
      params.push(state)
    }

    if (assignee) {
      conditions.push(`mo.assignee_id = $${params.length + 1}`)
      params.push(assignee)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
    }

    query += ` GROUP BY mo.id, p.name, u.name ORDER BY mo.created_at DESC`

    const result = await sql.unsafe(query, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Get MOs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { productId, qty, deadline, priority } = await request.json()

    // Create manufacturing order
    const moResult = await sql`
      INSERT INTO manufacturing_orders (product_id, qty, deadline, priority, state, created_at, updated_at)
      VALUES (${productId}, ${qty}, ${deadline}, ${priority || "MEDIUM"}, 'DRAFT', NOW(), NOW())
      RETURNING *
    `

    const mo = moResult[0]

    // Auto-generate work orders from BOM
    await generateWorkOrdersFromBOM(mo.id, productId, qty)

    return NextResponse.json(mo, { status: 201 })
  } catch (error) {
    console.error("Create MO error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateWorkOrdersFromBOM(moId: string, productId: string, qty: number) {
  // Get BOM for the product
  const bomLines = await sql`
    SELECT bl.*, p.name as component_name
    FROM bom_lines bl
    LEFT JOIN products p ON bl.component_id = p.id
    WHERE bl.product_id = ${productId}
  `

  // Get available work centers
  const workCenters = await sql`
    SELECT * FROM work_centers ORDER BY id LIMIT 1
  `

  if (workCenters.length === 0) return

  const workCenter = workCenters[0]

  // Create work orders for each BOM line
  for (const bomLine of bomLines) {
    await sql`
      INSERT INTO work_orders (mo_id, operation, work_center_id, state, required_qty, created_at)
      VALUES (
        ${moId}, 
        ${"Process " + bomLine.component_name}, 
        ${workCenter.id}, 
        'TODO', 
        ${bomLine.qty_per_unit * qty},
        NOW()
      )
    `
  }
}
