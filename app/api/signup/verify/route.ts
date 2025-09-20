import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 })
    }

    const invitation = await sql`
      SELECT i.email, i.role, i.used, i.expires_at, c.name as company_name
      FROM invitations i
      JOIN companies c ON i.company_id = c.id
      WHERE i.token = ${token}
    `

    if (invitation.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid invitation token" })
    }

    const invitationData = invitation[0]

    if (invitationData.used) {
      return NextResponse.json({ valid: false, error: "Invitation has already been used" })
    }

    if (new Date(invitationData.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Invitation has expired" })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitationData.email,
        role: invitationData.role,
        companyName: invitationData.company_name,
      },
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ valid: false, error: "Internal server error" }, { status: 500 })
  }
}
