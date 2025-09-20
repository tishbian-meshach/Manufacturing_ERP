import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityStyles = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "low":
        return "priority-low"
      case "medium":
        return "priority-medium"
      case "high":
        return "priority-high"
      case "urgent":
        return "priority-urgent"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return <Badge className={cn(getPriorityStyles(priority), className)}>{priority.toUpperCase()}</Badge>
}
