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

    // Get company details
    const companies = await sql`
      SELECT id, name, domain, admin_id, created_at, updated_at
      FROM companies
      WHERE id = ${userCompanyId}
    `

    if (companies.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json(companies[0])
  } catch (error) {
    console.error("Get company error:", error)
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

    // Only admins can update company info
    if (authResult.user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const userCompanyId = authResult.user.companyId
    const { name, domain } = await request.json()

    if (!name || !domain) {
      return NextResponse.json({ error: "Name and domain are required" }, { status: 400 })
    }

    // Check if domain is already taken by another company
    const domainCheck = await sql`
      SELECT id FROM companies WHERE domain = ${domain} AND id != ${userCompanyId}
    `

    if (domainCheck.length > 0) {
      return NextResponse.json({ error: "Domain already in use" }, { status: 400 })
    }

    // Update company
    const updatedCompany = await sql`
      UPDATE companies
      SET name = ${name}, domain = ${domain}, updated_at = NOW()
      WHERE id = ${userCompanyId}
      RETURNING id, name, domain, admin_id, created_at, updated_at
    `

    if (updatedCompany.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({
      company: updatedCompany[0],
      message: "Company information updated successfully"
    })
  } catch (error) {
    console.error("Update company error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}