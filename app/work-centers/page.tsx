"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Trash2, Factory, TrendingUp } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"

interface WorkCenter {
  id: number
  name: string
  description: string | null
  capacity_per_hour: number
  is_active: boolean
  created_at: string
  updated_at: string
  active_work_orders?: number
  running_work_orders?: number
  utilization_percentage?: number
}

export default function WorkCentersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity_per_hour: "",
  })
  const [deletingWorkCenter, setDeletingWorkCenter] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkCenters()
  }, [])

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
    } finally {
      setIsLoading(false)
    }
  }

  const filteredWorkCenters = workCenters.filter(
    (wc) =>
      wc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wc.description && wc.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/workcenters", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          capacity_per_hour: parseInt(formData.capacity_per_hour),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create work center")
      }

      const newWorkCenter = await response.json()
      console.log("Work center created successfully:", newWorkCenter)

      // Refresh the work centers list
      await fetchWorkCenters()

      // Reset form and close dialog
      setIsDialogOpen(false)
      setFormData({ name: "", description: "", capacity_per_hour: "" })

      // Show success message
      alert(`Work center "${newWorkCenter.name}" created successfully!`)
    } catch (error) {
      console.error("Error creating work center:", error)
      alert(error instanceof Error ? error.message : "Failed to create work center")
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return "text-red-600"
    if (utilization >= 60) return "text-yellow-600"
    return "text-green-600"
  }

  const activeWorkCenters = workCenters.filter((wc: WorkCenter) => wc.is_active)
  const totalCapacity = activeWorkCenters.reduce((sum: number, wc: WorkCenter) => sum + Number(wc.capacity_per_hour || 0), 0)
  const averageUtilization =
    activeWorkCenters.length > 0
      ? Math.round(activeWorkCenters.reduce((sum: number, wc: WorkCenter) => sum + Number(wc.utilization_percentage || 0), 0) / activeWorkCenters.length)
      : 0


  const handleDeleteWorkCenter = async (wc: WorkCenter) => {
    if (!confirm(`Are you sure you want to delete Work Center "${wc.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingWorkCenter(wc.name)
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/workcenters", {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: wc.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete work center")
      }

      // Refresh the work centers list
      await fetchWorkCenters()

      // Show success message
      alert(`Work center "${wc.name}" has been deleted successfully.`)
    } catch (error) {
      console.error("Error deleting work center:", error)
      alert(error instanceof Error ? error.message : "Failed to delete work center")
    } finally {
      setDeletingWorkCenter(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Centers</h1>
            <p className="text-muted-foreground">Monitor work center utilization based on active work orders</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Work Center
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Work Center</DialogTitle>
                <DialogDescription>Add a new work center to your manufacturing setup</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Work Center Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Assembly Line 2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the work center"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity_per_hour">Capacity per Hour *</Label>
                  <Input
                    id="capacity_per_hour"
                    name="capacity_per_hour"
                    type="number"
                    min="1"
                    value={formData.capacity_per_hour}
                    onChange={handleInputChange}
                    placeholder="Units per hour"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit">Create Work Center</Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Work Centers</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workCenters.length}</div>
              <p className="text-xs text-muted-foreground">{activeWorkCenters.length} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCapacity}</div>
              <p className="text-xs text-muted-foreground">units per hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageUtilization}%</div>
              <p className="text-xs text-muted-foreground">across active centers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Work Orders</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeWorkCenters.reduce((sum: number, wc: WorkCenter) => sum + Number(wc.running_work_orders || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">active work orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Work Centers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Centers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Work Centers ({filteredWorkCenters.length})</CardTitle>
            <CardDescription>List of all work centers with their capacity and utilization based on active work orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Capacity/Hour</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Active MOs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkCenters.map((wc) => (
                  <TableRow key={wc.id}>
                    <TableCell className="font-medium">{wc.name}</TableCell>
                    <TableCell>{wc.description}</TableCell>
                    <TableCell>{wc.capacity_per_hour} units</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getUtilizationColor(Number(wc.utilization_percentage || 0))}>{Number(wc.utilization_percentage || 0)}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Number(wc.utilization_percentage || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{Number(wc.running_work_orders || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={wc.is_active ? "default" : "secondary"}>
                        {wc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteWorkCenter(wc)}
                          title="Delete work center"
                          disabled={deletingWorkCenter === wc.name}
                        >
                          {deletingWorkCenter === wc.name ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
