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
    const moId = parseInt(params.id)

    if (!moId) {
      return NextResponse.json({ error: "Invalid manufacturing order ID" }, { status: 400 })
    }

    // Verify the MO belongs to the user's company
    const moCheck = await sql`
      SELECT id FROM manufacturing_orders
      WHERE id = ${moId} AND company_id = ${userCompanyId}
    `

    if (moCheck.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found" }, { status: 404 })
    }

    // Get work center assignments for this MO with work order status
    const workCenterAssignments = await sql`
      SELECT
        mwc.id,
        mwc.work_center_id,
        mwc.execution_order,
        mwc.is_parallel,
        wc.name as work_center_name,
        wc.capacity_per_hour,
        CASE WHEN wo.id IS NOT NULL THEN true ELSE false END as has_work_order,
        wo.status as work_order_status,
        wo.id as work_order_id
      FROM mo_work_centers mwc
      JOIN work_centers wc ON mwc.work_center_id = wc.id
      LEFT JOIN work_orders wo ON wo.manufacturing_order_id = mwc.manufacturing_order_id
        AND wo.work_center_id = mwc.work_center_id
        AND wo.company_id = mwc.company_id
      WHERE mwc.manufacturing_order_id = ${moId} AND mwc.company_id = ${userCompanyId}
      ORDER BY mwc.execution_order, mwc.id
    `

    return NextResponse.json(workCenterAssignments)
  } catch (error) {
    console.error("Get work center assignments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}