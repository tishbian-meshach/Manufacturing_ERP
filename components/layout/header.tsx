"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NotificationCenter } from "@/components/notifications/notification-center"

interface HeaderProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("erp_user")
    router.push("/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-red-600"
      case "manager":
        return "text-blue-600"
      case "operator":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Manufacturing ERP</h1>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationCenter />

        <div className="text-right">
          <p className="text-sm font-medium">{user.name}</p>
          <p className={cn("text-xs capitalize", getRoleColor(user.role))}>{user.role}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
