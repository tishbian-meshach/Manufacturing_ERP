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

    // Calculate real efficiency based on completed vs planned production
    const efficiencyQuery = await sql`
      SELECT
        ROUND(
          CASE
            WHEN SUM(mo.planned_qty) > 0 THEN
              (SUM(mo.produced_qty) * 100.0) / SUM(mo.planned_qty)
            ELSE 0
          END
        ) as efficiency
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
    `
    const efficiency = Number(efficiencyQuery[0].efficiency) || 0

    // Calculate on-time delivery (completed before planned end date)
    const onTimeDeliveryQuery = await sql`
      SELECT
        ROUND(
          CASE
            WHEN COUNT(*) > 0 THEN
              (COUNT(CASE WHEN mo.actual_end_date <= mo.planned_end_date THEN 1 END) * 100.0) / COUNT(*)
            ELSE 0
          END
        ) as on_time_delivery
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed' AND mo.planned_end_date IS NOT NULL
    `
    const onTimeDelivery = Number(onTimeDeliveryQuery[0].on_time_delivery) || 0

    // Calculate total revenue from completed manufacturing orders
    const revenueQuery = await sql`
      SELECT COALESCE(SUM(mo.produced_qty * i.standard_rate), 0) as total_revenue
      FROM manufacturing_orders mo
      JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
    `
    const totalRevenue = Number(revenueQuery[0].total_revenue) || 0

    // Get active users count (mock for now - would need user session tracking)
    const activeUsers = 12

    // Calculate average cycle time in days (fallback to simple calculation)
    let avgCycleTime = 0
    try {
      const cycleTimeQuery = await sql`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM (mo.actual_end_date - mo.actual_start_date)) / 86400), 1) as avg_cycle_time
        FROM manufacturing_orders mo
        WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
          AND mo.actual_start_date IS NOT NULL AND mo.actual_end_date IS NOT NULL
      `
      avgCycleTime = Number(cycleTimeQuery[0].avg_cycle_time) || 0
    } catch (error) {
      console.log("Cycle time calculation failed, using default:", error instanceof Error ? error.message : String(error))
      avgCycleTime = 4.2 // Default value
    }

    // Calculate quality score based on completed work orders vs total
    const qualityQuery = await sql`
      SELECT
        ROUND(
          CASE
            WHEN COUNT(*) > 0 THEN
              (COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) * 100.0) / COUNT(*)
            ELSE 0
          END
        ) as quality_score
      FROM work_orders wo
      JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
      WHERE mo.company_id = ${userCompanyId}
    `
    const qualityScore = Number(qualityQuery[0].quality_score) || 0

    // Get production data for charts (last 6 months)
    const productionDataQuery = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', mo.created_at), 'Mon') as month,
        SUM(mo.planned_qty) as planned,
        SUM(mo.produced_qty) as actual,
        ROUND(
          CASE
            WHEN SUM(mo.planned_qty) > 0 THEN
              (SUM(mo.produced_qty) * 100.0) / SUM(mo.planned_qty)
            ELSE 0
          END
        ) as efficiency
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId}
        AND mo.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', mo.created_at)
      ORDER BY DATE_TRUNC('month', mo.created_at)
    `

    // Get work center utilization data
    const workCenterUtilizationQuery = await sql`
      SELECT
        wc.name,
        COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) as active_work_orders,
        wc.capacity_per_hour,
        ROUND(
          CASE
            WHEN wc.capacity_per_hour > 0 THEN
              LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status = 'in_progress' THEN wo.id END) * 100.0) / wc.capacity_per_hour)
            ELSE 0
          END
        ) as utilization
      FROM work_centers wc
      LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.status = 'in_progress' AND wo.company_id = ${userCompanyId}
      WHERE wc.company_id = ${userCompanyId}
      GROUP BY wc.id, wc.name, wc.capacity_per_hour
      ORDER BY utilization DESC
    `

    // Get order status distribution
    const orderStatusQuery = await sql`
      SELECT
        mo.status,
        COUNT(*) as count
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId}
      GROUP BY mo.status
    `

    // Get inventory trend data (last 5 weeks)
    const inventoryTrendQuery = await sql`
      SELECT
        TO_CHAR(sl.posting_date, 'YYYY-MM-DD') as date,
        COALESCE(SUM(CASE WHEN i.item_type = 'raw_material' THEN sl.qty_after_transaction * i.standard_rate END), 0) as raw_materials,
        COALESCE(SUM(CASE WHEN i.item_type = 'semi_finished' THEN sl.qty_after_transaction * i.standard_rate END), 0) as semi_finished,
        COALESCE(SUM(CASE WHEN i.item_type = 'finished_good' THEN sl.qty_after_transaction * i.standard_rate END), 0) as finished
      FROM stock_ledger sl
      JOIN items i ON sl.item_id = i.id
      WHERE sl.company_id = ${userCompanyId}
        AND sl.posting_date >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY sl.posting_date
      ORDER BY sl.posting_date
    `

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
      charts: {
        productionData: productionDataQuery.map(row => ({
          month: row.month,
          planned: Number(row.planned) || 0,
          actual: Number(row.actual) || 0,
          efficiency: Number(row.efficiency) || 0,
        })),
        workCenterUtilization: workCenterUtilizationQuery.map(row => ({
          name: row.name,
          utilization: Number(row.utilization) || 0,
          capacity: row.capacity_per_hour,
        })),
        orderStatusData: orderStatusQuery.map(row => {
          const statusMap: { [key: string]: { name: string; color: string } } = {
            'completed': { name: 'Completed', color: '#22c55e' },
            'in_progress': { name: 'In Progress', color: '#3b82f6' },
            'draft': { name: 'Draft', color: '#6b7280' },
            'cancelled': { name: 'Cancelled', color: '#ef4444' },
          };
          const statusInfo = statusMap[row.status] || { name: row.status, color: '#6b7280' };
          return {
            name: statusInfo.name,
            value: Number(row.count) || 0,
            color: statusInfo.color,
          };
        }),
        inventoryTrend: inventoryTrendQuery.map(row => ({
          date: row.date,
          rawMaterials: Number(row.raw_materials) || 0,
          semiFinished: Number(row.semi_finished) || 0,
          finished: Number(row.finished) || 0,
        })),
      },
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("Get dashboard data error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}