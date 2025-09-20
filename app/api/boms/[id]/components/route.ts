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
    const bomId = params.id

    // Get BOM components with item details
    const components = await sql`
      SELECT
        bi.quantity as required_quantity,
        i.id,
        i.item_code,
        i.item_name,
        i.unit_of_measure,
        i.standard_rate,
        i.current_stock
      FROM bom_items bi
      LEFT JOIN items i ON bi.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE bi.bom_id = ${bomId} AND bi.company_id = ${userCompanyId}
      ORDER BY i.item_name
    `

    // Calculate total cost
    const totalCost = components.reduce((sum: number, component: any) => {
      return sum + (component.required_quantity * Number(component.standard_rate || 0))
    }, 0)

    return NextResponse.json({
      components,
      totalCost,
      componentCount: components.length
    })
  } catch (error) {
    console.error("Get BOM components error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}