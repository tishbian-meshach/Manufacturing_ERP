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
import { ArrowLeft, Save, Loader2, CheckCircle, Clock, Lock, Zap, Play } from "lucide-react"
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

interface WorkCenterAssignment {
  id: number
  work_center_id: number
  execution_order: number
  is_parallel: boolean
  work_center_name: string
  has_work_order: boolean
  work_order_status?: string
  work_order_id?: number
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
  const [workCenterAssignments, setWorkCenterAssignments] = useState<WorkCenterAssignment[]>([])
  const [availableWorkCenters, setAvailableWorkCenters] = useState<WorkCenterAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchManufacturingOrders(),
        fetchWorkCenters(),
        fetchUsers()
      ])
    } catch (err) {
      console.error("Error fetching initial data:", err)
    } finally {
      setIsLoading(false)
    }
  }

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

  const fetchWorkCenterAssignments = async (moId: number) => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch(`/api/manufacturing-orders/${moId}/work-centers`, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch work center assignments")
      }
      const data = await response.json()
      setWorkCenterAssignments(data)
      updateAvailableWorkCenters(data)
    } catch (err) {
      console.error("Error fetching work center assignments:", err)
      setWorkCenterAssignments([])
      setAvailableWorkCenters([])
    }
  }

  const updateAvailableWorkCenters = (assignments: WorkCenterAssignment[]) => {
    if (assignments.length === 0) {
      setAvailableWorkCenters([])
      return
    }

    const available: WorkCenterAssignment[] = []

    // First, add all parallel work centers (they are always available)
    assignments.forEach(assignment => {
      if (assignment.is_parallel && !assignment.has_work_order) {
        available.push(assignment)
      }
    })

    // Then, add sequential work centers based on execution order rules
    // Group by execution order
    const groupedByOrder = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.execution_order]) {
        acc[assignment.execution_order] = []
      }
      acc[assignment.execution_order].push(assignment)
      return acc
    }, {} as Record<number, WorkCenterAssignment[]>)

    // Sort execution orders
    const executionOrders = Object.keys(groupedByOrder)
      .map(Number)
      .sort((a, b) => a - b)

    // Iterate through execution orders and determine which sequential ones are available
    for (let i = 0; i < executionOrders.length; i++) {
      const currentOrder = executionOrders[i]
      const currentOrderAssignments = groupedByOrder[currentOrder]

      let canExecuteCurrentOrder = true

      if (i > 0) {
        // Check previous execution orders
        for (let j = 0; j < i; j++) {
          const prevOrder = executionOrders[j]
          const prevOrderAssignments = groupedByOrder[prevOrder]

          // Check if all work centers in previous order are completed
          const allPrevCompleted = prevOrderAssignments.every(assignment => {
            return assignment.has_work_order && assignment.work_order_status === 'completed'
          })

          if (!allPrevCompleted) {
            // Special case: If previous order has parallel work centers,
            // allow current order if at least one work center is completed
            const atLeastOneCompleted = prevOrderAssignments.some(assignment => {
              return assignment.has_work_order && assignment.work_order_status === 'completed'
            })
            canExecuteCurrentOrder = atLeastOneCompleted
            break
          }
        }
      }

      if (canExecuteCurrentOrder) {
        // Add sequential work centers from this execution order that don't have work orders yet
        // (parallel ones were already added above)
        currentOrderAssignments.forEach(assignment => {
          if (!assignment.is_parallel && !assignment.has_work_order) {
            available.push(assignment)
          }
        })
      }
    }

    // Sort by execution order for better UX
    available.sort((a, b) => a.execution_order - b.execution_order)

    setAvailableWorkCenters(available)
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

    // If manufacturing order is selected, fetch its work center assignments
    if (name === "manufacturing_order_id" && value) {
      const moId = parseInt(value)
      fetchWorkCenterAssignments(moId)
    }

    // Clear work center selection when MO changes
    if (name === "manufacturing_order_id") {
      setFormData((prev) => ({
        ...prev,
        work_center_id: "",
      }))
    }
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading work order data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

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
                  {availableWorkCenters.length > 0 ? (
                    <Select
                      value={formData.work_center_id}
                      onValueChange={(value) => handleSelectChange("work_center_id", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a Work Center" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWorkCenters.map((assignment) => {
                          const workCenter = workCenters.find(wc => wc.id === assignment.work_center_id)
                          return workCenter ? (
                            <SelectItem key={assignment.id} value={assignment.work_center_id.toString()}>
                              <div className="flex items-center gap-2">
                                {workCenter.name}
                                {assignment.is_parallel && <Zap className="h-3 w-3 text-blue-500" />}
                                <span className="text-xs text-muted-foreground">
                                  (Order: {assignment.execution_order})
                                </span>
                              </div>
                            </SelectItem>
                          ) : null
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-full p-3 border rounded-md bg-muted text-muted-foreground text-sm">
                      {formData.manufacturing_order_id
                        ? "No work centers available for this manufacturing order"
                        : "Select a manufacturing order first"
                      }
                    </div>
                  )}

                  {/* Show execution order info */}
                  {workCenterAssignments.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Execution Status:</strong></p>
                      {workCenterAssignments
                        .sort((a, b) => a.execution_order - b.execution_order)
                        .map((assignment) => {
                          const workCenter = workCenters.find(wc => wc.id === assignment.work_center_id)
                          const isAvailable = availableWorkCenters.some(available => available.work_center_id === assignment.work_center_id)
                          const isUsed = assignment.has_work_order

                          let statusIcon = null
                          let statusText = ""
                          let statusClass = ""

                          if (isUsed) {
                            if (assignment.work_order_status === 'completed') {
                              statusIcon = <CheckCircle className="h-3 w-3" />
                              statusText = "Completed"
                              statusClass = "text-green-600"
                            } else if (assignment.work_order_status === 'in_progress') {
                              statusIcon = <Clock className="h-3 w-3" />
                              statusText = "In Progress"
                              statusClass = "text-blue-600"
                            } else {
                              statusIcon = <Play className="h-3 w-3" />
                              statusText = assignment.work_order_status?.replace('_', ' ') || 'Pending'
                              statusClass = "text-orange-600"
                            }
                          } else if (isAvailable) {
                            statusIcon = <Play className="h-3 w-3" />
                            statusText = "Available"
                            statusClass = "text-foreground font-medium"
                          } else {
                            statusIcon = <Lock className="h-3 w-3" />
                            statusText = "Locked"
                            statusClass = "text-muted-foreground"
                          }

                          return workCenter ? (
                            <div key={assignment.id} className={`pl-2 flex items-center gap-2 ${statusClass}`}>
                              <span>{assignment.execution_order}. {workCenter.name}</span>
                              {assignment.is_parallel && <Zap className="h-3 w-3 text-blue-500" />}
                              <div className="flex items-center gap-1">
                                {statusIcon}
                                <span className="text-xs">{statusText}</span>
                              </div>
                            </div>
                          ) : null
                        })}
                    </div>
                  )}
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
