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

    // Get all manufacturing orders for the user's company
    const manufacturingOrders = await sql`
      SELECT
        mo.*,
        i.item_name,
        i.item_code
      FROM manufacturing_orders mo
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId}
      ORDER BY mo.created_at DESC
    `

    console.log(`Retrieved ${manufacturingOrders.length} manufacturing orders for company ${userCompanyId}`)
    manufacturingOrders.forEach((mo, index) => {
      console.log(`${index + 1}. MO ${mo.mo_number} (ID: ${mo.id}) - ${mo.item_name}`)
      console.log(`   Status: ${mo.status}, Produced: ${mo.produced_qty}, Planned: ${mo.planned_qty}`)
    })

    return NextResponse.json(manufacturingOrders)
  } catch (error) {
    console.error("Get manufacturing orders error:", error)
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
    console.log(`User company ID: ${userCompanyId}`)
    console.log(`Auth user data:`, authResult.user)

    const { item_id, bom_id, planned_qty, planned_start_date, planned_end_date, priority, work_centers } = await request.json()
    console.log(`Creating MO with data:`, { item_id, bom_id, planned_qty, work_centers_count: work_centers?.length })

    if (!item_id || !planned_qty) {
      return NextResponse.json({ error: "Item and planned quantity are required" }, { status: 400 })
    }

    // Generate MO number
    const moNumber = `MO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    // Create manufacturing order
    const newMO = await sql`
      INSERT INTO manufacturing_orders (
        mo_number, item_id, bom_id, planned_qty, status, priority,
        planned_start_date, planned_end_date, company_id, created_at, updated_at
      )
      VALUES (
        ${moNumber}, ${item_id}, ${bom_id || null}, ${planned_qty}, 'draft', ${priority || 'medium'},
        ${planned_start_date || null}, ${planned_end_date || null}, ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    const moId = newMO[0].id
    console.log(`Created MO with ID: ${moId}, Number: ${newMO[0].mo_number}`)

    // Save work centers if provided
    if (work_centers && work_centers.length > 0) {
      console.log(`Saving ${work_centers.length} work centers for MO ${moId}`)
      const workCenterValues = work_centers.map((wc: any) =>
        `(${moId}, ${wc.work_center_id}, ${wc.execution_order}, ${wc.is_parallel || false}, ${userCompanyId})`
      ).join(', ')

      await sql`
        INSERT INTO mo_work_centers (
          manufacturing_order_id, work_center_id, execution_order, is_parallel,
          company_id
        )
        VALUES ${sql.unsafe(workCenterValues)}
      `
      console.log(`Saved work centers for MO ${moId}`)
    }

    return NextResponse.json(newMO[0])
  } catch (error) {
    console.error("Create manufacturing order error:", error)
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
    const { id, status, produced_qty } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Manufacturing order ID is required" }, { status: 400 })
    }

    // Check if MO exists and belongs to user's company
    const existingMO = await sql`
      SELECT id, status, planned_qty FROM manufacturing_orders
      WHERE id = ${id} AND company_id = ${userCompanyId}
    `

    if (existingMO.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found" }, { status: 404 })
    }

    const currentMO = existingMO[0]

    // Update the manufacturing order
    if (status) {
      if (status === 'completed' && currentMO.status !== 'completed') {
        // Auto-complete: set status to completed and produced_qty to planned_qty
        await sql`
          UPDATE manufacturing_orders
          SET status = ${status}, produced_qty = ${currentMO.planned_qty}, updated_at = NOW()
          WHERE id = ${id} AND company_id = ${userCompanyId}
        `
      } else {
        // Regular status update
        await sql`
          UPDATE manufacturing_orders
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${id} AND company_id = ${userCompanyId}
        `
      }
    }

    if (produced_qty !== undefined) {
      await sql`
        UPDATE manufacturing_orders
        SET produced_qty = ${produced_qty}, updated_at = NOW()
        WHERE id = ${id} AND company_id = ${userCompanyId}
      `
    }

    // Get updated MO
    const updatedMO = await sql`
      SELECT * FROM manufacturing_orders
      WHERE id = ${id} AND company_id = ${userCompanyId}
    `

    console.log(`Updated MO ${id}: status=${status}, produced_qty=${produced_qty}`)

    return NextResponse.json(updatedMO[0])
  } catch (error) {
    console.error("Update manufacturing order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Manufacturing order ID is required" }, { status: 400 })
    }

    // Check if MO exists and belongs to user's company
    const existingMO = await sql`
      SELECT id, status FROM manufacturing_orders
      WHERE id = ${id} AND company_id = ${userCompanyId}
    `

    if (existingMO.length === 0) {
      return NextResponse.json({ error: "Manufacturing order not found" }, { status: 404 })
    }

    // Only allow canceling draft MOs
    if (existingMO[0].status !== 'draft') {
      return NextResponse.json({
        error: "Cannot cancel manufacturing order that is already in progress or completed"
      }, { status: 400 })
    }

    // Delete associated work orders first
    await sql`
      DELETE FROM work_orders
      WHERE manufacturing_order_id = ${id} AND company_id = ${userCompanyId}
    `

    // Delete the manufacturing order
    await sql`
      DELETE FROM manufacturing_orders
      WHERE id = ${id} AND company_id = ${userCompanyId}
    `

    return NextResponse.json({ success: true, message: "Manufacturing order cancelled successfully" })
  } catch (error) {
    console.error("Delete manufacturing order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}