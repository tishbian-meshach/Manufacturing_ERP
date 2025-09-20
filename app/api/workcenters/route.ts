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

    // Get work centers with utilization based on active work orders
    const result = await sql`
      SELECT
        wc.*,
        COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) as active_work_orders,
        COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) as running_work_orders,
        ROUND(
          CASE
            WHEN wc.capacity_per_hour > 0 THEN
              LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) * 100.0) / wc.capacity_per_hour)
            ELSE 0
          END
        ) as utilization_percentage
      FROM work_centers wc
      LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.company_id = ${userCompanyId} AND wo.status = 'in_progress'
      WHERE wc.company_id = ${userCompanyId}
      GROUP BY wc.id, wc.capacity_per_hour
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
