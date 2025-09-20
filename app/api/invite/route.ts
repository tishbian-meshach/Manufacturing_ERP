import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { verifyToken } from "@/lib/auth-middleware"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.success || authResult.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, role } = await request.json()
    const companyId = authResult.user.companyId

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }

    if (!["manager", "operator", "inventory"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const existingInvitation = await sql`
      SELECT id, used FROM invitations WHERE email = ${email} AND company_id = ${companyId}
    `
    if (existingInvitation.length > 0 && !existingInvitation[0].used) {
      return NextResponse.json({ error: "Invitation already sent to this email" }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    await sql`
      INSERT INTO invitations (email, role, company_id, token, expires_at, created_at)
      VALUES (${email}, ${role}, ${companyId}, ${token}, ${expiresAt}, NOW())
    `

    const company = await sql`
      SELECT name FROM companies WHERE id = ${companyId}
    `

    // For now, return the signup link
    const signupLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/signup?token=${token}`

    return NextResponse.json({
      success: true,
      message: "Invitation created successfully",
      signupLink, // In production, this would be sent via email
      invitation: {
        email,
        role,
        companyName: company[0].name,
        expiresAt,
      },
    })
  } catch (error) {
    console.error("Invitation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyToken(request)
    if (!authResult.success || authResult.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = authResult.user.companyId

    const invitations = await sql`
      SELECT id, email, role, used, created_at, expires_at
      FROM invitations 
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Get invitations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
