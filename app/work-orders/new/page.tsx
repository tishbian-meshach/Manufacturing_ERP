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

interface ManufacturingOrder {
  id: number
  mo_number: string
  item_name: string
  planned_qty: number
  produced_qty: number
}

interface WorkCenter {
  id: number
  name: string
  capacity_per_hour: number
}

interface User {
  id: string
  name: string
  role: string
}

export default function NewWorkOrderPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    manufacturing_order_id: "",
    work_center_id: "",
    operation_name: "",
    planned_qty: "",
    planned_start_time: "",
    planned_end_time: "",
    assigned_to: "",
    notes: "",
  })
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchManufacturingOrders()
    fetchWorkCenters()
    fetchUsers()
  }, [])

  const fetchManufacturingOrders = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/manufacturing-orders", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch manufacturing orders")
      }
      const data = await response.json()
      setManufacturingOrders(data)
    } catch (err) {
      console.error("Error fetching manufacturing orders:", err)
    }
  }

  const fetchWorkCenters = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/workcenters", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch work centers")
      }
      const data = await response.json()
      setWorkCenters(data)
    } catch (err) {
      console.error("Error fetching work centers:", err)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/users", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      console.error("Error fetching users:", err)
      // Fallback to empty array if API fails
      setUsers([])
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
        manufacturing_order_id: parseInt(formData.manufacturing_order_id),
        work_center_id: parseInt(formData.work_center_id),
        operation_name: formData.operation_name,
        planned_qty: parseInt(formData.planned_qty),
        planned_start_time: formData.planned_start_time || undefined,
        planned_end_time: formData.planned_end_time || undefined,
        assigned_to: formData.assigned_to || undefined,
        notes: formData.notes || undefined,
      }

      const token = localStorage.getItem("erp_token")
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create work order")
      }

      router.push("/work-orders")
    } catch (error) {
      console.error("Error creating WO:", error)
      setError(error instanceof Error ? error.message : "Failed to create work order")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMO = manufacturingOrders.find((mo) => mo.id === parseInt(formData.manufacturing_order_id))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/work-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">New Work Order</h1>
            <p className="text-muted-foreground">Create a new work order for a manufacturing operation</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Work Order Details</CardTitle>
            <CardDescription>Fill in the details for the new work order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Manufacturing Order Selection */}
                <div className="space-y-2">
                  <Label htmlFor="manufacturing_order_id">Manufacturing Order *</Label>
                  <Select
                    value={formData.manufacturing_order_id}
                    onValueChange={(value) => handleSelectChange("manufacturing_order_id", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Manufacturing Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturingOrders.map((mo) => (
                        <SelectItem key={mo.id} value={mo.id.toString()}>
                          {mo.mo_number} - {mo.item_name} (Qty: {mo.planned_qty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Work Center Selection */}
                <div className="space-y-2">
                  <Label htmlFor="work_center_id">Work Center *</Label>
                  <Select
                    value={formData.work_center_id}
                    onValueChange={(value) => handleSelectChange("work_center_id", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Work Center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id.toString()}>
                          {wc.name} (Capacity: {wc.capacity_per_hour}/hr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operation Name */}
                <div className="space-y-2">
                  <Label htmlFor="operation_name">Operation Name *</Label>
                  <Input
                    id="operation_name"
                    name="operation_name"
                    value={formData.operation_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Assembly, Machining, Quality Check"
                    required
                  />
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
                    placeholder={selectedMO ? `Max: ${selectedMO.planned_qty}` : "Enter quantity"}
                    required
                  />
                  {selectedMO && (
                    <p className="text-sm text-muted-foreground">
                      Manufacturing Order quantity: {selectedMO.planned_qty}
                    </p>
                  )}
                </div>

                {/* Planned Start Time */}
                <div className="space-y-2">
                  <Label htmlFor="planned_start_time">Planned Start Time</Label>
                  <Input
                    id="planned_start_time"
                    name="planned_start_time"
                    type="datetime-local"
                    value={formData.planned_start_time}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Planned End Time */}
                <div className="space-y-2">
                  <Label htmlFor="planned_end_time">Planned End Time</Label>
                  <Input
                    id="planned_end_time"
                    name="planned_end_time"
                    type="datetime-local"
                    value={formData.planned_end_time}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Assigned To */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => handleSelectChange("assigned_to", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  placeholder="Additional notes or instructions for this work order..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Creating..." : "Create Work Order"}
                </Button>
                <Link href="/work-orders">
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
