"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Factory,
  ClipboardList,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  Target,
  Zap,
  DollarSign,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LiveMetrics } from "@/components/realtime/live-metrics"
import { ActivityFeed } from "@/components/realtime/activity-feed"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface DashboardStats {
  totalMOs: number
  activeMOs: number
  completedMOs: number
  totalWOs: number
  activeWOs: number
  completedWOs: number
  lowStockItems: number
  totalItems: number
  efficiency: number
  onTimeDelivery: number
  totalRevenue: number
  activeUsers: number
  avgCycleTime: number
  qualityScore: number
}

interface ChartData {
  productionData: Array<{
    month: string
    planned: number
    actual: number
    efficiency: number
  }>
  workCenterUtilization: Array<{
    name: string
    utilization: number
    capacity: number
  }>
  orderStatusData: Array<{
    name: string
    value: number
    color: string
  }>
  inventoryTrend: Array<{
    date: string
    rawMaterials: number
    semiFinished: number
    finished: number
  }>
}

interface RecentMO {
  id: number
  mo_number: string
  item: string
  item_code: string
  qty: number
  status: string
  priority: string
  planned_start_date?: string
  planned_end_date?: string
  created_at: string
}

// Mock data as fallback
const mockProductionData = [
  { month: "Jan", planned: 120, actual: 115, efficiency: 96 },
  { month: "Feb", planned: 135, actual: 142, efficiency: 105 },
  { month: "Mar", planned: 150, actual: 138, efficiency: 92 },
  { month: "Apr", planned: 140, actual: 145, efficiency: 104 },
  { month: "May", planned: 160, actual: 152, efficiency: 95 },
  { month: "Jun", planned: 155, actual: 148, efficiency: 95 },
]

const mockWorkCenterUtilization = [
  { name: "Assembly Line 1", utilization: 85, capacity: 100 },
  { name: "CNC Machine 1", utilization: 72, capacity: 100 },
  { name: "Quality Control", utilization: 45, capacity: 100 },
  { name: "Packaging Station", utilization: 68, capacity: 100 },
  { name: "Raw Material Prep", utilization: 35, capacity: 100 },
]

const mockOrderStatusData = [
  { name: "Completed", value: 16, color: "#22c55e" },
  { name: "In Progress", value: 8, color: "#3b82f6" },
  { name: "Draft", value: 3, color: "#6b7280" },
  { name: "On Hold", value: 2, color: "#ef4444" },
]

const mockInventoryTrend = [
  { date: "2024-01-01", rawMaterials: 85000, semiFinished: 25000, finished: 45000 },
  { date: "2024-01-08", rawMaterials: 82000, semiFinished: 28000, finished: 42000 },
  { date: "2024-01-15", rawMaterials: 78000, semiFinished: 32000, finished: 48000 },
  { date: "2024-01-22", rawMaterials: 75000, semiFinished: 30000, finished: 52000 },
  { date: "2024-01-29", rawMaterials: 73000, semiFinished: 35000, finished: 55000 },
]


