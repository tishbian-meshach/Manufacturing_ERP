"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download, Filter, Calendar, TrendingUp, Factory, Target, DollarSign } from "lucide-react"

// Mock data for reports
const productionReport = [
  { item: "Product A", planned: 200, produced: 185, efficiency: 92.5, revenue: 27750 },
  { item: "Product B", planned: 150, produced: 158, efficiency: 105.3, revenue: 31600 },
  { item: "Product C", planned: 100, produced: 95, efficiency: 95.0, revenue: 33250 },
]

const workCenterReport = [
  { workCenter: "Assembly Line 1", totalHours: 168, utilizedHours: 142, utilization: 84.5, output: 285 },
  { workCenter: "CNC Machine 1", totalHours: 168, utilizedHours: 121, utilization: 72.0, output: 156 },
  { workCenter: "Quality Control", totalHours: 168, utilizedHours: 76, utilization: 45.2, output: 438 },
  { workCenter: "Packaging Station", totalHours: 168, utilizedHours: 114, utilization: 67.9, output: 325 },
]

const inventoryReport = [
  { item: "Steel Rod 10mm", currentStock: 850, minStock: 100, maxStock: 1000, value: 4675, turnover: 2.3 },
  { item: "Aluminum Sheet", currentStock: 320, minStock: 50, maxStock: 500, value: 3840, turnover: 1.8 },
  { item: "Plastic Pellets", currentStock: 8, minStock: 50, maxStock: 200, value: 26, turnover: 4.2 },
  { item: "Product A", currentStock: 12, minStock: 5, maxStock: 50, value: 1800, turnover: 8.5 },
]

const monthlyTrend = [
  { month: "Jan", orders: 18, completed: 16, revenue: 78000, efficiency: 89 },
  { month: "Feb", orders: 22, completed: 20, revenue: 95000, efficiency: 91 },
  { month: "Mar", orders: 25, completed: 23, revenue: 112000, efficiency: 92 },
  { month: "Apr", orders: 28, completed: 26, revenue: 125000, efficiency: 93 },
  { month: "May", orders: 24, completed: 22, revenue: 108000, efficiency: 92 },
  { month: "Jun", orders: 26, completed: 24, revenue: 118000, efficiency: 92 },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: "2024-01-01",
    endDate: "2024-06-30",
  })

  const handleExport = (reportType: string) => {
    console.log(`Exporting ${reportType} report...`)
    // In production, implement actual export functionality
  }

  return (
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
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export All
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
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
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
                  <div className="text-2xl font-bold">143</div>
                  <p className="text-xs text-muted-foreground">+12% from last period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">92%</div>
                  <p className="text-xs text-muted-foreground">+3% from last period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$636K</div>
                  <p className="text-xs text-muted-foreground">+18% from last period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">91.5%</div>
                  <p className="text-xs text-muted-foreground">+2.1% from last period</p>
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
                    <LineChart data={monthlyTrend}>
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
                  <Button variant="outline" onClick={() => handleExport("production")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
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
                    <BarChart data={productionReport}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="item" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
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
                    {productionReport.map((item) => (
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
                        <TableCell>${item.revenue.toLocaleString()}</TableCell>
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
                  <Button variant="outline" onClick={() => handleExport("inventory")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
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
                    {inventoryReport.map((item) => {
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
                          <TableCell>${item.value.toLocaleString()}</TableCell>
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
                  <Button variant="outline" onClick={() => handleExport("efficiency")}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
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
                    {workCenterReport.map((wc) => {
                      const efficiency = (wc.output / wc.utilizedHours).toFixed(1)
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
  )
}
