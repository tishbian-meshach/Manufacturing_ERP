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

    // Get production report data
    const productionReport = await sql`
      SELECT
        i.item_name as item,
        SUM(mo.planned_qty) as planned,
        SUM(mo.produced_qty) as produced,
        ROUND(
          CASE
            WHEN SUM(mo.planned_qty) > 0 THEN
              (SUM(mo.produced_qty) * 100.0) / SUM(mo.planned_qty)
            ELSE 0
          END, 1
        ) as efficiency,
        SUM(mo.produced_qty * i.standard_rate) as revenue
      FROM manufacturing_orders mo
      JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
      GROUP BY i.id, i.item_name
      ORDER BY SUM(mo.produced_qty) DESC
      LIMIT 10
    `

    // Get work center utilization report
    const workCenterReport = await sql`
      SELECT
        wc.name as work_center,
        wc.capacity_per_hour * 168 as total_hours, -- Assuming 168 hours per week
        COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 as utilized_hours, -- Assuming 8 hours per work order
        ROUND(
          CASE
            WHEN wc.capacity_per_hour > 0 THEN
              LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 168))
            ELSE 0
          END, 1
        ) as utilization,
        COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) as output
      FROM work_centers wc
      LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.company_id = ${userCompanyId}
      WHERE wc.company_id = ${userCompanyId}
      GROUP BY wc.id, wc.name, wc.capacity_per_hour
      ORDER BY utilization DESC
    `

    // Get inventory report
    const inventoryReport = await sql`
      SELECT
        i.item_name as item,
        COALESCE(SUM(sl.qty_after_transaction), 0) as current_stock,
        CASE
          WHEN i.item_type = 'raw_material' THEN 50
          WHEN i.item_type = 'semi_finished' THEN 20
          ELSE 10
        END as min_stock,
        CASE
          WHEN i.item_type = 'raw_material' THEN 500
          WHEN i.item_type = 'semi_finished' THEN 200
          ELSE 100
        END as max_stock,
        COALESCE(SUM(sl.qty_after_transaction * i.standard_rate), 0) as value,
        ROUND(
          CASE
            WHEN COALESCE(SUM(sl.qty_after_transaction), 0) > 0 THEN
              365.0 / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(sl.posting_date))))
            ELSE 0
          END, 1
        ) as turnover
      FROM items i
      LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${userCompanyId}
      WHERE i.company_id = ${userCompanyId} AND i.is_active = true
      GROUP BY i.id, i.item_name, i.item_type, i.standard_rate
      ORDER BY COALESCE(SUM(sl.qty_after_transaction * i.standard_rate), 0) DESC
      LIMIT 20
    `

    // Get monthly trends
    const monthlyTrend = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', mo.created_at), 'Mon') as month,
        COUNT(CASE WHEN mo.status IN ('draft', 'in_progress', 'completed') THEN 1 END) as orders,
        COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) as completed,
        COALESCE(SUM(CASE WHEN mo.status = 'completed' THEN mo.produced_qty * i.standard_rate END), 0) as revenue,
        ROUND(
          CASE
            WHEN COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) > 0 THEN
              AVG(
                CASE
                  WHEN mo.status = 'completed' AND mo.planned_qty > 0 THEN
                    (mo.produced_qty * 100.0) / mo.planned_qty
                  ELSE 0
                END
              )
            ELSE 0
          END, 1
        ) as efficiency
      FROM manufacturing_orders mo
      JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId}
        AND mo.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', mo.created_at)
      ORDER BY DATE_TRUNC('month', mo.created_at)
    `

    // Get summary metrics
    const summaryMetrics = await sql`
      SELECT
        COUNT(CASE WHEN mo.status IN ('draft', 'in_progress', 'completed') THEN 1 END) as total_orders,
        COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) as completed_orders,
        ROUND(
          CASE
            WHEN COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) > 0 THEN
              (COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) * 100.0) / COUNT(CASE WHEN mo.status IN ('draft', 'in_progress', 'completed') THEN 1 END)
            ELSE 0
          END, 1
        ) as completion_rate,
        COALESCE(SUM(CASE WHEN mo.status = 'completed' THEN mo.produced_qty * i.standard_rate END), 0) as total_revenue,
        ROUND(
          CASE
            WHEN COUNT(CASE WHEN mo.status = 'completed' AND mo.planned_qty > 0 THEN 1 END) > 0 THEN
              AVG(
                CASE
                  WHEN mo.status = 'completed' AND mo.planned_qty > 0 THEN
                    (mo.produced_qty * 100.0) / mo.planned_qty
                  ELSE 0
                END
              )
            ELSE 0
          END, 1
        ) as avg_efficiency
      FROM manufacturing_orders mo
      JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
      WHERE mo.company_id = ${userCompanyId}
    `

    const reportsData = {
      summary: {
        totalOrders: Number(summaryMetrics[0].total_orders) || 0,
        completedOrders: Number(summaryMetrics[0].completed_orders) || 0,
        completionRate: Number(summaryMetrics[0].completion_rate) || 0,
        totalRevenue: Number(summaryMetrics[0].total_revenue) || 0,
        avgEfficiency: Number(summaryMetrics[0].avg_efficiency) || 0,
      },
      productionReport: productionReport.map(row => ({
        item: row.item,
        planned: Number(row.planned) || 0,
        produced: Number(row.produced) || 0,
        efficiency: Number(row.efficiency) || 0,
        revenue: Number(row.revenue) || 0,
      })),
      workCenterReport: workCenterReport.map(row => ({
        workCenter: row.work_center,
        totalHours: Number(row.total_hours) || 0,
        utilizedHours: Number(row.utilized_hours) || 0,
        utilization: Number(row.utilization) || 0,
        output: Number(row.output) || 0,
      })),
      inventoryReport: inventoryReport.map(row => ({
        item: row.item,
        currentStock: Number(row.current_stock) || 0,
        minStock: Number(row.min_stock) || 0,
        maxStock: Number(row.max_stock) || 0,
        value: Number(row.value) || 0,
        turnover: Number(row.turnover) || 0,
      })),
      monthlyTrend: monthlyTrend.map(row => ({
        month: row.month,
        orders: Number(row.orders) || 0,
        completed: Number(row.completed) || 0,
        revenue: Number(row.revenue) || 0,
        efficiency: Number(row.efficiency) || 0,
      })),
    }

    return NextResponse.json(reportsData)
  } catch (error) {
    console.error("Get reports data error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}