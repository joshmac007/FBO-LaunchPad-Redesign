'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getFeeCategories,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  FeeCategory,
  CreateFeeCategoryRequest,
  UpdateFeeCategoryRequest
} from '../../../services/admin-fee-config-service'

// Main component for managing fee categories
export default function FeeCategoriesPage() {
  const [categories, setCategories] = useState<FeeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<FeeCategory | null>(null)

  // TODO: Get actual FBO ID from user context
  const fboId = 1

  // Load categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await getFeeCategories(fboId)
      setCategories(data)
    } catch (error: any) {
      toast.error(`Failed to load fee categories: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setIsFormOpen(true)
  }

  const handleEditCategory = (category: FeeCategory) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const handleDeleteCategory = (category: FeeCategory) => {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return

    try {
      await deleteFeeCategory(fboId, categoryToDelete.id)
      toast.success('Category deleted successfully')
      setCategories(categories.filter(c => c.id !== categoryToDelete.id))
    } catch (error: any) {
      if (error.status === 409) {
        toast.error('Cannot delete category: it is being used by fee rules')
      } else {
        toast.error(`Failed to delete category: ${error.message}`)
      }
    } finally {
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleFormSubmit = async (data: CreateFeeCategoryRequest | UpdateFeeCategoryRequest) => {
    try {
      if (editingCategory) {
        // Update existing category
        const updated = await updateFeeCategory(fboId, editingCategory.id, data as UpdateFeeCategoryRequest)
        setCategories(categories.map(c => c.id === editingCategory.id ? updated : c))
        toast.success('Category updated successfully')
      } else {
        // Create new category
        const created = await createFeeCategory(fboId, data as CreateFeeCategoryRequest)
        setCategories([...categories, created])
        toast.success('Category created successfully')
      }
      setIsFormOpen(false)
      setEditingCategory(null)
    } catch (error: any) {
      if (error.status === 409) {
        toast.error('Category name already exists')
      } else if (error.status === 400) {
        toast.error('Invalid category data')
      } else {
        toast.error(`Failed to save category: ${error.message}`)
      }
    }
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading fee categories...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Fee Categories</h1>
        <p className="text-gray-600">
          Manage aircraft fee categories for your FBO. These categories are used to organize fee rules.
        </p>
      </div>

      <div className="mb-6">
        <button
          data-testid="add-category-button"
          onClick={handleCreateCategory}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Category
        </button>
      </div>

      <FeeCategoryList
        categories={categories}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />

      {isFormOpen && (
        <FeeCategoryForm
          category={editingCategory}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {isDeleteDialogOpen && categoryToDelete && (
        <DeleteConfirmationDialog
          category={categoryToDelete}
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteDialogOpen(false)
            setCategoryToDelete(null)
          }}
        />
      )}
    </div>
  )
}

// Component for displaying the list of fee categories
interface FeeCategoryListProps {
  categories: FeeCategory[]
  onEdit: (category: FeeCategory) => void
  onDelete: (category: FeeCategory) => void
}

function FeeCategoryList({ categories, onEdit, onDelete }: FeeCategoryListProps) {
  if (categories.length === 0) {
    return (
      <div data-testid="fee-category-list" className="border rounded-lg p-8 text-center">
        <p className="text-gray-500">No fee categories found. Create your first category to get started.</p>
      </div>
    )
  }

  return (
    <div data-testid="fee-category-list" className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Category Name</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {categories.map((category) => (
            <tr key={category.id} data-testid="category-item" className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span data-testid="category-name" className="font-medium">
                  {category.name}
                </span>
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  data-testid="edit-button"
                  onClick={() => onEdit(category)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  data-testid="delete-button"
                  onClick={() => onDelete(category)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Component for creating/editing fee categories
interface FeeCategoryFormProps {
  category?: FeeCategory | null
  onSubmit: (data: CreateFeeCategoryRequest | UpdateFeeCategoryRequest) => void
  onCancel: () => void
}

function FeeCategoryForm({ category, onSubmit, onCancel }: FeeCategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [nameError, setNameError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required')
      return
    }
    
    setNameError('')
    onSubmit({ name: trimmedName })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (nameError) {
      setNameError('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div data-testid="category-form-dialog" className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">
          {category ? 'Edit Fee Category' : 'Create Fee Category'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              id="category-name"
              data-testid="category-name-input"
              type="text"
              value={name}
              onChange={handleNameChange}
              className={`w-full px-3 py-2 border rounded-md ${
                nameError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter category name"
            />
            {nameError && (
              <p data-testid="name-error" className="text-red-500 text-sm mt-1">
                {nameError}
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              data-testid="save-category-button"
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Component for delete confirmation dialog
interface DeleteConfirmationDialogProps {
  category: FeeCategory
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmationDialog({ category, onConfirm, onCancel }: DeleteConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div data-testid="confirm-delete-dialog" className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Delete Fee Category</h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the category &quot;{category.name}&quot;? 
          This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
} 