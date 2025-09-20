import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"
import { updateItemStock } from "@/lib/stock"

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
    const itemId = searchParams.get("itemId")

    let query = sql`
      SELECT sl.*, i.item_name, i.item_code
      FROM stock_ledger sl
      LEFT JOIN items i ON sl.item_id = i.id
      WHERE sl.company_id = ${userCompanyId}
    `

    if (itemId) {
      query = sql`
        SELECT sl.*, i.item_name, i.item_code
        FROM stock_ledger sl
        LEFT JOIN items i ON sl.item_id = i.id
        WHERE sl.company_id = ${userCompanyId} AND sl.item_id = ${itemId}
      `
    }

    const result = await sql`${query} ORDER BY sl.created_at DESC`
    return NextResponse.json(result)
  } catch (error) {
    console.error("Get stock ledger error:", error)
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
    const {
      item_id,
      actual_qty,
      rate = 0,
      posting_date,
      posting_time
    } = await request.json()

    if (!item_id || actual_qty === undefined) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Calculate qty_after_transaction and value_after_transaction
    const currentStockResult = await sql`
      SELECT COALESCE(SUM(actual_qty), 0) as current_stock
      FROM stock_ledger
      WHERE item_id = ${item_id} AND company_id = ${userCompanyId}
    `

    const currentStock = currentStockResult[0]?.current_stock || 0
    const qtyAfterTransaction = currentStock + Number(actual_qty)
    const valueAfterTransaction = qtyAfterTransaction * Number(rate)

    // Insert new stock ledger entry
    const newEntry = await sql`
      INSERT INTO stock_ledger (
        item_id, actual_qty,
        qty_after_transaction, rate, value_after_transaction,
        posting_date, posting_time, company_id, created_at
      )
      VALUES (
        ${item_id}, ${actual_qty},
        ${qtyAfterTransaction}, ${rate}, ${valueAfterTransaction},
        ${posting_date || sql`CURRENT_DATE`}, ${posting_time || sql`CURRENT_TIME`},
        ${userCompanyId}, NOW()
      )
      RETURNING *
    `

    // Update the stock column in items table
    await updateItemStock(item_id, userCompanyId)

    return NextResponse.json(newEntry[0])
  } catch (error) {
    console.error("Create stock ledger entry error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}