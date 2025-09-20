import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json()

    if (!token || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const invitation = await sql`
      SELECT i.*, c.name as company_name
      FROM invitations i
      JOIN companies c ON i.company_id = c.id
      WHERE i.token = ${token} AND i.used = false AND i.expires_at > NOW()
    `

    if (invitation.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 })
    }

    const invitationData = invitation[0]

    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${invitationData.email}
    `
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await sql`
      INSERT INTO users (name, email, password, role, company_id, created_at, updated_at)
      VALUES (${name}, ${invitationData.email}, ${hashedPassword}, ${invitationData.role}, ${invitationData.company_id}, NOW(), NOW())
      RETURNING id, name, email, role, company_id
    `

    await sql`
      UPDATE invitations SET used = true WHERE id = ${invitationData.id}
    `

    const userData = user[0]

    const authToken = jwt.sign(
      {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        companyId: userData.company_id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    )

    return NextResponse.json({
      success: true,
      token: authToken,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        companyId: userData.company_id,
        companyName: invitationData.company_name,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
