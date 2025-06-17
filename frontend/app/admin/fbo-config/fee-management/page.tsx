"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSliders, Trophy } from "lucide-react";
import { FeeStructureTab } from "./components/FeeStructureTab";
import { WaiverTiersTab } from "./components/WaiverTiersTab";

export default function UnifiedFeeManagementPage() {
  return (
      <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">
            Comprehensive fee configuration and waiver management
          </p>
        </div>
      </div>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <FileSliders className="h-4 w-4" />
            Fee Structure
          </TabsTrigger>
          <TabsTrigger value="waivers" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Waiver Tiers
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure Management</CardTitle>
              <CardDescription>
                Manage fee categories, rules, and aircraft mappings in a unified workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeeStructureTab />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="waivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Waiver Tiers Management</CardTitle>
              <CardDescription>
                Configure waiver tiers and fuel uplift requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WaiverTiersTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 