"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Trash2, Loader2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ManufacturingOrder {
  id: number
  mo_number: string
  item_name: string
  item_code: string
  planned_qty: number
  produced_qty: number
  status: string
  priority: string
  planned_start_date?: string
  planned_end_date?: string
  created_at: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800"
    case "in_progress":
      return "bg-blue-100 text-blue-800"
    case "draft":
      return "bg-gray-100 text-gray-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800"
    case "high":
      return "bg-orange-100 text-orange-800"
    case "medium":
      return "bg-yellow-100 text-yellow-800"
    case "low":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function ManufacturingOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([])
  const [filteredMOs, setFilteredMOs] = useState<ManufacturingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null)

  useEffect(() => {
    fetchManufacturingOrders()
  }, [])

  useEffect(() => {
    let filtered = manufacturingOrders

    if (searchTerm) {
      filtered = filtered.filter(
        (mo) =>
          mo.mo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mo.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mo.item_code.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((mo) => mo.status === statusFilter)
    }

    setFilteredMOs(filtered)
  }, [searchTerm, statusFilter, manufacturingOrders])

  const fetchManufacturingOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/manufacturing-orders", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.")
        }
        throw new Error("Failed to fetch manufacturing orders")
      }

      const data = await response.json()
      console.log("Fetched manufacturing orders after refresh:")
      data.forEach((mo: ManufacturingOrder) => {
        console.log(`MO ${mo.mo_number}: status=${mo.status}, produced_qty=${mo.produced_qty}, planned_qty=${mo.planned_qty}`)
      })
      setManufacturingOrders(data)
      setFilteredMOs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manufacturing orders")
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (produced: number, planned: number) => {
    console.log(`getProgressPercentage: produced=${produced}, planned=${planned}`)
    const percentage = planned > 0 ? Math.round((produced / planned) * 100) : 0
    console.log(`Calculated percentage: ${percentage}%`)
    return percentage
  }

  const autoCompleteManufacturingOrder = async (moId: number, token: string | null) => {
    try {
      console.log(`Starting auto-completion for MO ${moId}`)
      const response = await fetch("/api/manufacturing-orders", {
        method: "PUT",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: moId,
          status: 'completed'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to auto-complete manufacturing order")
      }

      const updatedMO = await response.json()
      console.log(`Successfully auto-completed manufacturing order ${moId}:`, {
        status: updatedMO.status,
        produced_qty: updatedMO.produced_qty,
        planned_qty: updatedMO.planned_qty
      })

      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refresh the manufacturing orders list
      console.log(`Refreshing data after auto-completion of MO ${moId}`)
      await fetchManufacturingOrders()
    } catch (error) {
      console.error(`Failed to auto-complete manufacturing order ${moId}:`, error)
    }
  }

  // Component for displaying progress with work center completion
  const ProgressCell = ({ mo }: { mo: ManufacturingOrder }) => {
    const [workCenterProgress, setWorkCenterProgress] = useState({ completed: 0, total: 0, percentage: 0 })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      const fetchWorkCenterProgress = async () => {
        setLoading(true)
        try {
          const token = localStorage.getItem("erp_token")
          const response = await fetch(`/api/manufacturing-orders/${mo.id}/work-centers`, {
            headers: {
              "Authorization": token ? `Bearer ${token}` : "",
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const workCenters = await response.json()
            const total = workCenters.length
            const completed = workCenters.filter((wc: any) => wc.work_order_status === 'completed').length
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

            setWorkCenterProgress({ completed, total, percentage })

            // Auto-complete MO if all work centers are completed and status is in_progress
            if (percentage === 100 && mo.status === 'in_progress' && total > 0) {
              console.log(`Auto-completing MO ${mo.mo_number}: all work centers completed`)
              await autoCompleteManufacturingOrder(mo.id, token)
            }
          }
        } catch (error) {
          console.error("Error fetching work center progress:", error)
        } finally {
          setLoading(false)
        }
      }

      fetchWorkCenterProgress()
    }, [mo.id, mo.status])

    // Always show work center progress for all statuses
    return (
      <div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              workCenterProgress.percentage >= 100 ? 'bg-green-500' :
              workCenterProgress.percentage >= 70 ? 'bg-blue-500' :
              workCenterProgress.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${workCenterProgress.percentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>Work centers: {workCenterProgress.completed}/{workCenterProgress.total} ({workCenterProgress.percentage}%)</span>
          )}
        </div>
      </div>
    )
  }


  const handleDeleteMO = async (moId: number, moNumber: string) => {
    if (!confirm(`Are you sure you want to cancel Manufacturing Order ${moNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingOrder(moNumber)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/manufacturing-orders", {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: moId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to cancel manufacturing order")
      }

      // Refresh the list
      fetchManufacturingOrders()

      // Show success message
      alert(`Manufacturing Order ${moNumber} has been cancelled successfully.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel manufacturing order")
    } finally {
      setDeletingOrder(null)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manufacturing Orders</h1>
            <p className="text-muted-foreground">Manage and track manufacturing orders</p>
          </div>
          <Link href="/manufacturing-orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Manufacturing Order
            </Button>
          </Link>
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
                    placeholder="Search by MO number, item name, or code..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Manufacturing Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Orders ({filteredMOs.length})</CardTitle>
            <CardDescription>List of all manufacturing orders with their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MO Number</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Planned Dates</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMOs.map((mo) => (
                  <TableRow key={mo.id}>
                    <TableCell className="font-medium">{mo.mo_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mo.item_name}</div>
                        <div className="text-sm text-muted-foreground">{mo.item_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {mo.planned_qty}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProgressCell mo={mo} />
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(mo.status)}>{mo.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(mo.priority)}>{mo.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Start: {mo.planned_start_date ? new Date(mo.planned_start_date).toLocaleDateString() : 'Not set'}</div>
                        <div>End: {mo.planned_end_date ? new Date(mo.planned_end_date).toLocaleDateString() : 'Not set'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteMO(mo.id, mo.mo_number)}
                          disabled={mo.status !== 'draft' || deletingOrder === mo.mo_number}
                          title={mo.status !== 'draft' ? 'Cannot cancel MO that is in progress or completed' : 'Cancel Manufacturing Order'}
                        >
                          {deletingOrder === mo.mo_number ? (
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
    </RoleGuard>
  )
}
