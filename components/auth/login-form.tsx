"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>
  isLoading?: boolean
  error?: string
}

export function LoginForm({ onLogin, isLoading = false, error }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      await onLogin(email, password)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Manufacturing ERP</CardTitle>
        <CardDescription>Sign in to access the system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/admin-signup"
              className="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
            >
              Create Company Account
            </Link>
          </p>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Demo Accounts:</p>
          <div className="space-y-1">
            <p>
              <strong>Admin:</strong> admin@company.com / admin123
            </p>
            <p>
              <strong>Manager:</strong> manager@company.com / manager123
            </p>
            <p>
              <strong>Operator:</strong> operator1@company.com / operator123
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
