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

    // Get user details
    const users = await sql`
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE id = ${authResult.user.userId} AND company_id = ${userCompanyId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get company details
    const companies = await sql`
      SELECT id, name, domain, admin_id
      FROM companies
      WHERE id = ${userCompanyId}
    `

    const company = companies.length > 0 ? companies[0] : null

    return NextResponse.json({
      user: users[0],
      company: company,
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if email is already taken by another user
    const emailCheck = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${authResult.user.userId}
    `

    if (emailCheck.length > 0) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    // Update user
    const updatedUser = await sql`
      UPDATE users
      SET name = ${name}, email = ${email}, updated_at = NOW()
      WHERE id = ${authResult.user.userId} AND company_id = ${userCompanyId}
      RETURNING id, name, email, role, created_at, updated_at
    `

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: updatedUser[0],
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
