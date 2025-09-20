import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return ''

  console.log(`Converting ${data.length} rows to CSV with headers:`, headers)

  // Create CSV header row
  const csvRows = [headers.join(',')]

  // Create CSV data rows
  for (const row of data) {
    const values = headers.map(header => {
      // Try different variations of the header name
      const variations = [
        header,
        header.toLowerCase(),
        header.toLowerCase().replace(/\s+/g, ''),
        header.replace(/\s+/g, ''),
      ]

      let value = ''
      for (const variation of variations) {
        if (row[variation] !== undefined) {
          value = row[variation]
          break
        }
      }

      // Convert to string and handle null/undefined
      value = String(value || '')

      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  }

  const result = csvRows.join('\n')
  console.log(`Generated CSV with ${csvRows.length} rows, ${result.length} characters`)
  return result
}

export async function GET(request: NextRequest) {
  try {
    console.log('Export API called')
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      console.log('Authentication failed')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      console.log('No user found')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId
    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'all'
    const format = searchParams.get('format') || 'csv'

    console.log(`Export request: type=${exportType}, format=${format}, companyId=${userCompanyId}`)

    let csvContent = ''
    let filename = `manufacturing-reports-${new Date().toISOString().split('T')[0]}`

    if (exportType === 'all' || exportType === 'production') {
      // Production Report
      const productionReport = await sql`
        SELECT
          i.item_name as "Item",
          SUM(mo.planned_qty) as "Planned Qty",
          SUM(mo.produced_qty) as "Produced Qty",
          ROUND(
            CASE
              WHEN SUM(mo.planned_qty) > 0 THEN
                (SUM(mo.produced_qty) * 100.0) / SUM(mo.planned_qty)
              ELSE 0
            END, 1
          ) as "Efficiency %",
          SUM(mo.produced_qty * i.standard_rate) as "Revenue"
        FROM manufacturing_orders mo
        JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
        WHERE mo.company_id = ${userCompanyId} AND mo.status = 'completed'
        GROUP BY i.id, i.item_name
        ORDER BY SUM(mo.produced_qty) DESC
      `

      console.log(`Production report: ${productionReport.length} rows`)
      if (productionReport.length > 0) {
        csvContent += 'PRODUCTION REPORT\n'
        csvContent += convertToCSV(productionReport, ['Item', 'Planned Qty', 'Produced Qty', 'Efficiency %', 'Revenue'])
        csvContent += '\n\n'
      }
    }

    if (exportType === 'all' || exportType === 'inventory') {
      // Inventory Report
      const inventoryReport = await sql`
        SELECT
          i.item_name as "Item",
          COALESCE(SUM(sl.qty_after_transaction), 0) as "Current Stock",
          CASE
            WHEN i.item_type = 'raw_material' THEN 50
            WHEN i.item_type = 'semi_finished' THEN 20
            ELSE 10
          END as "Min Stock",
          CASE
            WHEN i.item_type = 'raw_material' THEN 500
            WHEN i.item_type = 'semi_finished' THEN 200
            ELSE 100
          END as "Max Stock",
          COALESCE(SUM(sl.qty_after_transaction * i.standard_rate), 0) as "Value",
          ROUND(
            CASE
              WHEN COALESCE(SUM(sl.qty_after_transaction), 0) > 0 THEN
                365.0 / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(sl.posting_date))))
              ELSE 0
            END, 1
          ) as "Turnover"
        FROM items i
        LEFT JOIN stock_ledger sl ON i.id = sl.item_id AND sl.company_id = ${userCompanyId}
        WHERE i.company_id = ${userCompanyId} AND i.is_active = true
        GROUP BY i.id, i.item_name, i.item_type, i.standard_rate
        ORDER BY COALESCE(SUM(sl.qty_after_transaction * i.standard_rate), 0) DESC
      `

      console.log(`Inventory report: ${inventoryReport.length} rows`)
      if (inventoryReport.length > 0) {
        csvContent += 'INVENTORY REPORT\n'
        csvContent += convertToCSV(inventoryReport, ['Item', 'Current Stock', 'Min Stock', 'Max Stock', 'Value', 'Turnover'])
        csvContent += '\n\n'
      }
    }

    if (exportType === 'all' || exportType === 'efficiency') {
      // Work Center Efficiency Report
      const workCenterReport = await sql`
        SELECT
          wc.name as "Work Center",
          wc.capacity_per_hour * 168 as "Total Hours",
          COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 as "Utilized Hours",
          ROUND(
            CASE
              WHEN wc.capacity_per_hour > 0 THEN
                LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 168))
              ELSE 0
            END, 1
          ) as "Utilization %",
          COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) as "Output"
        FROM work_centers wc
        LEFT JOIN work_orders wo ON wc.id = wo.work_center_id AND wo.company_id = ${userCompanyId}
        WHERE wc.company_id = ${userCompanyId}
        GROUP BY wc.id, wc.name, wc.capacity_per_hour
        ORDER BY ROUND(
          CASE
            WHEN wc.capacity_per_hour > 0 THEN
              LEAST(100, (COUNT(DISTINCT CASE WHEN wo.status IN ('in_progress', 'completed') THEN wo.id END) * 8 * 100.0) / (wc.capacity_per_hour * 168))
            ELSE 0
          END, 1
        ) DESC
      `

      console.log(`Work center report: ${workCenterReport.length} rows`)
      if (workCenterReport.length > 0) {
        csvContent += 'WORK CENTER EFFICIENCY REPORT\n'
        csvContent += convertToCSV(workCenterReport, ['Work Center', 'Total Hours', 'Utilized Hours', 'Utilization %', 'Output'])
        csvContent += '\n\n'
      }
    }

    if (exportType === 'all') {
      // Manufacturing Orders Summary
      const manufacturingOrders = await sql`
        SELECT
          mo.mo_number as "MO Number",
          i.item_name as "Item",
          mo.planned_qty as "Planned Qty",
          mo.produced_qty as "Produced Qty",
          mo.status as "Status",
          TO_CHAR(mo.created_at, 'YYYY-MM-DD') as "Created Date",
          TO_CHAR(mo.planned_start_date, 'YYYY-MM-DD') as "Start Date",
          TO_CHAR(mo.planned_end_date, 'YYYY-MM-DD') as "End Date"
        FROM manufacturing_orders mo
        LEFT JOIN items i ON mo.item_id = i.id AND i.company_id = ${userCompanyId}
        WHERE mo.company_id = ${userCompanyId}
        ORDER BY mo.created_at DESC
      `

      if (manufacturingOrders.length > 0) {
        csvContent += 'MANUFACTURING ORDERS\n'
        csvContent += convertToCSV(manufacturingOrders, ['MO Number', 'Item', 'Planned Qty', 'Produced Qty', 'Status', 'Created Date', 'Start Date', 'End Date'])
        csvContent += '\n\n'
      }

      // Stock Ledger Summary
      const stockLedger = await sql`
        SELECT
          TO_CHAR(sl.created_at, 'YYYY-MM-DD') as "Date",
          i.item_name as "Item",
          sl.actual_qty as "Quantity",
          sl.qty_after_transaction as "Stock After",
          sl.rate as "Rate",
          sl.value_after_transaction as "Value"
        FROM stock_ledger sl
        LEFT JOIN items i ON sl.item_id = i.id
        WHERE sl.company_id = ${userCompanyId}
        ORDER BY sl.created_at DESC
        LIMIT 1000
      `

      if (stockLedger.length > 0) {
        csvContent += 'STOCK LEDGER (Last 1000 entries)\n'
        csvContent += convertToCSV(stockLedger, ['Date', 'Item', 'Quantity', 'Stock After', 'Rate', 'Value'])
        csvContent += '\n\n'
      }
    }

    console.log(`Final CSV content length: ${csvContent.length} characters`)
    console.log(`CSV preview:`, csvContent.substring(0, 200) + '...')

    // Set appropriate headers for CSV download
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv')
    headers.set('Content-Disposition', `attachment; filename="${filename}.csv"`)

    console.log(`Returning CSV response with filename: ${filename}.csv`)

    return new NextResponse(csvContent, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error("Export reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}