"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle } from "lucide-react";
import {
  getAircraftMappings,
  uploadAircraftMappings,
  type AircraftMapping,
} from "@/app/services/admin-fee-config-service";

interface AircraftMappingsTableProps {
  categoryId: number;
}

export function AircraftMappingsTable({ categoryId }: AircraftMappingsTableProps) {
  const [mappings, setMappings] = useState<AircraftMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // TODO: Get actual FBO ID from user context
  const fboId = 1;

  useEffect(() => {
    loadMappings();
  }, [categoryId]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAircraftMappings(fboId, categoryId);
      setMappings(data);
    } catch (error: any) {
      const errorMessage = `Failed to load aircraft mappings: ${error.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await uploadAircraftMappings(fboId, file);
      toast.success(`Successfully processed: ${result.created} created, ${result.updated} updated`);
      loadMappings(); // Reload data after upload
    } catch (error: any) {
      toast.error(`Failed to upload file: ${error.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      if(event.target) event.target.value = '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Mappings</CardTitle>
          <CardDescription>Loading aircraft mappings for this category...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Mappings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMappings}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Aircraft Mappings
              <Badge variant="secondary">{mappings.length}</Badge>
            </CardTitle>
            <CardDescription>
              Aircraft types mapped to this fee category
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No aircraft mappings found for this category.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Aircraft Type ID</th>
                    <th className="text-left p-3 font-medium">Aircraft Type Name</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => (
                    <tr key={mapping.id} className="border-b hover:bg-muted/25">
                      <td className="p-3 font-mono text-sm">{mapping.aircraft_type_id}</td>
                      <td className="p-3">
                        <div className="font-medium">{mapping.aircraft_type_name || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 