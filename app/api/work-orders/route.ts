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

    // Get all work orders for the user's company
    const workOrders = await sql`
      SELECT
        wo.*,
        wc.name as work_center_name,
        wc.capacity_per_hour,
        mo.mo_number,
        i.item_name,
        u.name as assigned_user_name
      FROM work_orders wo
      LEFT JOIN work_centers wc ON wo.work_center_id = wc.id AND wc.company_id = ${userCompanyId}
      LEFT JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id AND mo.company_id = ${userCompanyId}
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      LEFT JOIN users u ON wo.assigned_to = u.id AND u.company_id = ${userCompanyId}
      WHERE wo.company_id = ${userCompanyId}
      ORDER BY wo.created_at DESC
    `

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error("Get work orders error:", error)
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
    const { manufacturing_order_id, work_center_id, operation_name, planned_qty, planned_start_time, planned_end_time, assigned_to } = await request.json()

    if (!manufacturing_order_id || !work_center_id || !operation_name || !planned_qty) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Generate WO number
    const woNumber = `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

    // Create work order
    const newWO = await sql`
      INSERT INTO work_orders (
        wo_number, manufacturing_order_id, work_center_id, operation_name,
        planned_qty, status, planned_start_time, planned_end_time, assigned_to,
        company_id, created_at, updated_at
      )
      VALUES (
        ${woNumber}, ${manufacturing_order_id}, ${work_center_id}, ${operation_name},
        ${planned_qty}, 'pending', ${planned_start_time || null}, ${planned_end_time || null}, ${assigned_to || null},
        ${userCompanyId}, NOW(), NOW()
      )
      RETURNING *
    `

    return NextResponse.json(newWO[0])
  } catch (error) {
    console.error("Create work order error:", error)
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
    const { id, status, completed_qty } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Work order ID is required" }, { status: 400 })
    }

    if (!status && completed_qty === undefined) {
      return NextResponse.json({ error: "Either status or completed_qty must be provided" }, { status: 400 })
    }

    // Get current work order data to determine planned quantity
    const currentWO = await sql`
      SELECT planned_qty, status as current_status FROM work_orders
      WHERE id = ${id} AND company_id = ${userCompanyId}
    `

    if (currentWO.length === 0) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    const plannedQty = currentWO[0].planned_qty
    const currentStatus = currentWO[0].current_status

    // Determine final status and completed quantity
    let finalStatus = status || currentStatus
    let finalCompletedQty = completed_qty !== undefined ? completed_qty : null

    // Auto-complete logic: if completed_qty equals or exceeds planned_qty, mark as completed
    if (finalCompletedQty !== null && finalCompletedQty >= plannedQty && finalStatus !== 'completed') {
      finalStatus = 'completed'
      finalCompletedQty = plannedQty // Ensure it doesn't exceed planned quantity
    }

    // Handle automatic field updates based on status
    let updateQuery

    if (finalStatus === "in_progress" && currentStatus !== "in_progress") {
      // Update work order status
      const setClause = finalCompletedQty !== null
        ? sql`status = ${finalStatus}, actual_start_time = COALESCE(actual_start_time, NOW()), completed_qty = ${finalCompletedQty}, updated_at = NOW()`
        : sql`status = ${finalStatus}, actual_start_time = COALESCE(actual_start_time, NOW()), updated_at = NOW()`

      updateQuery = sql`
        UPDATE work_orders
        SET ${setClause}
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING manufacturing_order_id
      `

      const woResult = await updateQuery

      if (woResult.length > 0) {
        const moId = woResult[0].manufacturing_order_id

        // Update manufacturing order status to in_progress
        await sql`
          UPDATE manufacturing_orders
          SET status = 'in_progress', actual_start_date = COALESCE(actual_start_date, NOW()), updated_at = NOW()
          WHERE id = ${moId} AND company_id = ${userCompanyId} AND status = 'draft'
        `
      }

      // Check if MO should be completed based on work center execution logic
      if (status === "completed") {
        const woResult = await updateQuery
        if (woResult.length > 0) {
          const moId = woResult[0].manufacturing_order_id

          // Get all work centers for this MO
          const moWorkCenters = await sql`
            SELECT mwc.*, wo.status as wo_status
            FROM mo_work_centers mwc
            LEFT JOIN work_orders wo ON mwc.work_center_id = wo.work_center_id
              AND wo.manufacturing_order_id = mwc.manufacturing_order_id
              AND wo.company_id = ${userCompanyId}
            WHERE mwc.manufacturing_order_id = ${moId} AND mwc.company_id = ${userCompanyId}
            ORDER BY mwc.execution_order
          `

          // Check completion logic based on parallel/sequential execution
          let canCompleteMO = true

          if (moWorkCenters.length > 0) {
            // Group work centers by execution order
            const executionGroups = moWorkCenters.reduce((groups: any, wc: any) => {
              if (!groups[wc.execution_order]) {
                groups[wc.execution_order] = []
              }
              groups[wc.execution_order].push(wc)
              return groups
            }, {})

            // Check each execution group
            for (const order of Object.keys(executionGroups).sort((a, b) => parseInt(a) - parseInt(b))) {
              const group = executionGroups[order]
              const hasParallel = group.some((wc: any) => wc.is_parallel)

              if (hasParallel) {
                // For parallel execution, all work centers in this group must be completed
                const allCompleted = group.every((wc: any) => wc.wo_status === 'completed')
                if (!allCompleted) {
                  canCompleteMO = false
                  break
                }
              } else {
                // For sequential execution, at least one work center in this group must be completed
                const anyCompleted = group.some((wc: any) => wc.wo_status === 'completed')
                if (!anyCompleted) {
                  canCompleteMO = false
                  break
                }
              }
            }
          } else {
            // If no work centers defined, check if all work orders are completed
            const allWOs = await sql`
              SELECT status FROM work_orders
              WHERE manufacturing_order_id = ${moId} AND company_id = ${userCompanyId}
            `
            canCompleteMO = allWOs.length > 0 && allWOs.every((wo: any) => wo.status === 'completed')
          }

          // Update MO status if all conditions are met
          if (canCompleteMO) {
            await sql`
              UPDATE manufacturing_orders
              SET status = 'completed', actual_end_date = NOW(), updated_at = NOW()
              WHERE id = ${moId} AND company_id = ${userCompanyId} AND status = 'in_progress'
            `
          }
        }
      }

      // Return the updated work order
      updateQuery = sql`
        SELECT * FROM work_orders WHERE id = ${id} AND company_id = ${userCompanyId}
      `
    } else if (finalStatus === "completed") {
      updateQuery = sql`
        UPDATE work_orders
        SET status = ${finalStatus},
            actual_end_time = COALESCE(actual_end_time, NOW()),
            completed_qty = ${finalCompletedQty !== null ? finalCompletedQty : plannedQty},
            updated_at = NOW()
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING *
      `
    } else {
      // Handle other status updates (on_hold, etc.)
      const setClause = finalCompletedQty !== null
        ? sql`status = ${finalStatus}, completed_qty = ${finalCompletedQty}, updated_at = NOW()`
        : sql`status = ${finalStatus}, updated_at = NOW()`

      updateQuery = sql`
        UPDATE work_orders
        SET ${setClause}
        WHERE id = ${id} AND company_id = ${userCompanyId}
        RETURNING *
      `
    }

    const updatedWO = await updateQuery

    if (updatedWO.length === 0) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    return NextResponse.json(updatedWO[0])
  } catch (error) {
    console.error("Update work order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}