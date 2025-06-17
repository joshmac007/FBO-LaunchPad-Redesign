"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  type FeeCategory,
  type CreateFeeCategoryRequest,
  type UpdateFeeCategoryRequest
} from "@/app/services/admin-fee-config-service";
import { isAuthenticated } from "@/app/services/api-config";
import { FeeCategoryFormDialog } from "./FeeCategoryFormDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

interface FeeCategoryListProps {
  activeCategoryId: number | null;
  onSelectCategory: (category: FeeCategory) => void;
}

export function FeeCategoryList({ activeCategoryId, onSelectCategory }: FeeCategoryListProps) {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FeeCategory | null>(null);

  // TODO: Get actual FBO ID from user context
  const fboId = 1;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check authentication before making API call
      if (!isAuthenticated()) {
        setError("Authentication required. Please log in.");
        return;
      }
      
      const data = await getFeeCategories(fboId);
      setCategories(data);
    } catch (error: any) {
      const errorMessage = `Failed to load fee categories: ${error.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (category: FeeCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (category: FeeCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateFeeCategoryRequest | UpdateFeeCategoryRequest) => {
    try {
      // Check authentication before making API call
      if (!isAuthenticated()) {
        toast.error("Authentication required. Please log in.");
        return;
      }
      
      if (editingCategory) {
        await updateFeeCategory(fboId, editingCategory.id, data as UpdateFeeCategoryRequest);
        toast.success("Category updated successfully");
      } else {
        await createFeeCategory(fboId, data as CreateFeeCategoryRequest);
        toast.success("Category created successfully");
      }
      setIsFormOpen(false);
      await loadCategories();
    } catch (error: any) {
      toast.error(`Failed to save category: ${error.details?.messages?.name || error.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      // Check authentication before making API call
      if (!isAuthenticated()) {
        toast.error("Authentication required. Please log in.");
        setIsDeleteDialogOpen(false);
        setCategoryToDelete(null);
        return;
      }
      
      await deleteFeeCategory(fboId, categoryToDelete.id);
      toast.success("Category deleted successfully");
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await loadCategories();
      // If the deleted category was the active one, clear the selection
      if (activeCategoryId === categoryToDelete.id) {
        onSelectCategory({} as FeeCategory); // Pass empty object to signify deselection
      }
    } catch (error: any) {
      console.error("Delete category error:", error);
      
      // Provide specific error messages based on the error type
      let errorMessage = "Failed to delete category";
      
      if (error.message) {
        if (error.message.includes("referenced by fee rules")) {
          errorMessage = "Cannot delete this category because it has fee rules. Please delete all associated fee rules first.";
        } else if (error.message.includes("aircraft type mappings")) {
          errorMessage = "Cannot delete this category because it has aircraft type mappings. Please remove all aircraft mappings first.";
        } else if (error.message.includes("Authentication required")) {
          errorMessage = "Your session has expired. Please log in again.";
          // Don't show the toast error as the user will be redirected to login
          return;
        } else if (error.message.includes("not found")) {
          errorMessage = "This category has already been deleted or no longer exists.";
          // Refresh the list to show current state
          await loadCategories();
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleCategoryClick = (category: FeeCategory) => {
    onSelectCategory(category);
  };

  if (loading) {
    return (
      <Card className="h-full border-0 rounded-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fee Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
        <Card className="h-full border-0 rounded-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Fee Categories
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="text-center text-muted-foreground">
                    <p className="text-sm">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadCategories}
                        className="mt-2"
                    >
                        Retry
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card className="h-full border-0 rounded-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Fee Categories
              <Badge variant="secondary">{categories.length}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1 p-4 pt-0">
            {categories.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No fee categories found.</p>
                <p className="text-xs">Create one to get started.</p>
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "group w-full p-3 text-left rounded-md transition-colors cursor-pointer flex justify-between items-center",
                    "hover:bg-accent hover:text-accent-foreground",
                    activeCategoryId === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className={cn("text-xs opacity-70", activeCategoryId === category.id && "text-primary-foreground/80")}>
                      ID: {category.id}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEditClick(category); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteClick(category); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <FeeCategoryFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={editingCategory}
      />
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Fee Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
      />
    </>
  );
} 