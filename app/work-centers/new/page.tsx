"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewWorkCenterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity_per_hour: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const submitData = {
        name: formData.name,
        description: formData.description || undefined,
        capacity_per_hour: parseInt(formData.capacity_per_hour),
      }

      const response = await fetch('/api/workcenters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create work center")
      }

      router.push("/work-centers")
    } catch (error) {
      console.error("Error creating work center:", error)
      setError(error instanceof Error ? error.message : "Failed to create work center")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/work-centers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Work Center</h1>
            <p className="text-muted-foreground">Add a new work center to your manufacturing facility</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Work Center Details</CardTitle>
            <CardDescription>Fill in the details for the new work center</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Work Center Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Work Center Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Assembly Line 2, CNC Machine 2"
                    required
                  />
                </div>

                {/* Capacity per Hour */}
                <div className="space-y-2">
                  <Label htmlFor="capacity_per_hour">Capacity per Hour *</Label>
                  <Input
                    id="capacity_per_hour"
                    name="capacity_per_hour"
                    type="number"
                    min="1"
                    value={formData.capacity_per_hour}
                    onChange={handleInputChange}
                    placeholder="e.g., 10, 5, 20"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of units this work center can process per hour
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description of the work center..."
                  rows={3}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Work Center"
                  )}
                </Button>
                <Link href="/work-centers">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}