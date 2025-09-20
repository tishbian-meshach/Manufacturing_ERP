"use client"

// Real-time updates and notifications system
// In production, this would integrate with WebSockets or Server-Sent Events

export interface Notification {
  id: string
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface RealtimeUpdate {
  type: "mo_status_change" | "wo_status_change" | "stock_alert" | "system_alert"
  data: any
  timestamp: Date
}

// Mock real-time data generator
class RealtimeService {
  private listeners: ((update: RealtimeUpdate) => void)[] = []
  private notifications: Notification[] = []
  private intervalId: NodeJS.Timeout | null = null

  constructor() {
    this.addInitialNotifications()
    this.startMockUpdates()
  }

  subscribe(callback: (update: RealtimeUpdate) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  private broadcast(update: RealtimeUpdate) {
    this.listeners.forEach((listener) => listener(update))
  }

  private addInitialNotifications() {
    // Add some initial notifications to show immediately
    const initialNotifications: Notification[] = [
      {
        id: "welcome-1",
        type: "info",
        title: "Welcome to Manufacturing ERP",
        message: "Your manufacturing operations dashboard is ready",
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        read: false,
      },
      {
        id: "system-1",
        type: "success",
        title: "System Status",
        message: "All manufacturing systems are operating normally",
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        read: false,
      },
      {
        id: "inventory-1",
        type: "warning",
        title: "Inventory Alert",
        message: "5 items are running low on stock",
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        read: false,
        actionUrl: "/inventory",
      },
    ]

    this.notifications = initialNotifications
  }

  private startMockUpdates() {
    // Simulate real-time updates every 30 seconds
    this.intervalId = setInterval(() => {
      this.generateMockUpdate()
    }, 30000)
  }

  private generateMockUpdate() {
    const updateTypes = ["mo_status_change", "wo_status_change", "stock_alert", "system_alert"]
    const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)]

    let update: RealtimeUpdate

    switch (randomType) {
      case "mo_status_change":
        update = {
          type: "mo_status_change",
          data: {
            mo_number: `MO-2024-${String(Math.floor(Math.random() * 100)).padStart(3, "0")}`,
            old_status: "in_progress",
            new_status: "completed",
            item_name: "Product A",
          },
          timestamp: new Date(),
        }
        break
      case "wo_status_change":
        update = {
          type: "wo_status_change",
          data: {
            wo_number: `WO-2024-${String(Math.floor(Math.random() * 100)).padStart(3, "0")}`,
            old_status: "pending",
            new_status: "in_progress",
            work_center: "Assembly Line 1",
          },
          timestamp: new Date(),
        }
        break
      case "stock_alert":
        update = {
          type: "stock_alert",
          data: {
            item_code: "RM003",
            item_name: "Plastic Pellets",
            current_stock: 5,
            min_stock: 50,
            alert_level: "critical",
          },
          timestamp: new Date(),
        }
        break
      default:
        update = {
          type: "system_alert",
          data: {
            message: "System maintenance scheduled for tonight at 2 AM",
            severity: "info",
          },
          timestamp: new Date(),
        }
    }

    this.broadcast(update)
    this.addNotification(update)
  }

  private addNotification(update: RealtimeUpdate) {
    let notification: Notification

    switch (update.type) {
      case "mo_status_change":
        notification = {
          id: `notif-${Date.now()}`,
          type: "success",
          title: "Manufacturing Order Updated",
          message: `${update.data.mo_number} status changed to ${update.data.new_status}`,
          timestamp: update.timestamp,
          read: false,
          actionUrl: "/manufacturing-orders",
        }
        break
      case "wo_status_change":
        notification = {
          id: `notif-${Date.now()}`,
          type: "info",
          title: "Work Order Started",
          message: `${update.data.wo_number} started at ${update.data.work_center}`,
          timestamp: update.timestamp,
          read: false,
          actionUrl: "/work-orders",
        }
        break
      case "stock_alert":
        notification = {
          id: `notif-${Date.now()}`,
          type: update.data.alert_level === "critical" ? "error" : "warning",
          title: "Low Stock Alert",
          message: `${update.data.item_name} is running low (${update.data.current_stock} remaining)`,
          timestamp: update.timestamp,
          read: false,
          actionUrl: "/inventory",
        }
        break
      default:
        notification = {
          id: `notif-${Date.now()}`,
          type: "info",
          title: "System Alert",
          message: update.data.message,
          timestamp: update.timestamp,
          read: false,
        }
    }

    this.notifications.unshift(notification)
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }
  }

  getNotifications(): Notification[] {
    return this.notifications
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true))
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length
  }

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService()

// React hook for real-time updates
import { useState, useEffect } from "react"

export function useRealtimeUpdates() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe((update) => {
      setNotifications(realtimeService.getNotifications())
      setUnreadCount(realtimeService.getUnreadCount())
    })

    // Initial load
    setNotifications(realtimeService.getNotifications())
    setUnreadCount(realtimeService.getUnreadCount())

    return unsubscribe
  }, [])

  const markAsRead = (notificationId: string) => {
    realtimeService.markAsRead(notificationId)
    setNotifications(realtimeService.getNotifications())
    setUnreadCount(realtimeService.getUnreadCount())
  }

  const markAllAsRead = () => {
    realtimeService.markAllAsRead()
    setNotifications(realtimeService.getNotifications())
    setUnreadCount(realtimeService.getUnreadCount())
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
