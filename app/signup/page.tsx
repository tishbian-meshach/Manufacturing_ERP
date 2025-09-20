"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { User, Lock, Mail, Building2 } from "lucide-react"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  })
  const [invitationData, setInvitationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setVerifying(false)
      return
    }

    // Verify invitation token
    fetch(`/api/signup/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInvitationData(data.invitation)
        } else {
          setError(data.error || "Invalid or expired invitation")
        }
      })
      .catch(() => setError("Failed to verify invitation"))
      .finally(() => setVerifying(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("token", data.token)
        router.push("/dashboard")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Signup failed")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">Invalid Invitation</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Account</CardTitle>
          <CardDescription>You've been invited to join {invitationData?.companyName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              <span>{invitationData?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span>{invitationData?.companyName}</span>
            </div>
            <div className="text-sm font-medium text-primary capitalize">Role: {invitationData?.role}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Your Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  className="pl-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Complete Signup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
