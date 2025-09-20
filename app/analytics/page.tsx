import { DelayPrediction } from "@/components/advanced/delay-prediction"
import { PerformanceAnalytics } from "@/components/advanced/performance-analytics"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-muted-foreground">
          AI-powered insights and predictive analytics for manufacturing operations
        </p>
      </div>

      <div className="grid gap-6">
        <PerformanceAnalytics />
        <DelayPrediction />
      </div>
    </div>
  )
}
