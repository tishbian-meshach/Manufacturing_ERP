"use client"

import type React from "react"

import { useState, useEffect } from "react"
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

interface Item {
  id: number
  item_code: string
  item_name: string
  item_type: string
}

interface BOM {
  id: number
  bom_name: string
  item_id: number
}

export default function NewManufacturingOrderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    item_id: "",
    bom_id: "",
    planned_qty: "",
    planned_start_date: "",
    planned_end_date: "",
    priority: "medium",
    notes: "",
  })
  const [items, setItems] = useState<Item[]>([])
  const [boms, setBoms] = useState<BOM[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchItems()
    fetchBOMs()
  }, [])

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/items", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch items")
      }
      const data = await response.json()
      // Filter to only finished goods for manufacturing orders
      const finishedGoods = data.filter((item: Item) => item.item_type === "finished_good")
      setItems(finishedGoods)
    } catch (err) {
      console.error("Error fetching items:", err)
      setError(err instanceof Error ? err.message : "Failed to load items")
    }
  }

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/boms", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch BOMs")
      }
      const data = await response.json()
      setBoms(data)
    } catch (err) {
      console.error("Error fetching BOMs:", err)
    }
  }

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
        item_id: parseInt(formData.item_id),
        bom_id: formData.bom_id ? parseInt(formData.bom_id) : undefined,
        planned_qty: parseInt(formData.planned_qty),
        planned_start_date: formData.planned_start_date || undefined,
        planned_end_date: formData.planned_end_date || undefined,
        priority: formData.priority,
      }

      const token = localStorage.getItem("erp_token")
      const response = await fetch('/api/manufacturing-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create manufacturing order")
      }

      router.push("/manufacturing-orders")
    } catch (error) {
      console.error("Error creating MO:", error)
      setError(error instanceof Error ? error.message : "Failed to create manufacturing order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const availableBOMs = boms.filter((bom) => !formData.item_id || bom.item_id === parseInt(formData.item_id))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/manufacturing-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Manufacturing Order</h1>
            <p className="text-muted-foreground">Create a new manufacturing order</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Order Details</CardTitle>
            <CardDescription>Fill in the details for the new manufacturing order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Item Selection */}
                <div className="space-y-2">
                  <Label htmlFor="item_id">Item to Manufacture *</Label>
                  <Select value={formData.item_id} onValueChange={(value) => handleSelectChange("item_id", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.item_code} - {item.item_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* BOM Selection */}
                <div className="space-y-2">
                  <Label htmlFor="bom_id">Bill of Materials *</Label>
                  <Select
                    value={formData.bom_id}
                    onValueChange={(value) => handleSelectChange("bom_id", value)}
                    disabled={!formData.item_id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a BOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBOMs.map((bom) => (
                        <SelectItem key={bom.id} value={bom.id.toString()}>
                          {bom.bom_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Planned Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="planned_qty">Planned Quantity *</Label>
                  <Input
                    id="planned_qty"
                    name="planned_qty"
                    type="number"
                    min="1"
                    value={formData.planned_qty}
                    onChange={handleInputChange}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Planned Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="planned_start_date">Planned Start Date</Label>
                  <Input
                    id="planned_start_date"
                    name="planned_start_date"
                    type="date"
                    value={formData.planned_start_date}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Planned End Date */}
                <div className="space-y-2">
                  <Label htmlFor="planned_end_date">Planned End Date</Label>
                  <Input
                    id="planned_end_date"
                    name="planned_end_date"
                    type="date"
                    value={formData.planned_end_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes or instructions..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Creating..." : "Create Manufacturing Order"}
                </Button>
                <Link href="/manufacturing-orders">
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
