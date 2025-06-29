"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  type FeeRule,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest
} from "@/app/services/admin-fee-config-service";
import { FeeRuleFormDialog } from "./FeeRuleFormDialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

interface FeeRulesTableProps {
  classificationId: number;
  rules: FeeRule[];
  viewMode: 'standard' | 'caa';
}

export function FeeRulesTable({ classificationId, rules, viewMode }: FeeRulesTableProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<FeeRule | null>(null);

  // Filter rules that are specific to this classification
  const classificationSpecificRules = rules.filter(
    (rule) => rule.applies_to_aircraft_classification_id === classificationId
  );

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
    // This logic should be handled by the parent component
    toast.info("This action should be handled by the parent component.");
    console.log("Form data:", data);
    setIsFormOpen(false);
  };

  const confirmDelete = async () => {
    // This logic should be handled by the parent component
    toast.info("This action should be handled by the parent component.");
    console.log("Deleting rule:", ruleToDelete);
    setIsDeleteDialogOpen(false);
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Fee Rules
                <Badge variant="secondary">{classificationSpecificRules.length}</Badge>
              </CardTitle>
              <CardDescription>
                Manage fee rules for this classification
              </CardDescription>
            </div>
            <Button size="sm" className="flex items-center gap-2" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classificationSpecificRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fee rules found for this classification.</p>
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
                    {classificationSpecificRules.map((rule) => (
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
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(rule)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(rule)}>
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
        categoryId={classificationId}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Fee Rule"
        description={`Are you sure you want to delete the rule "${ruleToDelete?.fee_name || ''}"? This action cannot be undone.`}
      />
    </>
  );
} 