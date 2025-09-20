import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get manufacturing orders KPIs
    const moStats = await sql`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN state = 'DONE' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN state = 'IN_PROGRESS' THEN 1 END) as in_progress_orders,
        COUNT(CASE WHEN deadline < NOW() AND state != 'DONE' THEN 1 END) as delayed_orders
      FROM manufacturing_orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `

    // Get work orders KPIs
    const woStats = await sql`
      SELECT 
        COUNT(*) as total_work_orders,
        COUNT(CASE WHEN state = 'DONE' THEN 1 END) as completed_work_orders,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/3600) as avg_completion_hours
      FROM work_orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `

    // Get work center utilization
    const wcUtilization = await sql`
      SELECT AVG(utilization) as avg_utilization
      FROM work_centers
    `

    // Get production throughput (last 7 days)
    const throughput = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as completed_orders
      FROM manufacturing_orders
      WHERE state = 'DONE' AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    return NextResponse.json({
      manufacturing_orders: moStats[0],
      work_orders: woStats[0],
      work_center_utilization: wcUtilization[0],
      throughput: throughput,
    })
  } catch (error) {
    console.error("Get KPIs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
