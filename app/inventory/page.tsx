"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Package, AlertTriangle, TrendingDown, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Item {
  id: number
  item_code: string
  item_name: string
  description?: string
  unit_of_measure: string
  item_type: string
  standard_rate: number
  current_stock: number
  is_active: boolean
}

const getItemTypeColor = (type: string) => {
  switch (type) {
    case "raw_material":
      return "bg-blue-100 text-blue-800"
    case "semi_finished":
      return "bg-yellow-100 text-yellow-800"
    case "finished_good":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStockStatus = (stock: number, type: string) => {
  const threshold = type === "raw_material" ? 50 : type === "semi_finished" ? 20 : 10
  if (stock <= threshold * 0.2) return { status: "critical", color: "text-red-600" }
  if (stock <= threshold * 0.5) return { status: "low", color: "text-orange-600" }
  if (stock <= threshold) return { status: "medium", color: "text-yellow-600" }
  return { status: "good", color: "text-green-600" }
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((item) => item.item_type === typeFilter)
    }

    setFilteredItems(filtered)
  }, [searchTerm, typeFilter, items])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/items", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.")
        }
        throw new Error("Failed to fetch items")
      }

      const data = await response.json()
      setItems(data)
      setFilteredItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  const lowStockItems = items.filter((item) => {
    const { status } = getStockStatus(item.current_stock, item.item_type)
    return status === "critical" || status === "low"
  })

  const totalValue = items.reduce((sum, item) => sum + item.current_stock * Number(item.standard_rate || 0), 0)


  // Add Stock Dialog State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockRate, setStockRate] = useState("")
  const [addingStock, setAddingStock] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handleAddStock = (item: Item) => {
    setSelectedItem(item)
    setStockQuantity("")
    setStockRate(item.standard_rate?.toString() || "")
    setIsAddStockOpen(true)
  }

  const handleAddStockSubmit = async () => {
    if (!selectedItem || !stockQuantity || !stockRate) {
      setError("All fields are required")
      return
    }

    try {
      setAddingStock(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/stock-ledger", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          actual_qty: parseFloat(stockQuantity),
          rate: parseFloat(stockRate),
          posting_date: new Date().toISOString().split('T')[0],
          posting_time: new Date().toTimeString().split(' ')[0]
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add stock")
      }

      // Show success message
      setSuccessMessage("Stock added successfully!")

      // Reset form
      setSelectedItem(null)
      setStockQuantity("")
      setStockRate("")
      setIsAddStockOpen(false)

      // Refresh data
      await fetchItems()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock")
    } finally {
      setAddingStock(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Track stock levels and manage inventory items</p>
            {successMessage && (
              <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
                {successMessage}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/bom">
              <Button variant="outline">Manage BOMs</Button>
            </Link>
            <Link href="/inventory/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Item
              </Button>
            </Link>
          </div>
        </div>

        {/* Add Stock Dialog */}
        <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Stock to Inventory</DialogTitle>
              <DialogDescription>
                Add stock to {selectedItem?.item_name} ({selectedItem?.item_code})
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    Quantity
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="Enter quantity"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-sm font-medium">
                    Rate (₹)
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    placeholder="Auto-filled from item"
                    value={stockRate}
                    onChange={(e) => setStockRate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddStockOpen(false)}
                disabled={addingStock}
              >
                Cancel
              </Button>
              <Button onClick={handleAddStockSubmit} disabled={addingStock}>
                {addingStock ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Add Stock
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <LoadingSpinner size="md" /> : items.length}
              </div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-24" /> : `₹${totalValue.toLocaleString()}`}
              </div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <LoadingSpinner size="md" /> : lowStockItems.length}
              </div>
              <p className="text-xs text-muted-foreground">Items need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <LoadingSpinner size="md" /> : items.filter((item) => item.item_type === "raw_material").length}
              </div>
              <p className="text-xs text-muted-foreground">Raw material items</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
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
                        placeholder="Search by item code, name, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="raw_material">Raw Materials</SelectItem>
                      <SelectItem value="semi_finished">Semi-finished</SelectItem>
                      <SelectItem value="finished_good">Finished Goods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {loading ? (
                    <Skeleton className="h-6 w-48" />
                  ) : (
                    `Inventory Items (${filteredItems.length})`
                  )}
                </CardTitle>
                <CardDescription>
                  {loading ? (
                    <Skeleton className="h-4 w-64" />
                  ) : (
                    "List of all inventory items with current stock levels"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell>
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      filteredItems.map((item) => {
                        const stockStatus = getStockStatus(item.current_stock, item.item_type)
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.item_code}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.item_name}</div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground">{item.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getItemTypeColor(item.item_type)}>
                                {item.item_type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className={stockStatus.color}>{item.current_stock.toLocaleString()}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell>₹{Number(item.standard_rate || 0).toFixed(2)}</TableCell>
                            <TableCell>₹{(item.current_stock * Number(item.standard_rate || 0)).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.status === "good" ? "default" : "destructive"}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddStock(item)}
                                  title="Add stock to this item"
                                  disabled={addingStock}
                                >
                                  {addingStock && selectedItem?.id === item.id ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Items that need immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems.map((item) => {
                    const stockStatus = getStockStatus(item.current_stock, item.item_type)
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <AlertTriangle
                            className={`h-5 w-5 ${stockStatus.status === "critical" ? "text-red-500" : "text-orange-500"}`}
                          />
                          <div>
                            <div className="font-medium">
                              {item.item_code} - {item.item_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Current stock:{" "}
                              <span className={stockStatus.color}>
                                {item.current_stock} {item.unit_of_measure}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            className={
                              stockStatus.status === "critical"
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }
                          >
                            {stockStatus.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            Reorder
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </RoleGuard>
  )
}
