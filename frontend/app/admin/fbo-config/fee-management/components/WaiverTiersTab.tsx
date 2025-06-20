"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
  getFeeRules,
  type WaiverTier,
  type FeeRule,
  type CreateWaiverTierRequest,
  type UpdateWaiverTierRequest,
} from '@/app/services/admin-fee-config-service';
import { isAuthenticated } from '@/app/services/api-config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2 } from 'lucide-react';

// Main component for managing waiver tiers
export function WaiverTiersTab() {
  const [tiers, setTiers] = useState<WaiverTier[]>([]);
  const [feeRules, setFeeRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Get actual FBO ID from user context
  const fboId = 1;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check authentication before making API calls
      if (!isAuthenticated()) {
        toast.error("Authentication required. Please log in.");
        return;
      }
      
      const [tiersData, rulesData] = await Promise.all([
        getWaiverTiers(fboId),
        getFeeRules(fboId), // Fetch all rules for the FBO
      ]);
      
      // Defensive programming: ensure we have arrays
      setTiers(Array.isArray(tiersData) ? tiersData : []);
      setFeeRules(Array.isArray(rulesData) ? rulesData : []);
    } catch (error: any) {
      console.error("Failed to load waiver tiers data:", error);
      toast.error(`Failed to load data: ${error.message}`);
      // Set empty arrays on error to prevent mapping errors
      setTiers([]);
      setFeeRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTier = async (tier: WaiverTier) => {
    if (!confirm(`Are you sure you want to delete waiver tier "${tier.name}"?`)) {
      return;
    }
    try {
      await deleteWaiverTier(fboId, tier.id);
      toast.success('Waiver tier deleted successfully');
      setTiers(tiers.filter((t) => t.id !== tier.id));
    } catch (error: any) {
      toast.error(`Failed to delete waiver tier: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
       <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle>Waiver Tiers</CardTitle>
            <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Tier
            </Button>
        </div>
        <CardDescription>
          Configure waiver tier strategies for fuel purchases and fee discounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier Name</TableHead>
              <TableHead>Fuel Multiplier</TableHead>
              <TableHead>Fees Waived</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No waiver tiers found.
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell>{tier.fuel_uplift_multiplier || 'N/A'}</TableCell>
                  <TableCell>{tier.fees_waived_codes.length > 0 ? `${tier.fees_waived_codes.join(', ')}` : 'N/A'}</TableCell>
                  <TableCell>{tier.tier_priority}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTier(tier)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 