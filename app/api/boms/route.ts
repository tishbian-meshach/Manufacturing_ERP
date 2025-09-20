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

    // Get all BOMs for the user's company
    const boms = await sql`
      SELECT
        b.*,
        i.item_name,
        i.item_code
      FROM bom b
      LEFT JOIN items i ON b.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE b.company_id = ${userCompanyId} AND b.is_active = true
      ORDER BY b.bom_name
    `

    return NextResponse.json(boms)
  } catch (error) {
    console.error("Get BOMs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}