"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, Eye, Edit, Trash2, Package, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface BOM {
  id: number
  bom_name: string
  item_code: string
  item_name: string
  quantity: number
  is_active: boolean
  components_count?: number
  total_cost?: number
  created_at: string
}

interface BOMComponent {
  item_code: string
  item_name: string
  quantity: number
  unit: string
  rate: number
  current_stock: number
}

export default function BOMPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [boms, setBoms] = useState<BOM[]>([])
  const [selectedBOM, setSelectedBOM] = useState<number | null>(null)
  const [bomComponents, setBomComponents] = useState<BOMComponent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    fetchBOMs()
  }, [])

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
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBOMs = boms.filter(
    (bom) =>
      bom.bom_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bom.item_code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewDetails = (bomId: number) => {
    setSelectedBOM(bomId)
    setIsDetailsOpen(true)
  }

  const selectedBOMData = selectedBOM ? boms.find((b: BOM) => b.id === selectedBOM) : null
  const selectedBomComponents = selectedBOM ? [] : [] // TODO: Implement BOM details API

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            
            <div>
              <h1 className="text-3xl font-bold">Bill of Materials (BOM)</h1>
              <p className="text-muted-foreground">Manage product component structures and recipes</p>
            </div>
          </div>
          <Link href="/inventory/bom/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New BOM
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total BOMs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boms.length}</div>
              <p className="text-xs text-muted-foreground">Active bill of materials</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Components</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {boms.length > 0 ? Math.round(boms.reduce((sum: number, bom: BOM) => sum + (bom.components_count || 0), 0) / boms.length) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Components per BOM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total BOM Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${boms.reduce((sum: number, bom: BOM) => sum + (bom.total_cost || 0), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Combined material cost</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search BOMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by BOM name, item name, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* BOMs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bill of Materials ({filteredBOMs.length})</CardTitle>
            <CardDescription>List of all BOMs with their component details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BOM Name</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBOMs.map((bom) => (
                  <TableRow key={bom.id}>
                    <TableCell className="font-medium">{bom.bom_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bom.item_name}</div>
                        <div className="text-sm text-muted-foreground">{bom.item_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{bom.quantity}</TableCell>
                    <TableCell>{bom.components_count} items</TableCell>
                    <TableCell>${(bom.total_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={bom.is_active ? "default" : "secondary"}>
                        {bom.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(bom.id)}>
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

        {/* BOM Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedBOMData?.bom_name}</DialogTitle>
              <DialogDescription>Components and materials required for {selectedBOMData?.item_name}</DialogDescription>
            </DialogHeader>

            {selectedBOMData && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-sm font-medium">Item</Label>
                    <p>
                      {selectedBOMData.item_code} - {selectedBOMData.item_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">BOM Quantity</Label>
                    <p>{selectedBOMData.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Cost</Label>
                    <p>${(selectedBOMData.total_cost || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Components</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Required Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Available Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomComponents.map((component, index) => {
                        const totalCost = component.quantity * component.rate
                        const isAvailable = component.current_stock >= component.quantity
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{component.item_code}</TableCell>
                            <TableCell>{component.item_name}</TableCell>
                            <TableCell>{component.quantity}</TableCell>
                            <TableCell>{component.unit}</TableCell>
                            <TableCell>${component.rate.toFixed(2)}</TableCell>
                            <TableCell>${totalCost.toFixed(2)}</TableCell>
                            <TableCell>{component.current_stock}</TableCell>
                            <TableCell>
                              <Badge variant={isAvailable ? "default" : "destructive"}>
                                {isAvailable ? "Available" : "Shortage"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
