import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !["MANAGER", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update MO state to CONFIRMED
    const result = await sql`
      UPDATE manufacturing_orders 
      SET state = 'CONFIRMED', start_date = NOW(), updated_at = NOW()
      WHERE id = ${params.id} AND state = 'DRAFT'
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found or already confirmed" }, { status: 404 })
    }

    // Update associated work orders to be ready
    await sql`
      UPDATE work_orders 
      SET state = 'TODO'
      WHERE mo_id = ${params.id}
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Confirm MO error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
