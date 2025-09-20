import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-middleware"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = authResult.user?.userId

    const user = await sql`
      SELECT u.id, u.name, u.email, u.role, u.company_id, c.name as company_name, c.domain
      FROM users u
      JOIN companies c ON u.company_id = c.id
      WHERE u.id = ${userId}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = user[0]

    return NextResponse.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        companyId: userData.company_id,
        companyName: userData.company_name,
        companyDomain: userData.domain,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
