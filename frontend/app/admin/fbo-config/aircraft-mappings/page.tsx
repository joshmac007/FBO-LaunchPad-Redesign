'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getAircraftMappings,
  uploadAircraftMappings,
  getFeeCategories,
  AircraftMapping,
  FeeCategory
} from '../../../services/admin-fee-config-service'

export default function AircraftMappingsPage() {
  const [mappings, setMappings] = useState<AircraftMapping[]>([])
  const [categories, setCategories] = useState<FeeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // TODO: Get actual FBO ID from user context
  const fboId = 1

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [mappingsData, categoriesData] = await Promise.all([
        getAircraftMappings(fboId),
        getFeeCategories(fboId)
      ])
      setMappings(mappingsData)
      setCategories(categoriesData)
    } catch (error: any) {
      toast.error(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const result = await uploadAircraftMappings(fboId, file)
      toast.success(`Successfully processed: ${result.created} created, ${result.updated} updated`)
      loadData() // Reload data after upload
    } catch (error: any) {
      toast.error(`Failed to upload file: ${error.message}`)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading aircraft mappings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Aircraft Type to Fee Category Mappings</h1>
        <p className="text-gray-600">
          Manage mappings between aircraft types and fee categories. Upload CSV files to bulk update mappings.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium mb-2">Upload CSV Mappings</h3>
        <p className="text-sm text-gray-600 mb-3">
          Upload a CSV file with columns: Aircraft Type, Fee Category Name
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && (
          <p className="text-sm text-blue-600 mt-2">Uploading and processing file...</p>
        )}
      </div>

      {/* Mappings Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Aircraft Type ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Fee Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  No aircraft mappings found. Upload a CSV file to create mappings.
                </td>
              </tr>
            ) : (
              mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{mapping.aircraft_type_id}</td>
                  <td className="px-4 py-3">
                    {categories.find(c => c.id === mapping.fee_category_id)?.name || 'Unknown Category'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 