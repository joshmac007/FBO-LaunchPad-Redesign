"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Edit, Trash2, Save, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { 
  getFuelTypes, 
  createFuelType, 
  updateFuelType, 
  deleteFuelType,
  FuelType,
  CreateFuelTypeRequest,
  UpdateFuelTypeRequest
} from "@/app/services/admin-fee-config-service";
import { fuelTypeFormSchema, FuelTypeFormData } from "@/app/schemas/fuel-type.schema";
import { queryKeys } from "@/constants/query-keys";

export function FuelTypesTable() {
  const queryClient = useQueryClient();
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fuelTypeToDelete, setFuelTypeToDelete] = useState<FuelType | null>(null);

  // Form for editing/adding
  const form = useForm<FuelTypeFormData>({
    resolver: zodResolver(fuelTypeFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  // Fetch fuel types including inactive ones
  const { data: fuelTypesData, isLoading, error } = useQuery({
    queryKey: queryKeys.fuel.types(true),
    queryFn: () => getFuelTypes(true),
  });

  const fuelTypes = fuelTypesData?.fuel_types || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createFuelType,
    onSuccess: () => {
      toast.success("Fuel type created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.types() }); // This refreshes the table inside the dialog
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.prices() }); // This refreshes the main page in the background
      setIsAddingNew(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create fuel type: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFuelTypeRequest }) =>
      updateFuelType(id, data),
    onSuccess: () => {
      toast.success("Fuel type updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.types() }); // This refreshes the table inside the dialog
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.prices() }); // This refreshes the main page in the background
      setEditingRowId(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fuel type: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFuelType,
    onSuccess: () => {
      toast.success("Fuel type deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.types() }); // This refreshes the table inside the dialog
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.prices() }); // This refreshes the main page in the background
      setDeleteDialogOpen(false);
      setFuelTypeToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete fuel type: ${error.message}`);
    },
  });

  const handleAddNew = () => {
    setIsAddingNew(true);
    form.reset({ name: "", code: "", description: "" });
  };

  const handleEdit = (fuelType: FuelType) => {
    setEditingRowId(fuelType.id);
    form.reset({
      name: fuelType.name,
      code: fuelType.code,
      description: fuelType.description || "",
    });
  };

  const handleSave = (fuelType?: FuelType) => {
    const formData = form.getValues();
    
    if (isAddingNew) {
      // Create new fuel type
      const createData: CreateFuelTypeRequest = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      };
      createMutation.mutate(createData);
    } else if (fuelType) {
      // Update existing fuel type
      const updateData: UpdateFuelTypeRequest = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      };
      updateMutation.mutate({ id: fuelType.id, data: updateData });
    }
  };

  const handleCancel = () => {
    setEditingRowId(null);
    setIsAddingNew(false);
    form.reset();
  };

  const handleDelete = (fuelType: FuelType) => {
    setFuelTypeToDelete(fuelType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fuelTypeToDelete) {
      deleteMutation.mutate(fuelTypeToDelete.id);
    }
  };

  const handleToggleActive = (fuelType: FuelType) => {
    const updateData: UpdateFuelTypeRequest = {
      is_active: !fuelType.is_active,
    };
    updateMutation.mutate({ id: fuelType.id, data: updateData });
  };

  if (isLoading) {
    return <div>Loading fuel types...</div>;
  }

  if (error) {
    return <div>Error loading fuel types: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fuel Types</h3>
        <Button onClick={handleAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New Fuel Type
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* New fuel type row */}
          {isAddingNew && (
            <TableRow>
              <TableCell>
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Fuel name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </TableCell>
              <TableCell>
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Fuel code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </TableCell>
              <TableCell>
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Description (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">New</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave()}
                    disabled={!form.formState.isValid}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Existing fuel types */}
          {fuelTypes.map((fuelType) => (
            <TableRow key={fuelType.id}>
              <TableCell>
                {editingRowId === fuelType.id ? (
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                ) : (
                  fuelType.name
                )}
              </TableCell>
              <TableCell>
                {editingRowId === fuelType.id ? (
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                ) : (
                  fuelType.code
                )}
              </TableCell>
              <TableCell>
                {editingRowId === fuelType.id ? (
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                ) : (
                  fuelType.description || "—"
                )}
              </TableCell>
              <TableCell>
                <Badge variant={fuelType.is_active ? "default" : "secondary"}>
                  {fuelType.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {editingRowId === fuelType.id ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(fuelType)}
                      disabled={!form.formState.isValid}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(fuelType)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(fuelType)}>
                        {fuelType.is_active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(fuelType)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fuel type
              "{fuelTypeToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}