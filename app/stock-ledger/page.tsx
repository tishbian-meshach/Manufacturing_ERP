"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Search, TrendingUp, TrendingDown, Loader2, Plus, Package } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LedgerEntry {
  id: number
  item_id: number
  actual_qty: number
  qty_after_transaction: number
  rate: number
  value_after_transaction: number
  posting_date: string
  posting_time: string
  created_at: string
  product_name: string
  item_code: string
}

export default function StockLedgerPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [productFilter, setProductFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([])
  const [products, setProducts] = useState<{ id: number; name: string; code: string; currentStock: number; item_type: string; standard_rate: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Add Stock Dialog State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState("")
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockRate, setStockRate] = useState("")
  // Removed voucherNo state as it's no longer needed
  const [addingStock, setAddingStock] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const getStockStatus = (stock: number, type: string) => {
    const threshold = type === "raw_material" ? 50 : type === "semi_finished" ? 20 : 10
    if (stock <= threshold * 0.2) return {
      status: "Critical",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      borderColor: "border-red-200"
    }
    if (stock <= threshold * 0.5) return {
      status: "Low",
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      borderColor: "border-orange-200"
    }
    if (stock <= threshold) return {
      status: "Medium",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-200"
    }
    return {
      status: "Good",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border-green-200"
    }
  }

  useEffect(() => {
    fetchLedgerEntries()
    fetchProducts()
  }, [])

  useEffect(() => {
    let filtered = ledgerEntries

    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (productFilter !== "all") {
      filtered = filtered.filter((entry) => entry.item_id.toString() === productFilter)
    }

    if (dateFrom && dateTo) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.created_at)
        return entryDate >= dateFrom && entryDate <= dateTo
      })
    }

    setFilteredEntries(filtered)
  }, [searchTerm, productFilter, dateFrom, dateTo, ledgerEntries])

  // Auto-populate rate when item is selected
  useEffect(() => {
    if (selectedItemId) {
      const selectedProduct = products.find(p => p.id.toString() === selectedItemId)
      if (selectedProduct) {
        setStockRate(selectedProduct.standard_rate.toString())
      }
    } else {
      setStockRate("")
    }
  }, [selectedItemId, products])

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("erp_token")

      const response = await fetch("/api/ledger", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.")
        }
        throw new Error("Failed to fetch ledger entries")
      }

      const data = await response.json()
      const entries = Array.isArray(data) ? data : []
      setLedgerEntries(entries)
      setFilteredEntries(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger entries")
      setLedgerEntries([])
      setFilteredEntries([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("erp_token")
      const response = await fetch("/api/items", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.map((item: any) => ({
          id: item.id,
          name: item.item_name,
          code: item.item_code,
          currentStock: item.current_stock || 0,
          item_type: item.item_type,
          standard_rate: item.standard_rate || 0
        })))
      }
    } catch (err) {
      console.error("Failed to fetch products:", err)
    }
  }

  const getMovementType = (quantity: number) => {
    if (quantity > 0) {
      return { type: "Stock In", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-100" }
    } else {
      return { type: "Stock Out", icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-100" }
    }
  }

  const totalStockIn = Array.isArray(ledgerEntries) ? ledgerEntries.filter(entry => entry.actual_qty > 0).reduce((sum, entry) => sum + Number(entry.actual_qty), 0) : 0
  const totalStockOut = Array.isArray(ledgerEntries) ? Math.abs(ledgerEntries.filter(entry => entry.actual_qty < 0).reduce((sum, entry) => sum + Number(entry.actual_qty), 0)) : 0
  const netMovement = totalStockIn - totalStockOut

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading stock ledger...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const handleAddStock = async () => {
    if (!selectedItemId || !stockQuantity || !stockRate) {
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
          item_id: parseInt(selectedItemId),
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
      setSelectedItemId("")
      setStockQuantity("")
      setStockRate("")
      setIsAddStockOpen(false)

      // Refresh data
      await fetchLedgerEntries()
      await fetchProducts()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock")
    } finally {
      setAddingStock(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Stock Ledger</h1>
            <p className="text-muted-foreground">Track material movement and inventory balance</p>
            {successMessage && (
              <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
                {successMessage}
              </div>
            )}
          </div>
          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Stock to Inventory</DialogTitle>
                <DialogDescription>
                  Add stock to an item and create a corresponding ledger entry.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="item" className="text-sm font-medium">
                    Item
                  </Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an item to add stock">
                        {selectedItemId && products.find(p => p.id.toString() === selectedItemId) && (() => {
                          const selectedProduct = products.find(p => p.id.toString() === selectedItemId)!
                          const stockStatus = getStockStatus(selectedProduct.currentStock, selectedProduct.item_type)
                          return (
                            <div className="flex items-center justify-between w-full">
                              <span>{selectedProduct.name} ({selectedProduct.code})</span>
                              <span className={`ml-2 px-2 py-1 text-xs font-medium rounded border ${stockStatus.bgColor} ${stockStatus.textColor} ${stockStatus.borderColor}`}>
                                {selectedProduct.currentStock} ({stockStatus.status})
                              </span>
                            </div>
                          )
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => {
                        const stockStatus = getStockStatus(product.currentStock, product.item_type)
                        return (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span className="flex-1">{product.name} ({product.code})</span>
                              <span className={`ml-2 px-2 py-1 text-xs font-medium rounded border ${stockStatus.bgColor} ${stockStatus.textColor} ${stockStatus.borderColor}`}>
                                {product.currentStock} ({stockStatus.status})
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

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
                      readOnly
                      className="w-full bg-muted"
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
                <Button onClick={handleAddStock} disabled={addingStock}>
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
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : ledgerEntries.length}</div>
              <p className="text-xs text-muted-foreground">Ledger transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock In</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{totalStockIn.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total units added</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-{totalStockOut.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total units consumed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Movement</CardTitle>
              {netMovement >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", netMovement >= 0 ? "text-green-600" : "text-red-600")}>
                {netMovement >= 0 ? "+" : ""}{netMovement.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Net stock change</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Ledger Entries ({filteredEntries.length})</CardTitle>
            <CardDescription>Complete record of all material movements</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Movement Type</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const movement = getMovementType(entry.actual_qty)
                  const MovementIcon = movement.icon
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.created_at), "PPP")}</TableCell>
                      <TableCell className="font-medium">{entry.product_name} ({entry.item_code})</TableCell>
                      <TableCell>
                        <Badge className={movement.bgColor}>
                          <MovementIcon className="mr-1 h-3 w-3" />
                          {movement.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.color}>
                        {entry.actual_qty > 0 ? "+" : ""}{Number(entry.actual_qty).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}