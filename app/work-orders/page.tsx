"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Play, Pause, CheckCircle, Clock, RefreshCw, Settings, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface WorkOrder {
  id: number
  wo_number: string
  mo_number: string | null
  operation_name: string
  work_center_name: string | null
  capacity_per_hour: number | null
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
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Auto-refresh functionality (always on, every 5 seconds)
  useEffect(() => {
    console.log("Starting auto-refresh every 5 seconds")

    const intervalId = setInterval(async () => {
      try {
        await fetchWorkOrders()
      } catch (error) {
        console.error("Auto-refresh failed:", error)
      }
    }, 5000) // 5 seconds

    return () => {
      console.log("Stopping auto-refresh")
      clearInterval(intervalId)
    }
  }, [])

  // Auto-complete work orders when progress reaches 100%
  useEffect(() => {
    const autoCompleteWorkOrders = async () => {
      // Check if we have a valid token
      const token = localStorage.getItem("erp_token")
      if (!token) {
        console.warn("No authentication token found, skipping auto-completion")
        return
      }

      const workOrdersToComplete = workOrders.filter(wo => {
        if (wo.status === 'completed') return false

        const progress = calculateRealisticProgress(wo)
        return progress.shouldAutoComplete
      })

      if (workOrdersToComplete.length > 0) {
        console.log(`Auto-completing ${workOrdersToComplete.length} work orders`)

        const completionPromises = workOrdersToComplete.map(async (wo) => {
          try {
            const response = await fetch("/api/work-orders", {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: wo.id,
                status: 'completed',
                completed_qty: wo.planned_qty
              }),
            })

            if (!response.ok) {
              if (response.status === 401) {
                console.error(`Authentication failed for work order ${wo.id}. Token may be expired.`)
                // Optionally redirect to login
                // window.location.href = '/login'
              }
              const errorData = await response.json()
              throw new Error(errorData.error || `HTTP ${response.status}: Failed to auto-complete work order`)
            }

            return { id: wo.id, success: true }
          } catch (error) {
            console.error(`Failed to auto-complete work order ${wo.id}:`, error)
            return { id: wo.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })

        const results = await Promise.all(completionPromises)
        const successfulCompletions = results.filter(r => r.success).length
        const failedCompletions = results.filter(r => !r.success).length

        console.log(`Auto-completion results: ${successfulCompletions} successful, ${failedCompletions} failed`)

        if (successfulCompletions > 0) {
          console.log(`Successfully auto-completed ${successfulCompletions} work orders`)
          // Refresh the work orders list
          fetchWorkOrders()
        }

        if (failedCompletions > 0) {
          console.warn(`${failedCompletions} work orders failed to auto-complete`)
        }
      }
    }

    // Only run auto-completion if we have work orders
    if (workOrders.length > 0) {
      autoCompleteWorkOrders()
    }
  }, [workOrders])

  const autoUpdateWorkOrders = async (workOrders: WorkOrder[]) => {
    const token = localStorage.getItem("erp_token")
    if (!token) {
      console.warn("No authentication token found, skipping auto-updates")
      return
    }

    const updates: Promise<any>[] = []

    for (const wo of workOrders) {
      if (wo.status === 'in_progress' && wo.actual_start_time && wo.capacity_per_hour && wo.capacity_per_hour > 0) {
        const startTime = new Date(wo.actual_start_time)
        const now = new Date()

        // Time elapsed in minutes
        const timeElapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60)

        // Time per unit in minutes
        const timePerUnitMinutes = 60 / wo.capacity_per_hour

        // Calculate expected completed items based on time elapsed
        const expectedCompleted = Math.floor(timeElapsedMinutes / timePerUnitMinutes)

        console.log(`Work Order ${wo.id}: elapsed=${timeElapsedMinutes.toFixed(1)}m, timePerUnit=${timePerUnitMinutes.toFixed(1)}m, expected=${expectedCompleted}, current=${wo.completed_qty}`)

        // Only update if we have more completed items than currently recorded
        // Don't auto-complete to 100% unless we've reached the total time
        if (expectedCompleted > wo.completed_qty && expectedCompleted < wo.planned_qty) {
          console.log(`Updating WO ${wo.id}: ${wo.completed_qty} → ${expectedCompleted}`)
          updates.push(
            fetch("/api/work-orders", {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: wo.id,
                completed_qty: expectedCompleted,
                status: wo.status // Keep as in_progress
              }),
            })
          )
        } else if (expectedCompleted >= wo.planned_qty && wo.completed_qty < wo.planned_qty) {
          // Only auto-complete when we've reached or exceeded the total required time
          const totalRequiredMinutes = wo.planned_qty * timePerUnitMinutes
          if (timeElapsedMinutes >= totalRequiredMinutes) {
            console.log(`Auto-completing WO ${wo.id}: reached total time`)
            updates.push(
              fetch("/api/work-orders", {
                method: "PUT",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: wo.id,
                  completed_qty: wo.planned_qty,
                  status: 'completed'
                }),
              })
            )
          }
        }
      }
    }

    if (updates.length > 0) {
      try {
        const results = await Promise.all(updates)
        console.log(`Auto-updated ${results.length} work orders`)
      } catch (error) {
        console.error("Error auto-updating work orders:", error)
        if (error instanceof Error && error.message?.includes('401')) {
          console.error("Authentication failed during auto-update. Token may be expired.")
        }
      }
    }
  }

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
      console.log("Fetched work orders:", data.length)

      // Auto-update work orders based on elapsed time
      console.log("Running auto-update...")
      await autoUpdateWorkOrders(data)

      // Small delay to ensure updates are processed
      await new Promise(resolve => setTimeout(resolve, 500))

      // Fetch updated data
      console.log("Fetching updated work orders...")
      const updatedResponse = await fetch("/api/work-orders", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json()
        console.log("Updated work orders:", updatedData.length)
        setWorkOrders(updatedData)
      } else {
        console.log("Failed to fetch updated data, using original")
        setWorkOrders(data)
      }
    } catch (err) {
      console.error("Error fetching work orders:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressPercentage = (completed: number, planned: number) => {
    return planned > 0 ? Math.round((completed / planned) * 100) : 0
  }

  const calculateRealisticProgress = (wo: WorkOrder) => {
    const { completed_qty, planned_qty, capacity_per_hour, actual_start_time, status } = wo

    // If completed, return 100%
    if (status === 'completed' || completed_qty >= planned_qty) {
      return {
        percentage: 100,
        timeRemaining: 0,
        timeElapsed: 0,
        expectedCompletionTime: null,
        autoCompleted: planned_qty
      }
    }

    // If not started, return 0%
    if (status === 'pending' || !actual_start_time) {
      return {
        percentage: 0,
        timeRemaining: null,
        timeElapsed: 0,
        expectedCompletionTime: null,
        autoCompleted: 0
      }
    }

    // Simple mathematical calculation based on capacity
    if (!capacity_per_hour || capacity_per_hour <= 0) {
      // Fallback to quantity-based calculation
      return {
        percentage: getProgressPercentage(completed_qty, planned_qty),
        timeRemaining: null,
        timeElapsed: 0,
        expectedCompletionTime: null,
        autoCompleted: completed_qty
      }
    }

    // Calculate using the simple formula
    const startTime = new Date(actual_start_time)
    const now = new Date()

    // Time per unit = 60 minutes / capacity_per_hour
    const timePerUnitMinutes = 60 / capacity_per_hour

    // Total time required = planned_qty * timePerUnitMinutes
    const totalTimeRequiredMinutes = planned_qty * timePerUnitMinutes

    // Time elapsed in minutes
    const timeElapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60)
    const timeElapsedHours = timeElapsedMinutes / 60

    // Expected completion time = start time + total time required
    const expectedCompletionTime = new Date(startTime.getTime() + (totalTimeRequiredMinutes * 60 * 1000))

    // Progress percentage = (time elapsed / total time required) * 100
    const percentage = Math.min(100, Math.round((timeElapsedMinutes / totalTimeRequiredMinutes) * 100))

    // Time remaining in hours
    const timeRemainingMinutes = Math.max(0, totalTimeRequiredMinutes - timeElapsedMinutes)
    const timeRemaining = timeRemainingMinutes / 60

    // Auto-calculated completed items based on time elapsed
    const autoCompletedItems = Math.min(
      planned_qty,
      Math.max(completed_qty, Math.floor(timeElapsedMinutes / timePerUnitMinutes))
    )

    return {
      percentage,
      timeRemaining,
      timeElapsed: timeElapsedHours,
      expectedCompletionTime,
      autoCompleted: autoCompletedItems,
      shouldAutoComplete: percentage >= 100 && status !== 'completed'
    }
  }

  const formatTimeRemaining = (hours: number | null) => {
    if (hours === null) return "Unknown"
    if (hours === 0) return "Complete"

    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m remaining`
    } else if (hours < 24) {
      return `${Math.round(hours)}h remaining`
    } else {
      const days = Math.round(hours / 24)
      return `${days}d remaining`
    }
  }

  const formatTimeElapsed = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m elapsed`
    } else if (hours < 24) {
      return `${Math.round(hours)}h elapsed`
    } else {
      const days = Math.round(hours / 24)
      return `${days}d elapsed`
    }
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
            <p className="text-muted-foreground">Work orders are automatically created when manufacturing orders are generated from BOMs</p>
          </div>
          <div className="flex gap-2">
            <Link href="/work-centers">
              <Button variant="outline">Manage Work Centers</Button>
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
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            onClick={() => fetchWorkOrders()}
            disabled={isRefreshing}
            className={isRefreshing ? 'animate-pulse' : ''}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Work Orders ({filteredWOs.length})
              
            </CardTitle>
            <CardDescription>
              Work orders are automatically generated from BOM operations when manufacturing orders are created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO Number</TableHead>
                  <TableHead>MO Number</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Work Center & Capacity</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Progress & Time</TableHead>
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
                    <TableCell>
                      <div>
                        <div>{wo.work_center_name}</div>
                        {wo.capacity_per_hour && (
                          <div className="text-xs text-muted-foreground">
                            {wo.capacity_per_hour}/hr capacity
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{wo.item_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium mb-1">
                          {wo.completed_qty} / {wo.planned_qty}
                        </div>
                        {(() => {
                          const progress = calculateRealisticProgress(wo)
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          progress.shouldAutoComplete ? 'bg-green-500 animate-pulse' :
                                          progress.percentage >= 100 ? 'bg-green-500' :
                                          progress.percentage >= 70 ? 'bg-blue-500' :
                                          progress.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${progress.percentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 text-center">
                                      {progress.percentage}% complete
                                      {progress.shouldAutoComplete && (
                                        <div className="text-green-600 font-medium text-xs">
                                          Auto-completing...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-2">
                                    <div className="font-medium">Progress Calculation</div>
                                    <div className="text-sm space-y-1">
                                      <div><strong>Work Center Capacity:</strong> {wo.capacity_per_hour}/hr</div>
                                      <div><strong>Required Quantity:</strong> {wo.planned_qty} units</div>

                                      {wo.capacity_per_hour && (
                                        <>
                                          <div><strong>Time per Unit:</strong> {Math.round((60 / wo.capacity_per_hour) * 100) / 100} minutes</div>
                                          <div><strong>Total Time Required:</strong> {Math.round((wo.planned_qty * (60 / wo.capacity_per_hour)) * 100) / 100} minutes</div>
                                        </>
                                      )}

                                      <div className="border-t pt-1 mt-2">
                                        <div><strong>Current Progress:</strong> {progress.percentage}%</div>
                                        <div><strong>Completed:</strong> {wo.completed_qty} / {wo.planned_qty}</div>

                                        {progress.shouldAutoComplete && (
                                          <div className="text-green-600 font-medium">
                                            ⚡ Auto-completion will be triggered
                                          </div>
                                        )}

                                        {progress.expectedCompletionTime && (
                                          <div><strong>Expected Completion:</strong> {progress.expectedCompletionTime.toLocaleString()}</div>
                                        )}

                                        {progress.timeRemaining !== null && (
                                          <div><strong>Time Remaining:</strong> {formatTimeRemaining(progress.timeRemaining)}</div>
                                        )}

                                        {progress.timeElapsed > 0 && (
                                          <div><strong>Time Elapsed:</strong> {formatTimeElapsed(progress.timeElapsed)}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
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
                        {wo.status === "on_hold" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(wo.id, "in_progress")}
                            className="text-blue-600"
                            title="Resume work order"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
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
