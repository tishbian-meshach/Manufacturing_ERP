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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Loader2, GripVertical, X, Settings } from "lucide-react"
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

interface WorkCenter {
  id: number
  name: string
  description: string
  capacity_per_hour: number
}

interface SelectedWorkCenter {
  id: number
  name: string
  description: string
  execution_order: number
  is_parallel: boolean
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
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [selectedWorkCenters, setSelectedWorkCenters] = useState<SelectedWorkCenter[]>([])
  const [availableWorkCenters, setAvailableWorkCenters] = useState<WorkCenter[]>([])
  const [draggedItem, setDraggedItem] = useState<SelectedWorkCenter | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchItems()
    fetchBOMs()
    fetchWorkCenters()
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
      setAvailableWorkCenters(data)
    } catch (err) {
      console.error("Error fetching work centers:", err)
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
        work_centers: selectedWorkCenters.map(wc => ({
          work_center_id: wc.id,
          execution_order: wc.execution_order,
          is_parallel: wc.is_parallel,
        })),
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

  // Work center management functions
  const handleWorkCenterSelect = (workCenter: WorkCenter, checked: boolean) => {
    if (checked) {
      const newSelected: SelectedWorkCenter = {
        id: workCenter.id,
        name: workCenter.name,
        description: workCenter.description,
        execution_order: selectedWorkCenters.length + 1,
        is_parallel: false,
      }
      setSelectedWorkCenters([...selectedWorkCenters, newSelected])
      setAvailableWorkCenters(availableWorkCenters.filter(wc => wc.id !== workCenter.id))
    } else {
      const removed = selectedWorkCenters.find(wc => wc.id === workCenter.id)
      if (removed) {
        setSelectedWorkCenters(selectedWorkCenters.filter(wc => wc.id !== workCenter.id))
        setAvailableWorkCenters([...availableWorkCenters, workCenter])
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, item: SelectedWorkCenter) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    // Use browser's default drag image for smoother experience
    e.dataTransfer.setData('text/plain', item.id.toString())
  }

  const createDragOverHandler = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      setDragOverIndex(index)
    })
  }

  const createDropHandler = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedItem) return

    const draggedIndex = selectedWorkCenters.findIndex(wc => wc.id === draggedItem.id)
    if (draggedIndex === -1) return

    const newWorkCenters = [...selectedWorkCenters]
    newWorkCenters.splice(draggedIndex, 1)

    // Insert at the correct position
    const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
    newWorkCenters.splice(insertIndex, 0, draggedItem)

    // Update execution order
    const updatedWorkCenters = newWorkCenters.map((wc, index) => ({
      ...wc,
      execution_order: index + 1
    }))

    setSelectedWorkCenters(updatedWorkCenters)
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragLeave = () => {
    // Use requestAnimationFrame for smoother clearing
    requestAnimationFrame(() => {
      setDragOverIndex(null)
    })
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const draggedIndex = selectedWorkCenters.findIndex(wc => wc.id === draggedItem.id)
    if (draggedIndex === -1) return

    const newWorkCenters = [...selectedWorkCenters]
    newWorkCenters.splice(draggedIndex, 1)

    // Insert at the correct position
    const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
    newWorkCenters.splice(insertIndex, 0, draggedItem)

    // Update execution order
    const updatedWorkCenters = newWorkCenters.map((wc, index) => ({
      ...wc,
      execution_order: index + 1
    }))

    setSelectedWorkCenters(updatedWorkCenters)

    // Small delay for smooth visual transition
    setTimeout(() => {
      setDraggedItem(null)
      setDragOverIndex(null)
    }, 50)
  }

  const handleDragEnd = () => {
    // Use requestAnimationFrame for smoother cleanup
    requestAnimationFrame(() => {
      setDraggedItem(null)
      setDragOverIndex(null)
    })
  }

  const handleParallelToggle = (workCenterId: number, isParallel: boolean) => {
    setSelectedWorkCenters(selectedWorkCenters.map(wc =>
      wc.id === workCenterId ? { ...wc, is_parallel: isParallel } : wc
    ))
  }


  const removeWorkCenter = (workCenterId: number) => {
    const removed = selectedWorkCenters.find(wc => wc.id === workCenterId)
    if (removed) {
      setSelectedWorkCenters(selectedWorkCenters.filter(wc => wc.id !== workCenterId))
      const originalWorkCenter = workCenters.find(wc => wc.id === workCenterId)
      if (originalWorkCenter) {
        setAvailableWorkCenters([...availableWorkCenters, originalWorkCenter])
      }
    }
  }

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

              {/* Work Centers Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <Label className="text-lg font-semibold">Work Centers & Execution Plan</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select work centers and define their execution order. Drag to reorder, toggle parallel execution.
                </p>

                {/* Available Work Centers */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Available Work Centers</Label>
                  <div className="grid gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {availableWorkCenters.map((workCenter) => (
                      <div key={workCenter.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`wc-${workCenter.id}`}
                          checked={false}
                          onCheckedChange={(checked) =>
                            handleWorkCenterSelect(workCenter, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`wc-${workCenter.id}`}
                          className="flex-1 text-sm cursor-pointer"
                        >
                          <div className="font-medium">{workCenter.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {workCenter.description} • {workCenter.capacity_per_hour} units/hour
                          </div>
                        </Label>
                      </div>
                    ))}
                    {availableWorkCenters.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All work centers have been selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Selected Work Centers with Drag & Drop */}
                {selectedWorkCenters.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Work Centers (Drag to reorder)</Label>
                    <div className="space-y-2">
                      {selectedWorkCenters.map((workCenter, index) => (
                        <div key={`workcenter-${workCenter.id}`}>
                          {/* Drop zone indicator */}
                          {dragOverIndex === index && draggedItem && (
                            <div className="h-2 bg-blue-500 rounded-full animate-pulse mb-2" />
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, workCenter)}
                            onDragOver={createDragOverHandler(index)}
                            onDrop={createDropHandler(index)}
                            onDragLeave={handleDragLeave}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-3 border rounded-md cursor-move transition-all duration-150 ease-out will-change-transform ${
                              draggedItem?.id === workCenter.id
                                ? 'opacity-60 shadow-lg scale-102 z-10'
                                : dragOverIndex === index
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'bg-muted/50 hover:bg-muted'
                            }`}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{workCenter.execution_order}.</span>
                                <span className="font-medium">{workCenter.name}</span>
                                {workCenter.is_parallel && (
                                  <Badge variant="secondary" className="text-xs text-blue-500">
                                    Parallel
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {workCenter.description}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  id={`parallel-${workCenter.id}`}
                                  checked={workCenter.is_parallel}
                                  onCheckedChange={(checked) =>
                                    handleParallelToggle(workCenter.id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`parallel-${workCenter.id}`} className="text-xs">
                                  Parallel
                                </Label>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWorkCenter(workCenter.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Final drop zone */}
                      {dragOverIndex === selectedWorkCenters.length && draggedItem && (
                        <div className="h-2 bg-blue-500 rounded-full animate-pulse mt-2" />
                      )}
                    </div>
                  </div>
                )}
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
