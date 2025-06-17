"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSliders, Plane, AlertCircle } from "lucide-react";
import { getFeeCategoryById, type FeeCategory } from "@/app/services/admin-fee-config-service";
import { FeeRulesTable } from "./FeeRulesTable";
import { AircraftMappingsTable } from "./AircraftMappingsTable";

interface FeeCategoryWorkspaceProps {
  categoryId: number | null;
  activeTab: string;
}

export function FeeCategoryWorkspace({ categoryId, activeTab }: FeeCategoryWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get actual FBO ID from user context
  const fboId = 1;

  // Fetch the details of the selected category
  useEffect(() => {
    if (!categoryId) {
      setSelectedCategory(null);
      setError(null);
      return;
    }

    const fetchCategory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const category = await getFeeCategoryById(fboId, categoryId);
        setSelectedCategory(category);
      } catch (err: any) {
        setError(err.message || 'Failed to load category');
        setSelectedCategory(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, fboId]);

  const handleTabChange = (tabValue: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("tab", tabValue);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  if (!categoryId) {
    // Placeholder view
    return (
      <Card className="h-full border-0 rounded-none">
        <CardHeader>
          <CardTitle>Select a Fee Category</CardTitle>
          <CardDescription>
            Choose a fee category from the left panel to view and manage its rules and aircraft mappings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <FileSliders className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No category selected</p>
            <p className="text-sm">Select a category to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full border-0 rounded-none">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-0 rounded-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load fee category details. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-0 rounded-none">
      <CardHeader>
        <CardTitle>Workspace: {selectedCategory?.name}</CardTitle>
        <CardDescription>
          Manage fee rules and aircraft mappings for this category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <FileSliders className="h-4 w-4" />
              Fee Rules
            </TabsTrigger>
            <TabsTrigger value="mappings" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Aircraft Mappings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules" className="mt-4">
            <FeeRulesTable categoryId={categoryId} />
          </TabsContent>
          
          <TabsContent value="mappings" className="mt-4">
            <AircraftMappingsTable categoryId={categoryId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 