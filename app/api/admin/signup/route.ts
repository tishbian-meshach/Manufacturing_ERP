import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

let sql: any
try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  sql = neon(process.env.DATABASE_URL)
} catch (error) {
  console.error("[v0] Database connection error:", error)
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Admin signup API called")

    if (!sql) {
      console.error("[v0] Database connection not available")
      return NextResponse.json({ error: "Database connection error" }, { status: 500 })
    }

    if (!process.env.JWT_SECRET) {
      console.error("[v0] JWT_SECRET environment variable is not set")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const body = await request.json()
    console.log("[v0] Request body received:", { ...body, password: "[REDACTED]" })

    const { companyName, domain, adminName, email, password } = body

    if (!companyName || !domain || !adminName || !email || !password) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    console.log("[v0] Testing database connection")
    try {
      await sql`SELECT 1 as test`
      console.log("[v0] Database connection successful")
    } catch (dbError) {
      console.error("[v0] Database connection test failed:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Checking for existing company with domain:", domain)
    const existingCompany = await sql`
      SELECT id FROM companies WHERE domain = ${domain}
    `
    if (existingCompany.length > 0) {
      console.log("[v0] Company domain already exists")
      return NextResponse.json({ error: "Company domain already exists" }, { status: 400 })
    }

    console.log("[v0] Checking for existing user with email:", email)
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `
    if (existingUser.length > 0) {
      console.log("[v0] Email already registered")
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    console.log("[v0] Hashing password")
    const hashedPassword = await bcrypt.hash(password, 12)

    console.log("[v0] Creating company")
    const company = await sql`
      INSERT INTO companies (name, domain, created_at, updated_at)
      VALUES (${companyName}, ${domain}, NOW(), NOW())
      RETURNING id, name, domain
    `

    const companyId = company[0].id
    console.log("[v0] Company created with ID:", companyId)

    console.log("[v0] Creating admin user")
    const user = await sql`
      INSERT INTO users (id, name, email, password, role, company_id, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${adminName}, ${email}, ${hashedPassword}, 'admin', ${companyId}, NOW(), NOW())
      RETURNING id, name, email, role, company_id
    `

    const userId = user[0].id
    console.log("[v0] User created with ID:", userId)

    console.log("[v0] Updating company admin_id")
    await sql`
      UPDATE companies SET admin_id = ${userId} WHERE id = ${companyId}
    `

    console.log("[v0] Generating JWT token")
    const token = jwt.sign(
      {
        userId: userId,
        email: email,
        role: "admin",
        companyId: companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    )

    console.log("[v0] Admin signup successful")
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        name: adminName,
        email,
        role: "admin",
        companyId,
        companyName,
      },
    })
  } catch (error) {
    console.error("[v0] Admin signup error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
