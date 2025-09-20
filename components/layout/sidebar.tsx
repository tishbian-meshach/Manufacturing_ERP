"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  BarChart3,
  Users,
  Factory,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
} from "lucide-react"

interface SidebarProps {
  userRole: string
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "operator"] },
  {
    name: "Manufacturing Orders",
    href: "/manufacturing-orders",
    icon: Factory,
    roles: ["admin", "manager"],
  },
  { name: "Work Orders", href: "/work-orders", icon: ClipboardList, roles: ["admin", "manager", "operator"] },
  { name: "Work Centers", href: "/work-centers", icon: Settings, roles: ["admin", "manager"] },
  { name: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "manager"] },
  { name: "BOM", href: "/inventory/bom", icon: Package, roles: ["admin", "manager"] },
  { name: "Stock Ledger", href: "/stock-ledger", icon: History, roles: ["admin", "manager"] },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "manager"] },
  { name: "Analytics", href: "/analytics", icon: TrendingUp, roles: ["admin", "manager"] },
  { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin", "manager"] },
]

export function Sidebar({ userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const filteredNavigation = navigation.filter((item) => item.roles.includes(userRole))

  return (
    <div
      className={cn("flex flex-col h-full bg-card border-r transition-all duration-300", collapsed ? "w-16" : "w-64")}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-lg font-semibold">Menu</h2>}
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="ml-auto">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", collapsed && "px-2")}
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span className="ml-2">{item.name}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
