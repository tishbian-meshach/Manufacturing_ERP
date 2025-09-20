export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
      </div>

      <div className="grid gap-6">
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )
}
