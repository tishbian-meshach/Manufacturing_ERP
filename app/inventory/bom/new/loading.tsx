import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-lg text-muted-foreground">Loading BOM form data...</p>
      </div>
    </div>
  )
}