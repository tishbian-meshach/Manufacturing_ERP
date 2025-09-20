"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle, CheckCircle } from "lucide-react"
import { useRealtimeUpdates, type Notification } from "@/lib/realtime"
import Link from "next/link"

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

const getNotificationBg = (type: Notification["type"]) => {
  switch (type) {
    case "error":
      return "bg-red-50 border-red-200"
    case "warning":
      return "bg-orange-50 border-orange-200"
    case "success":
      return "bg-green-50 border-green-200"
    default:
      return "bg-blue-50 border-blue-200"
  }
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeUpdates()
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-sidebar" align="end" forceMount>
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96 bg-sidebar">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 mb-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? getNotificationBg(notification.type) : "bg-background"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</span>
                        {notification.actionUrl && (
                          <Link href={notification.actionUrl}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-sm" onClick={() => setIsOpen(false)}>
              View All Notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
