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

    // Get dashboard statistics
    const statsQuery = await sql`
      SELECT
        COUNT(CASE WHEN mo.status != 'completed' THEN 1 END) as total_mos,
        COUNT(CASE WHEN mo.status = 'in_progress' THEN 1 END) as active_mos,
        COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) as completed_mos,
        COUNT(CASE WHEN wo.status IN ('pending', 'in_progress') THEN 1 END) as total_wos,
        COUNT(CASE WHEN wo.status = 'in_progress' THEN 1 END) as active_wos,
        COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_wos
      FROM manufacturing_orders mo
      LEFT JOIN work_orders wo ON mo.id = wo.manufacturing_order_id
      WHERE mo.company_id = ${userCompanyId}
    `

    const stats = statsQuery[0]

    // Get low stock items count
    const lowStockQuery = await sql`
      SELECT COUNT(*) as low_stock_count
      FROM (
        SELECT
          i.id,
          i.item_type,
          COALESCE(SUM(sl.actual_qty), 0) as current_stock,
          CASE
            WHEN i.item_type = 'raw_material' THEN 50
            WHEN i.item_type = 'semi_finished' THEN 20
            ELSE 10
          END as threshold
        FROM items i
        LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${userCompanyId}
        WHERE i.company_id = ${userCompanyId} AND i.is_active = true
        GROUP BY i.id, i.item_type
        HAVING COALESCE(SUM(sl.actual_qty), 0) <=
          CASE
            WHEN i.item_type = 'raw_material' THEN 50
            WHEN i.item_type = 'semi_finished' THEN 20
            ELSE 10
          END
      ) as low_stock_items
    `

    // Get total items count
    const totalItemsQuery = await sql`
      SELECT COUNT(*) as total_items
      FROM items
      WHERE company_id = ${userCompanyId} AND is_active = true
    `

    // Get recent manufacturing orders
    const recentMOs = await sql`
      SELECT
        mo.id,
        mo.mo_number,
        i.item_name,
        i.item_code,
        mo.planned_qty,
        mo.produced_qty,
        mo.status,
        mo.priority,
        mo.planned_start_date,
        mo.planned_end_date,
        mo.created_at
      FROM manufacturing_orders mo
      LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId}
      ORDER BY mo.created_at DESC
      LIMIT 5
    `

    // Calculate efficiency (mock for now - would need actual production data)
    const efficiency = 87
    const onTimeDelivery = 92
    const totalRevenue = 485000
    const activeUsers = 12
    const avgCycleTime = 4.2
    const qualityScore = 96.5

    const dashboardData = {
      stats: {
        totalMOs: Number(stats.total_mos) || 0,
        activeMOs: Number(stats.active_mos) || 0,
        completedMOs: Number(stats.completed_mos) || 0,
        totalWOs: Number(stats.total_wos) || 0,
        activeWOs: Number(stats.active_wos) || 0,
        completedWOs: Number(stats.completed_wos) || 0,
        lowStockItems: Number(lowStockQuery[0].low_stock_count) || 0,
        totalItems: Number(totalItemsQuery[0].total_items) || 0,
        efficiency,
        onTimeDelivery,
        totalRevenue,
        activeUsers,
        avgCycleTime,
        qualityScore,
      },
      recentMOs: recentMOs.map(mo => ({
        id: mo.id,
        mo_number: mo.mo_number,
        item: mo.item_name,
        item_code: mo.item_code,
        qty: mo.planned_qty,
        status: mo.status,
        priority: mo.priority,
        planned_start_date: mo.planned_start_date,
        planned_end_date: mo.planned_end_date,
        created_at: mo.created_at,
      })),
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Get dashboard data error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}