"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download, Filter, Calendar, TrendingUp, Factory, Target, DollarSign } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// State for real data from API
export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: "2024-01-01",
    endDate: "2024-06-30",
  })
  const [reportsData, setReportsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/reports", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.")
        }
        throw new Error("Failed to fetch reports data")
      }

      const data = await response.json()
      setReportsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports data")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (reportType: string) => {
    try {
      setExporting(reportType)
      console.log(`Starting export for ${reportType}...`)
      const token = localStorage.getItem("erp_token")

      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch(`/api/reports/export?type=${reportType}&format=csv`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`Export response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Export failed with status ${response.status}:`, errorText)
        throw new Error(`Export failed: ${response.status}`)
      }

      const blob = await response.blob()
      console.log(`Blob size: ${blob.size} bytes`)

      if (blob.size === 0) {
        console.error('Received empty blob')
        throw new Error('No data to export')
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `manufacturing-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)

      console.log(`Export completed successfully for ${reportType}`)

    } catch (error) {
      console.error(`Export ${reportType} report error:`, error)
      // You could show a toast notification here
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setExporting(null)
    }
  }

  const handleExportAll = async () => {
    try {
      setExporting('all')
      console.log('Starting export for all reports...')
      const token = localStorage.getItem("erp_token")

      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('/api/reports/export?type=all&format=csv', {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`Export all response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Export all failed with status ${response.status}:`, errorText)
        throw new Error(`Export failed: ${response.status}`)
      }

      const blob = await response.blob()
      console.log(`Blob size: ${blob.size} bytes`)

      if (blob.size === 0) {
        console.error('Received empty blob')
        throw new Error('No data to export')
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `manufacturing-all-reports-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)

      console.log('Export all completed successfully')

    } catch (error) {
      console.error('Export all reports error:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["admin", "manager"]}>
        <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive insights into manufacturing performance</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </DashboardLayout>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={["admin", "manager"]}>
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground">Comprehensive insights into manufacturing performance</p>
            </div>
            <div className="text-center py-12">
              <div className="text-red-500 text-lg font-medium">Error loading reports</div>
              <div className="text-muted-foreground mt-2">{error}</div>
              <Button onClick={fetchReportsData} className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive insights into manufacturing performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline" onClick={handleExportAll} disabled={exporting === 'all'}>
              {exporting === 'all' ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting === 'all' ? 'Exporting...' : 'Export All'}
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DateTimePicker
                  date={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                  onDateChange={(date) => {
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: date ? date.toISOString().split('T')[0] : "",
                    }))
                  }}
                  placeholder="Select start date and time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DateTimePicker
                  date={dateRange.endDate ? new Date(dateRange.endDate) : undefined}
                  onDateChange={(date) => {
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: date ? date.toISOString().split('T')[0] : "",
                    }))
                  }}
                  placeholder="Select end date and time"
                />
              </div>
              <Button>Apply Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Factory className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.summary?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground">Active manufacturing orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.summary?.completionRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Orders completed on time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  {/* <DollarSign className="h-4 w-4 text-muted-foreground" /> */}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{((reportsData?.summary?.totalRevenue || 0) / 1000).toFixed(0)}K</div>
                  <p className="text-xs text-muted-foreground">From completed orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportsData?.summary?.avgEfficiency || 0}%</div>
                  <p className="text-xs text-muted-foreground">Production efficiency</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Trends</CardTitle>
                <CardDescription>Orders, completion, and revenue trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    orders: { label: "Orders", color: "#8884d8" },
                    completed: { label: "Completed", color: "#82ca9d" },
                    revenue: { label: "Revenue", color: "#ffc658" },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportsData?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="completed" stroke="#82ca9d" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            {/* Production Performance Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Production Performance by Item</CardTitle>
                    <CardDescription>Planned vs actual production with efficiency metrics</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => handleExport("production")} disabled={exporting === 'production'}>
                    {exporting === 'production' ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {exporting === 'production' ? 'Exporting...' : 'Export Production'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    planned: { label: "Planned", color: "#8884d8" },
                    produced: { label: "Produced", color: "#82ca9d" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsData?.productionReport || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="item" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                      <Bar dataKey="planned" fill="#8884d8" name="Planned" />
                      <Bar dataKey="produced" fill="#82ca9d" name="Produced" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Production Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Production Report</CardTitle>
                <CardDescription>Complete breakdown of production metrics by item</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Planned</TableHead>
                      <TableHead>Produced</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reportsData?.productionReport || []).map((item: any) => (
                      <TableRow key={item.item}>
                        <TableCell className="font-medium">{item.item}</TableCell>
                        <TableCell>{item.planned}</TableCell>
                        <TableCell>{item.produced}</TableCell>
                        <TableCell>
                          <span
                            className={
                              item.efficiency >= 100
                                ? "text-green-600"
                                : item.efficiency >= 90
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }
                          >
                            {item.efficiency}%
                          </span>
                        </TableCell>
                        <TableCell>₹{item.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {/* Inventory Status Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Inventory Status Report</CardTitle>
                    <CardDescription>Current stock levels and turnover analysis</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => handleExport("inventory")} disabled={exporting === 'inventory'}>
                    {exporting === 'inventory' ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {exporting === 'inventory' ? 'Exporting...' : 'Export Inventory'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min/Max</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Turnover</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reportsData?.inventoryReport || []).map((item: any) => {
                      const status =
                        item.currentStock <= item.minStock
                          ? "Low"
                          : item.currentStock >= item.maxStock
                            ? "High"
                            : "Normal"
                      const statusColor =
                        status === "Low" ? "text-red-600" : status === "High" ? "text-orange-600" : "text-green-600"

                      return (
                        <TableRow key={item.item}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>{item.currentStock}</TableCell>
                          <TableCell>
                            {item.minStock} / {item.maxStock}
                          </TableCell>
                          <TableCell>₹{item.value.toLocaleString()}</TableCell>
                          <TableCell>{item.turnover}x</TableCell>
                          <TableCell className={statusColor}>{status}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-4">
            {/* Work Center Utilization */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Center Efficiency Report</CardTitle>
                    <CardDescription>Utilization and output metrics by work center</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => handleExport("efficiency")} disabled={exporting === 'efficiency'}>
                    {exporting === 'efficiency' ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {exporting === 'efficiency' ? 'Exporting...' : 'Export Efficiency'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Center</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Utilized Hours</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Output</TableHead>
                      <TableHead>Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reportsData?.workCenterReport || []).map((wc: any) => {
                      const efficiency = wc.utilizedHours > 0 ? (wc.output / wc.utilizedHours).toFixed(1) : "0.0"
                      return (
                        <TableRow key={wc.workCenter}>
                          <TableCell className="font-medium">{wc.workCenter}</TableCell>
                          <TableCell>{wc.totalHours}</TableCell>
                          <TableCell>{wc.utilizedHours}</TableCell>
                          <TableCell>
                            <span
                              className={
                                wc.utilization >= 80
                                  ? "text-green-600"
                                  : wc.utilization >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }
                            >
                              {wc.utilization}%
                            </span>
                          </TableCell>
                          <TableCell>{wc.output}</TableCell>
                          <TableCell>{efficiency} units/hr</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </RoleGuard>
  )
}
