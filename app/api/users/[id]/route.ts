import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const userId = params.id

    // Get user by ID (ensure it belongs to the same company)
    const users = await sql`
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE id = ${userId} AND company_id = ${userCompanyId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update users
    if (authResult.user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const userCompanyId = authResult.user.companyId
    const userId = params.id
    const { name, email, role } = await request.json()

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 })
    }

    // Check if user exists and belongs to the same company
    const existingUser = await sql`
      SELECT id FROM users WHERE id = ${userId} AND company_id = ${userCompanyId}
    `

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if email is already taken by another user
    const emailCheck = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${userId}
    `

    if (emailCheck.length > 0) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    // Update user
    const updatedUser = await sql`
      UPDATE users
      SET name = ${name}, email = ${email}, role = ${role}, updated_at = NOW()
      WHERE id = ${userId} AND company_id = ${userCompanyId}
      RETURNING id, name, email, role, created_at, updated_at
    `

    return NextResponse.json(updatedUser[0])
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete users
    if (authResult.user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const userCompanyId = authResult.user.companyId
    const userId = params.id

    // Prevent deleting yourself
    if (userId === authResult.user.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Check if user exists and belongs to the same company
    const existingUser = await sql`
      SELECT id FROM users WHERE id = ${userId} AND company_id = ${userCompanyId}
    `

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user
    await sql`
      DELETE FROM users WHERE id = ${userId} AND company_id = ${userCompanyId}
    `

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}