"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Factory, Package, AlertTriangle, CheckCircle, Play } from "lucide-react"

interface ActivityItem {
  id: string
  type: "mo_created" | "wo_started" | "wo_completed" | "stock_movement" | "alert"
  title: string
  description: string
  timestamp: Date
  status: "info" | "success" | "warning" | "error"
  metadata?: Record<string, any>
}

// Mock activity data generator
const generateActivity = (): ActivityItem => {
  const activities = [
    {
      type: "mo_created" as const,
      title: "New Manufacturing Order",
      description: `MO-2024-${String(Math.floor(Math.random() * 999)).padStart(3, "0")} created for Product A`,
      status: "info" as const,
    },
    {
      type: "wo_started" as const,
      title: "Work Order Started",
      description: `Assembly operation started at Assembly Line 1`,
      status: "info" as const,
    },
    {
      type: "wo_completed" as const,
      title: "Work Order Completed",
      description: `Quality check completed - 50 units passed`,
      status: "success" as const,
    },
    {
      type: "stock_movement" as const,
      title: "Stock Movement",
      description: `150 units of Steel Rod consumed for production`,
      status: "info" as const,
    },
    {
      type: "alert" as const,
      title: "Low Stock Alert",
      description: `Plastic Pellets running low - 8 units remaining`,
      status: "warning" as const,
    },
  ]

  const randomActivity = activities[Math.floor(Math.random() * activities.length)]

  return {
    id: `activity-${Date.now()}-${Math.random()}`,
    ...randomActivity,
    timestamp: new Date(),
  }
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    // Initial activities
    const initialActivities = Array.from({ length: 5 }, () => generateActivity())
    setActivities(initialActivities)

    // Add new activity every 15 seconds
    const interval = setInterval(() => {
      const newActivity = generateActivity()
      setActivities((prev) => [newActivity, ...prev.slice(0, 19)]) // Keep last 20 activities
    }, 15000)

    return () => clearInterval(interval)
  }, [])

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "mo_created":
        return <Factory className="h-4 w-4 text-blue-500" />
      case "wo_started":
        return <Play className="h-4 w-4 text-green-500" />
      case "wo_completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "stock_movement":
        return <Package className="h-4 w-4 text-purple-500" />
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: ActivityItem["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "warning":
        return "bg-orange-100 text-orange-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Live Activity Feed
        </CardTitle>
        <CardDescription>Real-time updates from your manufacturing operations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{activity.description}</p>
                    <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
