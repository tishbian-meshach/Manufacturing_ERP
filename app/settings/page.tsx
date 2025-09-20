"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Save, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

interface CompanyData {
  id: number
  name: string
  domain: string
  admin_id: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const userResponse = await fetch("/api/me", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData.user)
        setCompany(userData.company)
      } else {
        throw new Error("Failed to fetch profile data")
      }

    } catch (err) {
      console.error("Failed to fetch profile:", err)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem("erp_token")

      // Save user profile
      if (user) {
        const userResponse = await fetch("/api/me", {
          method: "PUT",
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.name,
            email: user.email,
          }),
        })

        if (!userResponse.ok) {
          throw new Error("Failed to update user profile")
        }
      }

      // Save company info
      if (company) {
        const companyResponse = await fetch("/api/company", {
          method: "PUT",
          headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: company.name,
            domain: company.domain,
          }),
        })

        if (!companyResponse.ok) {
          throw new Error("Failed to update company info")
        }
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      })

      // Refresh data
      fetchProfile()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["admin", "manager"]}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-xl text-muted-foreground font-medium">Loading settings data...</p>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we fetch your profile information</p>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account and company information</p>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {user && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={user.email}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            )}

            {company && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={company.name}
                        onChange={(e) => setCompany({ ...company, name: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyDomain">Company Domain</Label>
                      <Input
                        id="companyDomain"
                        value={company.domain}
                        onChange={(e) => setCompany({ ...company, domain: e.target.value })}
                        placeholder="company.com"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </RoleGuard>
  )
}