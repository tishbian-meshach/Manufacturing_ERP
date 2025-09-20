"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users, UserPlus, Mail, Calendar, CheckCircle, XCircle } from "lucide-react"

export default function UsersManagementPage() {
  const [invitations, setInvitations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteForm, setInviteForm] = useState({ email: "", role: "" })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invitationsRes, usersRes] = await Promise.all([
        fetch("/api/invite", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch("/api/users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ])

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json()
        setInvitations(invitationsData.invitations)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)

    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(inviteForm),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Invitation sent! Signup link: ${data.signupLink}`)
        setInviteForm({ email: "", role: "" })
        setShowInviteDialog(false)
        fetchData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to send invitation")
      }
    } catch (error) {
      alert("Network error occurred")
    } finally {
      setInviteLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "manager":
        return "bg-blue-100 text-blue-800"
      case "operator":
        return "bg-green-100 text-green-800"
      case "inventory":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage company users and invitations</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>Send an invitation to join your company</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  className="bg-white"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={inviteLoading}>
                {inviteLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Users ({users.length})
            </CardTitle>
            <CardDescription>Company team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                  <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                </div>
              ))}
              {users.length === 0 && <div className="text-center py-8 text-gray-500">No active users yet</div>}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations ({invitations.filter((inv: any) => !inv.used).length})
            </CardTitle>
            <CardDescription>Sent invitations awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation: any) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{invitation.email}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(invitation.role)}>{invitation.role}</Badge>
                    {invitation.used ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : new Date(invitation.expires_at) < new Date() ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
              {invitations.length === 0 && (
                <div className="text-center py-8 text-gray-500">No invitations sent yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
