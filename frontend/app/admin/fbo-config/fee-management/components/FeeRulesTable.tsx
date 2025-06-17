"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import {
  getFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  type FeeRule,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest
} from "@/app/services/admin-fee-config-service";
import { FeeRuleFormDialog } from "./FeeRuleFormDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

interface FeeRulesTableProps {
  categoryId: number;
}

export function FeeRulesTable({ categoryId }: FeeRulesTableProps) {
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<FeeRule | null>(null);
  
  // TODO: Get actual FBO ID from user context
  const fboId = 1;

  useEffect(() => {
    if (categoryId) {
        loadRules();
    }
  }, [categoryId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeeRules(fboId, categoryId);
      setRules(data);
    } catch (error: any) {
      const errorMessage = `Failed to load fee rules: ${error.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (rule: FeeRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (rule: FeeRule) => {
    setRuleToDelete(rule);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateFeeRuleRequest | UpdateFeeRuleRequest) => {
    try {
      if (editingRule) {
        await updateFeeRule(fboId, editingRule.id, data as UpdateFeeRuleRequest);
        toast.success("Fee rule updated successfully");
      } else {
        await createFeeRule(fboId, data as CreateFeeRuleRequest);
        toast.success("Fee rule created successfully");
      }
      setIsFormOpen(false);
      await loadRules();
    } catch (error: any) {
      toast.error(`Failed to save fee rule: ${error.details?.messages?.name || error.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteFeeRule(fboId, ruleToDelete.id);
      toast.success("Fee rule deleted successfully");
      setIsDeleteDialogOpen(false);
      setRuleToDelete(null);
      await loadRules();
    } catch (error: any) {
      toast.error(`Failed to delete fee rule: ${error.message}`);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatEnum = (value?: string | null): string => {
    if (!value) return 'N/A';
    return value.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fee Rules</CardTitle>
          <CardDescription>Loading fee rules for this category...</CardDescription>
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
            Error Loading Fee Rules
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
            onClick={loadRules}
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Fee Rules
                <Badge variant="secondary">{rules.length}</Badge>
              </CardTitle>
              <CardDescription>
                Manage fee rules for this category
              </CardDescription>
            </div>
            <Button size="sm" className="flex items-center gap-2" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fee rules found for this category.</p>
              <p className="text-sm">Create your first rule to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Fee Name</th>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Calculation</th>
                      <th className="text-left p-3 font-medium">Waiver Strategy</th>
                      <th className="text-left p-3 font-medium">CAA Override</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b hover:bg-muted/25">
                        <td className="p-3">
                          <div className="font-medium">{rule.fee_name}</div>
                          {rule.is_taxable && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Taxable
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 font-mono text-sm">{rule.fee_code}</td>
                        <td className="p-3">{formatCurrency(rule.amount)}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-xs">
                            {formatEnum(rule.calculation_basis)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={rule.waiver_strategy === 'NONE' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {formatEnum(rule.waiver_strategy)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {rule.has_caa_override ? (
                            <div>
                              <Badge variant="secondary" className="text-xs">
                                {rule.caa_override_amount ? formatCurrency(rule.caa_override_amount) : 'Yes'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(rule)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(rule)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
      <FeeRuleFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        rule={editingRule}
        categoryId={categoryId}
      />
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Fee Rule"
        description={`Are you sure you want to delete the rule "${ruleToDelete?.fee_name}"? This action cannot be undone.`}
      />
    </>
  );
} 