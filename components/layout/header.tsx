"use client"

import React from "react"
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
  const [avatarDropdownOpen, setAvatarDropdownOpen] = React.useState(false)

  console.log("Header render:", { user: user.name, avatarDropdownOpen })

  const handleLogout = () => {
    console.log("Logout clicked")
    localStorage.removeItem("erp_user")
    localStorage.removeItem("erp_token")
    router.push("/login")
  }

  const handleAvatarDropdownChange = (open: boolean) => {
    console.log("Avatar dropdown open change:", open)
    setAvatarDropdownOpen(open)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (avatarDropdownOpen && !target.closest('.avatar-dropdown')) {
        setAvatarDropdownOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && avatarDropdownOpen) {
        setAvatarDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [avatarDropdownOpen])

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

        <div className="relative avatar-dropdown">
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full"
            onClick={() => handleAvatarDropdownChange(!avatarDropdownOpen)}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Button>

          {avatarDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 avatar-dropdown">
              <div className="p-3 border-b border-b-gray-200">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="py-1">
                <button
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => router.push('/settings')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </button>
                
                <button
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