const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800"
    case "in_progress":
      return "bg-blue-100 text-blue-800"
    case "draft":
      return "bg-gray-100 text-gray-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800"
    case "high":
      return "bg-orange-100 text-orange-800"
    case "medium":
      return "bg-yellow-100 text-yellow-800"
    case "low":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats
    recentMOs: RecentMO[]
    charts: ChartData
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/dashboard", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.")
        }
        throw new Error("Failed to fetch dashboard data")
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-xl text-muted-foreground font-medium">Loading dashboard data...</p>
          <p className="text-sm text-muted-foreground mt-2">Please wait while we fetch your manufacturing insights</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">{error || "Failed to load dashboard data"}</p>
            <Button onClick={fetchDashboardData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const { stats, recentMOs, charts } = dashboardData

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manufacturing Dashboard</h1>
            <p className="text-muted-foreground">Real-time insights into your manufacturing operations</p>
          </div>
          <div className="flex gap-2">
            <Link href="/reports">
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </Link>
            <Link href="/manufacturing-orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New MO
              </Button>
            </Link>
          </div>
        </div>

        <LiveMetrics />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Manufacturing Orders</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMOs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeMOs} active, {stats.completedMOs} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWOs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeWOs} active, {stats.completedWOs} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.efficiency}%</div>
              <p className="text-xs text-muted-foreground">+2.1% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onTimeDelivery}%</div>
              <p className="text-xs text-muted-foreground">+1.5% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.totalRevenue / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground">+8.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.qualityScore}%</div>
              <p className="text-xs text-muted-foreground">+0.8% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Production vs Planned Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Production Performance</CardTitle>
                  <CardDescription>Planned vs Actual production over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      planned: { label: "Planned", color: "#8884d8" },
                      actual: { label: "Actual", color: "#82ca9d" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts?.productionData || mockProductionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} cursor={false}  />
                        <Bar dataKey="planned" fill="#8884d8" name="Planned" />
                        <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>Current manufacturing order status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      completed: { label: "Completed", color: "#22c55e" },
                      inProgress: { label: "In Progress", color: "#3b82f6" },
                      draft: { label: "Draft", color: "#6b7280" },
                      onHold: { label: "On Hold", color: "#ef4444" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts?.orderStatusData || mockOrderStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {(charts?.orderStatusData || mockOrderStatusData).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Manufacturing Orders and Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Manufacturing Orders</CardTitle>
                  <CardDescription>Latest manufacturing orders and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentMOs.map((mo) => (
                      <div key={mo.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{mo.mo_number}</span>
                            <Badge className={getPriorityColor(mo.priority)}>{mo.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {mo.item} - Qty: {mo.qty}
                          </p>
                        </div>
                        <Badge className={getStatusColor(mo.status)}>{mo.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link href="/manufacturing-orders">
                      <Button variant="outline" className="w-full bg-transparent">
                        View All Manufacturing Orders
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <Link href="/manufacturing-orders/new">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <Factory className="mr-2 h-4 w-4" />
                        Create Manufacturing Order
                      </Button>
                    </Link>
                    <Link href="/work-orders">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        View Work Orders
                      </Button>
                    </Link>
                    <Link href="/inventory">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <Package className="mr-2 h-4 w-4" />
                        Check Inventory
                      </Button>
                    </Link>
                    <Link href="/reports">
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        View Reports
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="production" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Efficiency Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Production Efficiency Trend</CardTitle>
                  <CardDescription>Monthly efficiency percentage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      efficiency: { label: "Efficiency %", color: "#8884d8" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={charts?.productionData || mockProductionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[80, 110]} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="efficiency"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ fill: "#8884d8" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Production Volume */}
              <Card>
                <CardHeader>
                  <CardTitle>Production Volume</CardTitle>
                  <CardDescription>Planned vs actual production units</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      planned: { label: "Planned", color: "#8884d8" },
                      actual: { label: "Actual", color: "#82ca9d" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={charts?.productionData || mockProductionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="planned"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stackId="2"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Trend</CardTitle>
                <CardDescription>Inventory value by category over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    rawMaterials: { label: "Raw Materials", color: "#8884d8" },
                    semiFinished: { label: "Semi-finished", color: "#82ca9d" },
                    finished: { label: "Finished Goods", color: "#ffc658" },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts?.inventoryTrend || mockInventoryTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="rawMaterials"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="semiFinished"
                        stackId="1"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="finished"
                        stackId="1"
                        stroke="#ffc658"
                        fill="#ffc658"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          
          <TabsContent value="realtime" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ActivityFeed />
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>Current system health and performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Database Connection</span>
                        <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">API Response Time</span>
                        <Badge className="bg-green-100 text-green-800">45ms</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Active Users</span>
                        <Badge className="bg-blue-100 text-blue-800">12</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">System Load</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Real-time operational metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-2">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">8</div>
                        <div className="text-xs text-muted-foreground">Active Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">12</div>
                        <div className="text-xs text-muted-foreground">Running WOs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">5</div>
                        <div className="text-xs text-muted-foreground">Alerts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">87%</div>
                        <div className="text-xs text-muted-foreground">Efficiency</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Low Stock Alert</p>
                  <p className="text-xs text-muted-foreground">5 items are running low on stock</p>
                </div>
                <Link href="/inventory">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="h-4 w-4 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pending Work Orders</p>
                  <p className="text-xs text-muted-foreground">12 work orders are waiting to be started</p>
                </div>
                <Link href="/work-orders">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
