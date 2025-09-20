"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, ArrowLeft, Package, Minus, Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: number;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  standard_rate: number;
  item_type: string;
}

interface BOMOperation {
  work_center_id: number;
  work_center_name: string;
  operation_name: string;
  operation_description: string;
  duration_minutes: number;
}

interface BOMComponent {
  item_id: number;
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
}

const getItemTypeColor = (type: string) => {
  switch (type) {
    case "raw_material":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "semi_finished":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "finished_good":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

interface WorkCenter {
  id: number;
  name: string;
  capacity_per_hour: number;
}

export default function NewBOMPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [bomName, setBomName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [components, setComponents] = useState<BOMComponent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentComponent, setCurrentComponent] = useState({
    item_id: 0,
    quantity: 1,
  });
  const [selectedItemForComponent, setSelectedItemForComponent] =
    useState<Item | null>(null);
  const [bomOperations, setBomOperations] = useState<BOMOperation[]>([]);
  const [currentOperation, setCurrentOperation] = useState({
    work_center_id: 0,
    operation_name: "",
    operation_description: "",
    duration_minutes: 60,
  });
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<WorkCenter | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
    fetchWorkCenters();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("erp_token");
      const response = await fetch("/api/items", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching items:", err);
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      });
    }
  };

  const fetchWorkCenters = async () => {
    try {
      const token = localStorage.getItem("erp_token");
      const response = await fetch("/api/workcenters", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch work centers");
      }

      const data = await response.json();
      setWorkCenters(data);
    } catch (err) {
      console.error("Error fetching work centers:", err);
      toast({
        title: "Error",
        description: "Failed to load work centers",
        variant: "destructive",
      });
    }
  };

  const handleAddComponent = () => {
    if (!selectedItemForComponent || currentComponent.quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select an item and enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    const newComponent: BOMComponent = {
      item_id: selectedItemForComponent.id,
      item_code: selectedItemForComponent.item_code,
      item_name: selectedItemForComponent.item_name,
      quantity: currentComponent.quantity,
      unit: selectedItemForComponent.unit_of_measure,
      rate: selectedItemForComponent.standard_rate,
    };

    // Check if component already exists
    const existingIndex = components.findIndex(
      (c) => c.item_id === newComponent.item_id
    );
    if (existingIndex >= 0) {
      // Update existing component
      const updatedComponents = [...components];
      updatedComponents[existingIndex].quantity += newComponent.quantity;
      setComponents(updatedComponents);
    } else {
      // Add new component
      setComponents([...components, newComponent]);
    }

    // Reset form
    setSelectedItemForComponent(null);
    setCurrentComponent({ item_id: 0, quantity: 1 });
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleAddBomOperation = () => {
    if (!selectedWorkCenter || !currentOperation.operation_name) {
      toast({
        title: "Validation Error",
        description: "Please select a work center and enter operation name",
        variant: "destructive",
      });
      return;
    }

    const newOperation: BOMOperation = {
      work_center_id: selectedWorkCenter.id,
      work_center_name: selectedWorkCenter.name,
      operation_name: currentOperation.operation_name,
      operation_description: currentOperation.operation_description,
      duration_minutes: currentOperation.duration_minutes,
    };

    setBomOperations([...bomOperations, newOperation]);

    // Reset operation form
    setSelectedWorkCenter(null);
    setCurrentOperation({
      work_center_id: 0,
      operation_name: "",
      operation_description: "",
      duration_minutes: 60,
    });
  };

  const handleRemoveBomOperation = (operationIndex: number) => {
    setBomOperations(bomOperations.filter((_, index) => index !== operationIndex));
  };

  const handleSubmit = async () => {
    if (!selectedItem || !bomName || components.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields and add at least one component",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("erp_token");

      const bomData = {
        bom_name: bomName,
        item_id: selectedItem.id,
        quantity: quantity,
        components: components.map((comp) => ({
          item_id: comp.item_id,
          quantity: comp.quantity,
        })),
        operations: bomOperations,
      };

      const response = await fetch("/api/boms", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bomData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create BOM");
      }

      toast({
        title: "Success",
        description: "BOM created successfully!",
      });

      router.push("/inventory/bom");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create BOM",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCost = components.reduce(
    (sum, comp) => sum + comp.quantity * (Number(comp.rate) || 0),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/inventory/bom">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to BOMs
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New BOM</h1>
              <p className="text-muted-foreground">
                Define the components and materials needed for a product
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Create BOM
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* BOM Details */}
          <Card>
            <CardHeader>
              <CardTitle>BOM Details</CardTitle>
              <CardDescription>
                Basic information about the bill of materials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bomName">BOM Name *</Label>
                <Input
                  id="bomName"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                  placeholder="e.g., BOM for Product A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finishedItem">Finished Item *</Label>
                <Select
                  value={selectedItem?.id.toString() || ""}
                  onValueChange={(value) => {
                    const item = items.find((i) => i.id.toString() === value);
                    setSelectedItem(item || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finished item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items
                      .filter((item) => item.item_type === "finished_good")
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.item_code} - {item.item_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">BOM Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              {selectedItem && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">Selected Item Details</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.item_code} - {selectedItem.item_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unit: {selectedItem.unit_of_measure} | Rate: $
                    {selectedItem.standard_rate}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Components */}
          <Card>
            <CardHeader>
              <CardTitle>Add Components</CardTitle>
              <CardDescription>
                Select materials and components for this BOM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Item</Label>
                <Select
                  value={selectedItemForComponent?.id.toString() || ""}
                  onValueChange={(value) => {
                    const item = items.find((i) => i.id.toString() === value);
                    setSelectedItemForComponent(item || null);
                    setCurrentComponent((prev) => ({
                      ...prev,
                      item_id: item ? item.id : 0,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a component" />
                  </SelectTrigger>
                  <SelectContent>
                    {items
                      .filter((item) => item.item_type !== "finished_good")
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className={`text-xs px-2 py-1 rounded ${getItemTypeColor(item.item_type)}`}>
                              {item.item_type.replace("_", " ")}
                            </span>
                            <div className="flex items-center">
                              <span className="font-medium">
                                {item.item_code} - {item.item_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <span>{item.unit_of_measure}:</span>
                              <span className="font-medium text-green-600">
                                ${item.standard_rate}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="componentQuantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentComponent((prev) => ({
                        ...prev,
                        quantity: Math.max(1, prev.quantity - 1),
                      }))
                    }
                    disabled={currentComponent.quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="componentQuantity"
                    type="number"
                    min="1"
                    step="1"
                    value={currentComponent.quantity}
                    onChange={(e) =>
                      setCurrentComponent((prev) => ({
                        ...prev,
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-20 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-appearance]:textfield"
                    style={{
                      MozAppearance: 'textfield',
                      WebkitAppearance: 'none',
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentComponent((prev) => ({
                        ...prev,
                        quantity: prev.quantity + 1,
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleAddComponent} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Add Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Add Operations</CardTitle>
              <CardDescription>
                Define manufacturing operations for this BOM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="operationName">Operation Name *</Label>
                  <Input
                    id="operationName"
                    value={currentOperation.operation_name}
                    onChange={(e) =>
                      setCurrentOperation(prev => ({ ...prev, operation_name: e.target.value }))
                    }
                    placeholder="e.g., Assembly, Painting, Quality Check"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select Work Center *</Label>
                  <Select
                    value={selectedWorkCenter?.id.toString() || ""}
                    onValueChange={(value) => {
                      const wc = workCenters.find(w => w.id.toString() === value);
                      setSelectedWorkCenter(wc || null);
                      setCurrentOperation(prev => ({ ...prev, work_center_id: wc ? wc.id : 0 }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose work center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id.toString()}>
                          {wc.name} ({wc.capacity_per_hour}/hr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={currentOperation.duration_minutes}
                    onChange={(e) =>
                      setCurrentOperation(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operationDescription">Description (Optional)</Label>
                  <Input
                    id="operationDescription"
                    value={currentOperation.operation_description}
                    onChange={(e) =>
                      setCurrentOperation(prev => ({ ...prev, operation_description: e.target.value }))
                    }
                    placeholder="Brief description of the operation"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddBomOperation}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Operation to BOM
              </Button>
            </CardContent>
          </Card>

        {/* Components List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materials & Components ({components.length})
            </CardTitle>
            <CardDescription>
              Raw materials and components required for this BOM
              {components.length > 0 && (
                <span className="ml-2 font-medium">
                  Total Cost: ${totalCost.toFixed(2)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {components.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No components added yet</p>
                <p className="text-sm">
                  Add materials and components using the form above
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {components.map((component, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{component.item_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {component.item_code} | {component.quantity}{" "}
                          {component.unit} | $
                          {(Number(component.rate) || 0).toFixed(2)} each
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-medium">
                          $
                          {(
                            component.quantity * (Number(component.rate) || 0)
                          ).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveComponent(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Components: {components.length}</span>
                  <span>Total Cost: ${totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BOM Operations List */}
        {bomOperations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Manufacturing Operations ({bomOperations.length})
              </CardTitle>
              <CardDescription>
                Manufacturing process steps and work centers for this BOM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bomOperations.map((operation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{operation.operation_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {operation.work_center_name} | {operation.duration_minutes} mins
                      </div>
                      {operation.operation_description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {operation.operation_description}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBomOperation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
