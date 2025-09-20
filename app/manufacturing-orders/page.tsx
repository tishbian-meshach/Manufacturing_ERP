"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Eye, Edit, Trash2, Loader2 } from "lucide-react"
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
      setManufacturingOrders(data)
      setFilteredMOs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manufacturing orders")
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (produced: number, planned: number) => {
    return planned > 0 ? Math.round((produced / planned) * 100) : 0
  }

  return (
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
                      <div>
                        <div>
                          {mo.produced_qty} / {mo.planned_qty}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getProgressPercentage(mo.produced_qty, mo.planned_qty)}% complete
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${getProgressPercentage(mo.produced_qty, mo.planned_qty)}%`,
                          }}
                        ></div>
                      </div>
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
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
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
