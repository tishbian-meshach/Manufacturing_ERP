"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, TrendingUp, Clock, Target } from "lucide-react"

interface DelayPrediction {
  workOrderId: string
  workOrderName: string
  currentProgress: number
  predictedDelay: number
  riskLevel: "low" | "medium" | "high"
  factors: string[]
  recommendation: string
}

export function DelayPrediction() {
  const [predictions, setPredictions] = useState<DelayPrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate ML-based delay prediction
    const mockPredictions: DelayPrediction[] = [
      {
        workOrderId: "WO-001",
        workOrderName: "Assembly Line A - Product X",
        currentProgress: 65,
        predictedDelay: 2.5,
        riskLevel: "high",
        factors: ["Resource shortage", "Equipment maintenance due"],
        recommendation: "Allocate additional resources or reschedule maintenance",
      },
      {
        workOrderId: "WO-003",
        workOrderName: "Quality Control - Product Y",
        currentProgress: 80,
        predictedDelay: 0.5,
        riskLevel: "low",
        factors: ["Minor bottleneck in testing"],
        recommendation: "Monitor closely, no immediate action needed",
      },
      {
        workOrderId: "WO-005",
        workOrderName: "Packaging - Product Z",
        currentProgress: 45,
        predictedDelay: 1.2,
        riskLevel: "medium",
        factors: ["Supplier delay", "Increased demand"],
        recommendation: "Contact backup suppliers, consider overtime",
      },
    ]

    setTimeout(() => {
      setPredictions(mockPredictions)
      setLoading(false)
    }, 1000)
  }, [])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Delay Prediction Analysis
          </CardTitle>
          <CardDescription>AI-powered delay prediction for work orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Delay Prediction Analysis
        </CardTitle>
        <CardDescription>AI-powered delay prediction for work orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {predictions.map((prediction) => (
            <div key={prediction.workOrderId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{prediction.workOrderName}</h4>
                  <p className="text-sm text-muted-foreground">ID: {prediction.workOrderId}</p>
                </div>
                <Badge className={getRiskColor(prediction.riskLevel)}>{prediction.riskLevel.toUpperCase()} RISK</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{prediction.currentProgress}%</span>
                </div>
                <Progress value={prediction.currentProgress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>Predicted Delay: {prediction.predictedDelay} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>Risk Level: {prediction.riskLevel}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors:
                </h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {prediction.factors.map((factor, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-current rounded-full" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Recommendation:</h5>
                <p className="text-sm text-blue-800 dark:text-blue-200">{prediction.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
