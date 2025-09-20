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

    // Get efficiency data (monthly)
    const efficiencyData = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', mo.created_at), 'Mon') as month,
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
        ) as efficiency,
        90 as target -- Target efficiency
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId}
        AND mo.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', mo.created_at)
      ORDER BY DATE_TRUNC('month', mo.created_at)
    `

    // Get throughput data (daily for last 7 days)
    const throughputData = await sql`
      SELECT
        TO_CHAR(mo.created_at, 'Dy') as day,
        SUM(mo.produced_qty) as units,
        SUM(mo.planned_qty) as capacity
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId}
        AND mo.created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE_TRUNC('day', mo.created_at), TO_CHAR(mo.created_at, 'Dy')
      ORDER BY DATE_TRUNC('day', mo.created_at)
    `

    // Get work center utilization
    const workCenterUtilization = await sql`
      SELECT
        wc.name,
        ROUND(
          CASE
            WHEN wc.capacity_per_hour > 0 THEN
              LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 24))
            ELSE 0
          END, 1
        ) as value,
        CASE
          WHEN ROUND(CASE WHEN wc.capacity_per_hour > 0 THEN LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 24)) ELSE 0 END, 1) > 85 THEN '#0088FE'
          WHEN ROUND(CASE WHEN wc.capacity_per_hour > 0 THEN LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 24)) ELSE 0 END, 1) > 70 THEN '#00C49F'
          WHEN ROUND(CASE WHEN wc.capacity_per_hour > 0 THEN LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 24)) ELSE 0 END, 1) > 50 THEN '#FFBB28'
          ELSE '#FF8042'
        END as color
      FROM work_centers wc
      LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.company_id = ${userCompanyId}
        AND wo.created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHERE wc.company_id = ${userCompanyId}
      GROUP BY wc.id, wc.name, wc.capacity_per_hour
      ORDER BY value DESC
    `

    // Get quality metrics (weekly defect rates)
    const qualityMetrics = await sql`
      SELECT
        'W' || EXTRACT(WEEK FROM mo.created_at) as week,
        ROUND(
          CASE
            WHEN COUNT(*) > 0 THEN
              (COUNT(CASE WHEN mo.produced_qty < mo.planned_qty THEN 1 END) * 100.0) / COUNT(*)
            ELSE 0
          END, 1
        ) as defect_rate,
        ROUND(
          CASE
            WHEN COUNT(*) > 0 THEN
              (COUNT(CASE WHEN wo.status = 'completed' AND wo.planned_qty != wo.completed_qty THEN 1 END) * 100.0) / COUNT(*)
            ELSE 0
          END, 1
        ) as rework_rate
      FROM manufacturing_orders mo
      LEFT JOIN work_orders wo ON mo.id = wo.manufacturing_order_id
      WHERE mo.company_id = ${userCompanyId}
        AND mo.created_at >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY EXTRACT(WEEK FROM mo.created_at)
      ORDER BY EXTRACT(WEEK FROM mo.created_at)
    `

    // Get current efficiency metrics
    const currentEfficiency = await sql`
      SELECT
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
        ) as current_efficiency,
        ROUND(
          CASE
            WHEN COUNT(CASE WHEN mo.status = 'completed' THEN 1 END) > 0 THEN
              AVG(
                CASE
                  WHEN mo.status = 'completed' AND mo.planned_qty > 0 THEN
                    (mo.produced_qty * 100.0) / mo.planned_qty
                  ELSE 90
                END
              ) - 90
            ELSE 0
          END, 1
        ) as target_achievement
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId}
    `

    // Get cycle time metrics
    const cycleTimeMetrics = await sql`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (mo.actual_end_date::timestamp - mo.actual_start_date::timestamp)) / 3600), 1) as avg_cycle_time
      FROM manufacturing_orders mo
      WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
        AND mo.actual_start_date IS NOT NULL AND mo.actual_end_date IS NOT NULL
    `

    // Get productivity metrics
    const productivityMetrics = await sql`
      SELECT
        ROUND(
          CASE
            WHEN COUNT(DISTINCT wo.id) > 0 THEN
              SUM(wo.completed_qty) / GREATEST(1, COUNT(DISTINCT wo.id))
            ELSE 0
          END, 1
        ) as units_per_work_order
      FROM work_orders wo
      JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
      WHERE mo.company_id = ${userCompanyId} AND wo.status = 'completed'
    `

    // Get delay prediction data (simplified to avoid complex EXTRACT operations)
    const delayPredictions = await sql`
      SELECT
        wo.wo_number as work_order_id,
        wo.operation_name as work_order_name,
        CASE
          WHEN wo.status = 'completed' THEN 100
          WHEN wo.status = 'in_progress' THEN 75
          ELSE 25
        END as current_progress,
        CASE
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() THEN
            CASE
              WHEN wo.planned_end_time < NOW() - INTERVAL '3 days' THEN 3.0
              WHEN wo.planned_end_time < NOW() - INTERVAL '1 day' THEN 1.5
              ELSE 0.5
            END
          ELSE 0
        END as predicted_delay,
        CASE
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() - INTERVAL '3 days' THEN 'high'
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() - INTERVAL '1 day' THEN 'medium'
          WHEN wo.status = 'pending' THEN 'low'
          ELSE 'low'
        END as risk_level,
        CASE
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() THEN
            ARRAY['Overdue deadline', 'Resource constraints']
          WHEN wo.status = 'pending' THEN
            ARRAY['Waiting for resources', 'Scheduling conflicts']
          ELSE
            ARRAY['On track', 'Good progress']
        END as factors,
        CASE
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() THEN
            'Consider reallocating resources or extending deadline'
          WHEN wo.status = 'pending' THEN
            'Review scheduling priorities and resource availability'
          ELSE
            'Continue monitoring, work order is on track'
        END as recommendation
      FROM work_orders wo
      JOIN manufacturing_orders mo ON wo.manufacturing_order_id = mo.id
      WHERE mo.company_id = ${userCompanyId}
        AND wo.status IN ('pending', 'in_progress')
        AND wo.planned_start_time IS NOT NULL
      ORDER BY
        CASE
          WHEN wo.status = 'in_progress' AND wo.planned_end_time < NOW() THEN 1
          WHEN wo.status = 'pending' THEN 2
          ELSE 3
        END,
        wo.planned_end_time
      LIMIT 10
    `

    const analyticsData = {
      efficiency: efficiencyData.map(row => ({
        month: row.month,
        efficiency: Number(row.efficiency) || 0,
        target: Number(row.target) || 90,
      })),
      throughput: throughputData.map(row => ({
        day: row.day,
        units: Number(row.units) || 0,
        capacity: Number(row.capacity) || 0,
      })),
      workCenterUtilization: workCenterUtilization.map(row => ({
        name: row.name,
        value: Number(row.value) || 0,
        color: row.color,
      })),
      qualityMetrics: qualityMetrics.map(row => ({
        week: row.week,
        defectRate: Number(row.defect_rate) || 0,
        reworkRate: Number(row.rework_rate) || 0,
      })),
      delayPredictions: delayPredictions.map(row => ({
        workOrderId: row.work_order_id,
        workOrderName: row.work_order_name,
        currentProgress: Number(row.current_progress) || 0,
        predictedDelay: Number(row.predicted_delay) || 0,
        riskLevel: row.risk_level,
        factors: row.factors || [],
        recommendation: row.recommendation,
      })),
      metrics: {
        currentEfficiency: Number(currentEfficiency[0].current_efficiency) || 0,
        targetAchievement: Number(currentEfficiency[0].target_achievement) || 0,
        avgCycleTime: Number(cycleTimeMetrics[0].avg_cycle_time) || 0,
        productivity: Number(productivityMetrics[0].units_per_work_order) || 0,
      },
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error("Get analytics data error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}