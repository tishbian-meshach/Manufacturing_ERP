import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const bomId = parseInt(params.id)

    if (!bomId) {
      return NextResponse.json({ error: "Invalid BOM ID" }, { status: 400 })
    }

    // Get BOM operations for the specified BOM
    const operations = await sql`
      SELECT
        bo.id,
        bo.bom_id,
        bo.work_center_id,
        bo.operation_name,
        bo.operation_description,
        bo.duration_minutes,
        bo.company_id,
        bo.created_at,
        bo.updated_at,
        wc.name as work_center_name,
        wc.capacity_per_hour
      FROM bom_operations bo
      JOIN work_centers wc ON bo.work_center_id = wc.id
      WHERE bo.bom_id = ${bomId} AND bo.company_id = ${userCompanyId}
      ORDER BY bo.id
    `

    return NextResponse.json(operations)
  } catch (error) {
    console.error("Get BOM operations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}