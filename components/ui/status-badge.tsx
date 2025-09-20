import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "status-pending"
      case "in-progress":
      case "in_progress":
        return "status-in-progress"
      case "completed":
        return "status-completed"
      case "cancelled":
        return "status-cancelled"
      case "on-hold":
      case "on_hold":
        return "status-on-hold"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return <Badge className={cn(getStatusStyles(status), className)}>{status.replace("_", " ").toUpperCase()}</Badge>
}
