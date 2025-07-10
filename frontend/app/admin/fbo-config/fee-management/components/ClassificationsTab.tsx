"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { 
  getAircraftClassifications,
  createAircraftClassification, 
  updateAircraftClassification, 
  deleteAircraftClassification,
  type AircraftClassification,
  type CreateAircraftClassificationRequest,
  type UpdateAircraftClassificationRequest
} from "@/app/services/admin-fee-config-service"
import { classificationSchema, type ClassificationFormData } from "@/app/schemas/classification.schema"

interface ClassificationRowProps {
  classification: AircraftClassification;
  isDeletable: boolean;
  isEditing: boolean;
  isUpdating: boolean;
  onEdit: (id: number) => void;
  onSave: (id: number, name: string) => void;
  onCancel: () => void;
  onDelete: (classification: AircraftClassification) => void;
}

function UnifiedClassificationRow({
  classification,
  isDeletable,
  isEditing,
  isUpdating,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ClassificationRowProps) {
  const [name, setName] = useState(classification.name);

  const handleSave = () => {
    if (name.trim() && name !== classification.name) {
      onSave(classification.id, name.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault(), handleSave();
    if (e.key === 'Escape') e.preventDefault(), onCancel();
  };

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isUpdating}
            autoFocus
          />
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isUpdating || !name.trim()}>
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isUpdating}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {classification.name}
        {!isDeletable && <Badge variant="secondary" className="ml-2">System</Badge>}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(classification.id)}>
            <PencilIcon className="h-4 w-4" />
          </Button>
          {isDeletable ? (
            <Button variant="outline" size="sm" onClick={() => onDelete(classification)}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ClassificationsTab() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingClassification, setDeletingClassification] = useState<AircraftClassification | null>(null);

  const { data: classifications = [], isLoading } = useQuery<AircraftClassification[]>({
    queryKey: ['aircraft-classifications'],
    queryFn: getAircraftClassifications,
  });

  const deletableClassificationIds = useMemo(() => {
    const systemClassifications = new Set(["General Service Fees", "General"]);
    return new Set(classifications.filter(c => !systemClassifications.has(c.name)).map(c => c.id));
  }, [classifications]);

  const form = useForm<ClassificationFormData>({
    resolver: zodResolver(classificationSchema),
    defaultValues: {
      name: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: createAircraftClassification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
      form.reset()
      toast.success("Aircraft classification created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create aircraft classification")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAircraftClassificationRequest }) => 
      updateAircraftClassification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
      setEditingId(null)
      toast.success("Aircraft classification updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update aircraft classification")
      setEditingId(null)
    },
  })

  // Simple delete mutation with strict guards
  const deleteMutation = useMutation({
    mutationFn: deleteAircraftClassification,
    onMutate: async (deletedId: number) => {
      console.log(`Deleting classification ${deletedId}: ${classifications.find(c => c.id === deletedId)?.name}`)
      // Close dialog immediately to prevent double clicks
      setDeletingClassification(null)
      
      // Cancel any outgoing refetches (so they don't overwrite our update)
      await queryClient.cancelQueries({ queryKey: ['aircraft-classifications'] })
    },
    onError: (err, deletedId, context) => {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      toast.error(`Failed to delete classification: ${errorMessage}`)
      
      // Force refresh data to ensure UI is accurate after error
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
    },
    onSuccess: () => {
      toast.success("Aircraft classification deleted successfully")
      
      // Always refresh data after successful deletion
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
    }
  })

  const handleCreateClassification = (data: ClassificationFormData) => {
    createMutation.mutate(data as CreateAircraftClassificationRequest)
  }

  const handleEditStart = (id: number) => {
    setEditingId(id)
  }

  const handleEditCancel = () => {
    setEditingId(null)
  }

  const handleEditSave = (id: number, name: string) => {
    updateMutation.mutate({ id, data: { name } })
  }

  const handleDeleteRequest = (classification: AircraftClassification) => {
    // Only allow opening delete dialog if no deletion is in progress
    if (!deleteMutation.isPending) {
      setDeletingClassification(classification);
    }
  }

  const handleConfirmDelete = () => {
    // Triple guard against double requests
    if (deletingClassification && !deleteMutation.isPending) {
      console.log(`Deleting classification ${deletingClassification.id}:`, deletingClassification.name)
      deleteMutation.mutate(deletingClassification.id)
    }
  }

  const handleCancelDelete = () => {
    if (!deleteMutation.isPending) {
      setDeletingClassification(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Add New Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Aircraft Classification</CardTitle>
          <CardDescription>Create a new aircraft classification to organize similar aircraft types together (like "Light Jets", "Heavy Jets", "Turboprops")</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateClassification)} className="flex gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Classification name (e.g., Light Jets, Turboprops, Heavy Jets)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Creating..." : "Add Aircraft Classification"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Existing Classifications */}
      <Card>
        <CardHeader>
          <CardTitle>Your Aircraft Classifications</CardTitle>
          <CardDescription>Manage the groups you use to organize aircraft types with similar pricing</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading aircraft classifications...</div>
          ) : classifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No aircraft classifications found. Create your first classification above to start organizing your aircraft types.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classifications.map((classification) => (
                  <UnifiedClassificationRow
                    key={classification.id}
                    classification={classification}
                    isDeletable={deletableClassificationIds.has(classification.id)}
                    isEditing={editingId === classification.id}
                    isUpdating={updateMutation.isPending}
                    onEdit={handleEditStart}
                    onSave={handleEditSave}
                    onCancel={handleEditCancel}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!deletingClassification} onOpenChange={(isOpen) => !isOpen && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingClassification?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}