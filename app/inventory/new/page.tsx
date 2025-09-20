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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewItemPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    item_code: "",
    item_name: "",
    description: "",
    unit_of_measure: "pcs",
    item_type: "raw_material",
    standard_rate: "",
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

  const handleSelectChange = (name: string, value: string) => {
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
        item_code: formData.item_code,
        item_name: formData.item_name,
        description: formData.description || undefined,
        unit_of_measure: formData.unit_of_measure,
        item_type: formData.item_type,
        standard_rate: parseFloat(formData.standard_rate),
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create item")
      }

      router.push("/inventory")
    } catch (error) {
      console.error("Error creating item:", error)
      setError(error instanceof Error ? error.message : "Failed to create item")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Inventory Item</h1>
            <p className="text-muted-foreground">Add a new item to your inventory</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Fill in the details for the new inventory item</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Item Code */}
                <div className="space-y-2">
                  <Label htmlFor="item_code">Item Code *</Label>
                  <Input
                    id="item_code"
                    name="item_code"
                    value={formData.item_code}
                    onChange={handleInputChange}
                    placeholder="e.g., RM006, SF004, FG004"
                    required
                  />
                </div>

                {/* Item Name */}
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleInputChange}
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item_type">Item Type *</Label>
                  <Select value={formData.item_type} onValueChange={(value) => handleSelectChange("item_type", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select item type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw_material">Raw Material</SelectItem>
                      <SelectItem value="semi_finished">Semi-finished Good</SelectItem>
                      <SelectItem value="finished_good">Finished Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
                  <Select
                    value={formData.unit_of_measure}
                    onValueChange={(value) => handleSelectChange("unit_of_measure", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="liter">Liters (liter)</SelectItem>
                      <SelectItem value="meter">Meters (meter)</SelectItem>
                      <SelectItem value="sqm">Square Meters (sqm)</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="roll">Roll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Standard Rate */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="standard_rate">Standard Rate ($) *</Label>
                  <Input
                    id="standard_rate"
                    name="standard_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.standard_rate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
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
                  placeholder="Optional description of the item..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Creating..." : "Create Item"}
                </Button>
                <Link href="/inventory">
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
