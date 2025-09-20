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
    const product = searchParams.get("product")
    const dateRange = searchParams.get("dateRange")

    let query = `
      SELECT sl.*, p.name as product_name
      FROM stock_ledger sl
      LEFT JOIN products p ON sl.product_id = p.id
    `

    const conditions = []
    const params = []

    if (product) {
      conditions.push(`sl.product_id = $${params.length + 1}`)
      params.push(product)
    }

    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",")
      conditions.push(`sl.created_at BETWEEN $${params.length + 1} AND $${params.length + 2}`)
      params.push(startDate, endDate)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`
    }

    query += ` ORDER BY sl.created_at DESC LIMIT 100`

    const result = await sql.unsafe(query, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Get ledger error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
