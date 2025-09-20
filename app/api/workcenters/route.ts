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

    const result = await sql`
      SELECT wc.*,
             COUNT(wo.id) as active_work_orders,
             COUNT(CASE WHEN wo.status = 'in_progress' THEN 1 END) as running_work_orders
      FROM work_centers wc
      LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.status IN ('pending', 'in_progress') AND wo.company_id = ${userCompanyId}
      WHERE wc.company_id = ${userCompanyId}
      GROUP BY wc.id
      ORDER BY wc.name
    `

    return NextResponse.json(result)
  } catch (error) {
    console.error("Get work centers error:", error)
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
    const { name, description, capacity_per_hour } = await request.json()

    if (!name || !capacity_per_hour) {
      return NextResponse.json({ error: "Name and capacity per hour are required" }, { status: 400 })
    }

    // Check if work center name already exists for this company
    const existingWC = await sql`
      SELECT id FROM work_centers
      WHERE name = ${name} AND company_id = ${userCompanyId}
    `

    if (existingWC.length > 0) {
      return NextResponse.json({ error: "Work center name already exists" }, { status: 400 })
    }

    // Create new work center
    const newWC = await sql`
      INSERT INTO work_centers (
        name, description, capacity_per_hour, company_id, created_at, updated_at
      )
      VALUES (
        ${name}, ${description || null}, ${capacity_per_hour}, ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(newWC[0])
  } catch (error) {
    console.error("Create work center error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
