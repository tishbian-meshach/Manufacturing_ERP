"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react"

interface LiveMetric {
  id: string
  label: string
  value: number
  previousValue: number
  unit: string
  trend: "up" | "down" | "stable"
  changePercent: number
}

// Mock live metrics data
const generateLiveMetrics = (): LiveMetric[] => {
  const baseMetrics = [
    { id: "efficiency", label: "Overall Efficiency", baseValue: 87, unit: "%" },
    { id: "throughput", label: "Hourly Throughput", baseValue: 45, unit: "units" },
    { id: "quality", label: "Quality Score", baseValue: 96.5, unit: "%" },
    { id: "utilization", label: "Equipment Utilization", baseValue: 78, unit: "%" },
  ]

  return baseMetrics.map((metric) => {
    const variation = (Math.random() - 0.5) * 10 // ±5% variation
    const newValue = Math.max(0, metric.baseValue + variation)
    const previousValue = metric.baseValue
    const changePercent = ((newValue - previousValue) / previousValue) * 100

    let trend: "up" | "down" | "stable" = "stable"
    if (Math.abs(changePercent) > 1) {
      trend = changePercent > 0 ? "up" : "down"
    }

    return {
      id: metric.id,
      label: metric.label,
      value: Number(newValue.toFixed(1)),
      previousValue,
      unit: metric.unit,
      trend,
      changePercent: Number(changePercent.toFixed(1)),
    }
  })
}

export function LiveMetrics() {
  const [metrics, setMetrics] = useState<LiveMetric[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    // Initial load
    setMetrics(generateLiveMetrics())
    setLastUpdate(new Date())

    // Update every 10 seconds
    const interval = setInterval(() => {
      setMetrics(generateLiveMetrics())
      setLastUpdate(new Date())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const getTrendIcon = (trend: LiveMetric["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: LiveMetric["trend"]) => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Live Metrics
        </CardTitle>
        <CardDescription>
          Real-time performance indicators • Last updated: {lastUpdate.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {metric.value}
                  {metric.unit}
                </span>
                {metric.trend !== "stable" && (
                  <Badge variant="outline" className={`text-xs ${getTrendColor(metric.trend)}`}>
                    {metric.changePercent > 0 ? "+" : ""}
                    {metric.changePercent}%
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
