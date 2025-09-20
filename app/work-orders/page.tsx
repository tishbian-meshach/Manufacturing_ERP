"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Play, Pause, CheckCircle, Eye, Edit, Clock } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WorkOrder {
  id: number
  wo_number: string
  mo_number: string | null
  operation_name: string
  work_center_name: string | null
  item_name: string | null
  planned_qty: number
  completed_qty: number
  status: string
  assigned_to: string | null
  assigned_user_name: string | null
  planned_start_time: string | null
  planned_end_time: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  created_at: string
  updated_at: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800"
    case "in_progress":
      return "bg-blue-100 text-blue-800"
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "on_hold":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "in_progress":
      return <Play className="h-4 w-4" />
    case "pending":
      return <Clock className="h-4 w-4" />
    case "on_hold":
      return <Pause className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export default function WorkOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filteredWOs, setFilteredWOs] = useState<WorkOrder[]>([])

  useEffect(() => {
    fetchWorkOrders()
  }, [])

  useEffect(() => {
    let filtered = workOrders

    if (searchTerm) {
      filtered = filtered.filter(
        (wo: WorkOrder) =>
          wo.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (wo.mo_number && wo.mo_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
          wo.operation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (wo.work_center_name && wo.work_center_name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((wo: WorkOrder) => wo.status === statusFilter)
    }

    setFilteredWOs(filtered)
  }, [searchTerm, statusFilter, workOrders])

  const fetchWorkOrders = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/work-orders", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch work orders")
      }
      const data = await response.json()
      setWorkOrders(data)
    } catch (err) {
      console.error("Error fetching work orders:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressPercentage = (completed: number, planned: number) => {
    return planned > 0 ? Math.round((completed / planned) * 100) : 0
  }

  const handleStatusChange = async (woId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/work-orders", {
        method: "PUT",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: woId, status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update work order status")
      }

      // Refresh the work orders list
      fetchWorkOrders()
    } catch (error) {
      console.error("Error updating work order status:", error)
      // You could add a toast notification here
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Work Orders</h1>
            <p className="text-muted-foreground">Manage and track individual work operations</p>
          </div>
          <div className="flex gap-2">
            <Link href="/work-centers">
              <Button variant="outline">Manage Work Centers</Button>
            </Link>
            <Link href="/work-orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Work Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Work Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Play className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workOrders.filter((wo: WorkOrder) => wo.status === "in_progress").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workOrders.filter((wo: WorkOrder) => wo.status === "completed").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Hold</CardTitle>
              <Pause className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workOrders.filter((wo: WorkOrder) => wo.status === "on_hold").length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by WO number, MO number, operation, or work center..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Work Orders ({filteredWOs.length})</CardTitle>
            <CardDescription>List of all work orders with their current status and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO Number</TableHead>
                  <TableHead>MO Number</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Work Center</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Planned Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWOs.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium">{wo.wo_number}</TableCell>
                    <TableCell>
                      <Link href={`/manufacturing-orders/${wo.mo_number}`} className="text-blue-600 hover:underline">
                        {wo.mo_number}
                      </Link>
                    </TableCell>
                    <TableCell>{wo.operation_name}</TableCell>
                    <TableCell>{wo.work_center_name}</TableCell>
                    <TableCell>{wo.item_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {wo.completed_qty} / {wo.planned_qty}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${getProgressPercentage(wo.completed_qty, wo.planned_qty)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(wo.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(wo.status)}
                          {wo.status.replace("_", " ")}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>{wo.assigned_user_name || "Unassigned"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {wo.actual_start_time && <div className="font-medium">Actual Start: {new Date(wo.actual_start_time).toLocaleString()}</div>}
                        {wo.actual_end_time && <div className="font-medium">Actual End: {new Date(wo.actual_end_time).toLocaleString()}</div>}
                        {wo.planned_start_time && !wo.actual_start_time && <div>Planned Start: {new Date(wo.planned_start_time).toLocaleString()}</div>}
                        {wo.planned_end_time && !wo.actual_end_time && <div>Planned End: {new Date(wo.planned_end_time).toLocaleString()}</div>}
                        {!wo.planned_start_time && !wo.actual_start_time && <div className="text-muted-foreground">Not scheduled</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {wo.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(wo.id, "in_progress")}
                            className="text-blue-600"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {wo.status === "in_progress" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(wo.id, "completed")}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(wo.id, "on_hold")}
                              className="text-red-600"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
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
