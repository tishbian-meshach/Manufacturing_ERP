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
    const { searchParams } = new URL(request.url)
    const product = searchParams.get("product")
    const dateRange = searchParams.get("dateRange")

    let whereConditions = [`sl.company_id = ${userCompanyId}`]

    if (product) {
      whereConditions.push(`sl.item_id = ${product}`)
    }

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",")
      whereConditions.push(`sl.created_at BETWEEN '${startDate}' AND '${endDate}'`)
    }

    const whereClause = whereConditions.join(" AND ")

    const result = await sql`
      SELECT sl.*, i.item_name as product_name, i.item_code
      FROM stock_ledger sl
      LEFT JOIN items i ON sl.item_id = i.id
      WHERE ${sql.unsafe(whereClause)}
      ORDER BY sl.created_at DESC
      LIMIT 100
    `
    return NextResponse.json(result)
  } catch (error) {
    console.error("Get ledger error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
