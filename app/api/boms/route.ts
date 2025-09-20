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

    // Get all BOMs for the user's company with component counts
    const boms = await sql`
      SELECT
        b.id,
        b.bom_name,
        b.item_id,
        b.quantity,
        b.is_active,
        b.total_cost,
        b.created_at,
        b.updated_at,
        i.item_name,
        i.item_code,
        COUNT(bi.id) as actual_components_count
      FROM bom b
      LEFT JOIN items i ON b.item_id = i.id AND i.company_id = ${userCompanyId}
      LEFT JOIN bom_items bi ON b.id = bi.bom_id AND bi.company_id = ${userCompanyId}
      WHERE b.company_id = ${userCompanyId} AND b.is_active = true
      GROUP BY b.id, b.bom_name, b.item_id, b.quantity, b.is_active, b.total_cost, b.created_at, b.updated_at, i.item_name, i.item_code
      ORDER BY b.bom_name
    `

    return NextResponse.json(boms)
  } catch (error) {
    console.error("Get BOMs error:", error)
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
    const { bom_name, item_id, quantity, components, operations } = await request.json()

    if (!bom_name || !item_id || !quantity || !components || components.length === 0) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Calculate total cost from components
    let totalCost = 0
    for (const component of components) {
      const itemRate = await sql`
        SELECT standard_rate FROM items
        WHERE id = ${component.item_id} AND company_id = ${userCompanyId}
      `
      if (itemRate[0]) {
        totalCost += component.quantity * Number(itemRate[0].standard_rate || 0)
      }
    }

    // Create BOM with calculated total cost
    const newBom = await sql`
      INSERT INTO bom (bom_name, item_id, quantity, total_cost, company_id, is_active, created_at, updated_at)
      VALUES (${bom_name}, ${item_id}, ${quantity}, ${totalCost}, ${userCompanyId}, true, NOW(), NOW())
      RETURNING id
    `

    const bomId = newBom[0].id

    // Add BOM components
    for (const component of components) {
      await sql`
        INSERT INTO bom_items (bom_id, item_id, quantity, company_id, created_at)
        VALUES (${bomId}, ${component.item_id}, ${component.quantity}, ${userCompanyId}, NOW())
      `
    }

    // Add BOM operations at the BOM level
    if (operations && operations.length > 0) {
      for (const operation of operations) {
        await sql`
          INSERT INTO bom_operations (
            bom_id, work_center_id, operation_name, operation_description,
            duration_minutes, company_id, created_at, updated_at
          )
          VALUES (
            ${bomId}, ${operation.work_center_id}, ${operation.operation_name},
            ${operation.operation_description || null}, ${operation.duration_minutes},
            ${userCompanyId}, NOW(), NOW()
          )
        `
      }
    }

    return NextResponse.json({
      id: bomId,
      message: "BOM created successfully with operations"
    })
  } catch (error) {
    console.error("Create BOM error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}