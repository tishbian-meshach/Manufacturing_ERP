"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Activity, Zap, Clock, Users } from "lucide-react"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function PerformanceAnalytics() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const token = localStorage.getItem("erp_token")
        const response = await fetch("/api/analytics", {
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data")
        }

        const analyticsData = await response.json()
        setData(analyticsData)
      } catch (error) {
        console.error("Error fetching analytics data:", error)
        // Fallback to mock data if API fails
        const mockData = {
          efficiency: [
            { month: "Jan", efficiency: 85, target: 90 },
            { month: "Feb", efficiency: 88, target: 90 },
            { month: "Mar", efficiency: 92, target: 90 },
            { month: "Apr", efficiency: 87, target: 90 },
            { month: "May", efficiency: 94, target: 90 },
            { month: "Jun", efficiency: 91, target: 90 },
          ],
          throughput: [
            { day: "Mon", units: 120, capacity: 150 },
            { day: "Tue", units: 135, capacity: 150 },
            { day: "Wed", units: 142, capacity: 150 },
            { day: "Thu", units: 128, capacity: 150 },
            { day: "Fri", units: 145, capacity: 150 },
            { day: "Sat", units: 98, capacity: 150 },
            { day: "Sun", units: 75, capacity: 150 },
          ],
          workCenterUtilization: [
            { name: "Assembly Line A", value: 85, color: "#0088FE" },
            { name: "Assembly Line B", value: 92, color: "#00C49F" },
            { name: "Quality Control", value: 78, color: "#FFBB28" },
            { name: "Packaging", value: 88, color: "#FF8042" },
            { name: "Maintenance", value: 65, color: "#8884D8" },
          ],
          qualityMetrics: [
            { week: "W1", defectRate: 2.1, reworkRate: 1.5 },
            { week: "W2", defectRate: 1.8, reworkRate: 1.2 },
            { week: "W3", defectRate: 1.5, reworkRate: 0.9 },
            { week: "W4", defectRate: 1.9, reworkRate: 1.1 },
          ],
        }
        setData(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
          <CardDescription>Advanced manufacturing performance insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Analytics
        </CardTitle>
        <CardDescription>Advanced manufacturing performance insights</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="efficiency" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Current Efficiency</span>
                  </div>
                  <div className="text-2xl font-bold">{data?.metrics?.currentEfficiency || 0}%</div>
                  <div className="text-xs text-muted-foreground">Current efficiency</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Target Achievement</span>
                  </div>
                  <div className="text-2xl font-bold">{data?.metrics?.targetAchievement || 0}%</div>
                  <div className="text-xs text-muted-foreground">Above target</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Avg Cycle Time</span>
                  </div>
                  <div className="text-2xl font-bold">{data?.metrics?.avgCycleTime || 0}h</div>
                  <div className="text-xs text-muted-foreground">Average cycle time</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Productivity</span>
                  </div>
                  <div className="text-2xl font-bold">{data?.metrics?.productivity || 0}</div>
                  <div className="text-xs text-muted-foreground">Units per work order</div>
                </CardContent>
              </Card>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.efficiency}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="efficiency" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="#82ca9d" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="throughput" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.throughput}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="capacity"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                  />
                  <Area type="monotone" dataKey="units" stackId="2" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="utilization" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.workCenterUtilization}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.workCenterUtilization.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data.workCenterUtilization.map((center: any, index: number) => (
                  <div key={center.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{center.name}</span>
                    </div>
                    <Badge variant={center.value > 85 ? "default" : center.value > 70 ? "secondary" : "destructive"}>
                      {center.value}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.qualityMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="defectRate" fill="#ff7c7c" name="Defect Rate %" />
                  <Bar dataKey="reworkRate" fill="#ffa726" name="Rework Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
