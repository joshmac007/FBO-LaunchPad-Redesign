"use client"

import React, { useState } from "react"
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

interface EditableClassificationRowProps {
  classification: AircraftClassification
  onSave: (id: number, name: string) => void
  onCancel: () => void
  onDelete: (id: number) => void
  isUpdating: boolean
}

function EditableClassificationRow({ 
  classification, 
  onSave, 
  onCancel, 
  onDelete, 
  isUpdating 
}: EditableClassificationRowProps) {
  const [name, setName] = useState(classification.name)

  const handleSave = () => {
    if (name.trim() && name !== classification.name) {
      onSave(classification.id, name.trim())
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isUpdating || !name.trim()}
          >
            <CheckIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isUpdating}
          >
            <XIcon className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdating}>
                <TrashIcon className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Classification</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{classification.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(classification.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

interface ClassificationRowProps {
  classification: AircraftClassification
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  isDeletable: boolean
}

function ClassificationRow({ classification, onEdit, onDelete, isDeletable }: ClassificationRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {classification.name}
        {!isDeletable && (
          <Badge variant="secondary" className="ml-2">System</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(classification.id)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          {isDeletable ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Classification</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{classification.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(classification.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ClassificationsTab() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)

  // Fetch aircraft classifications
  const { data: classifications = [], isLoading } = useQuery<AircraftClassification[]>({
    queryKey: ['aircraft-classifications'],
    queryFn: () => getAircraftClassifications(),
  })

  // Form for creating new classification
  const form = useForm<ClassificationFormData>({
    resolver: zodResolver(classificationSchema),
    defaultValues: {
      name: "",
    },
  })

  // Mutations
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

  const deleteMutation = useMutation({
    mutationFn: deleteAircraftClassification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
      toast.success("Aircraft classification deleted successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete aircraft classification")
    },
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

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  // Determine which classifications can be deleted
  // Typically, system classifications like "General Service Fees" cannot be deleted
  const isDeletable = (classification: AircraftClassification) => {
    const systemClassifications = ["General Service Fees", "General"]
    return !systemClassifications.includes(classification.name)
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
                  editingId === classification.id ? (
                    <EditableClassificationRow
                      key={classification.id}
                      classification={classification}
                      onSave={handleEditSave}
                      onCancel={handleEditCancel}
                      onDelete={handleDelete}
                      isUpdating={updateMutation.isPending}
                    />
                  ) : (
                    <ClassificationRow
                      key={classification.id}
                      classification={classification}
                      onEdit={handleEditStart}
                      onDelete={handleDelete}
                      isDeletable={isDeletable(classification)}
                    />
                  )
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}