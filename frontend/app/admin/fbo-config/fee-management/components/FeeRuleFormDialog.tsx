"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type FeeRule, type CreateFeeRuleRequest, type UpdateFeeRuleRequest } from "@/app/services/admin-fee-config-service";
import { Separator } from "@/components/ui/separator";

const calculationBasisOptions = ['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE'] as const;
const waiverStrategyOptions = ['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER'] as const;

const formSchema = z.object({
  fee_name: z.string().min(2, "Fee name must be at least 2 characters."),
  fee_code: z.string().min(2, "Fee code must be at least 2 characters."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
  calculation_basis: z.enum(calculationBasisOptions),
  is_taxable: z.boolean().default(false),
  is_potentially_waivable_by_fuel_uplift: z.boolean().default(false),
  waiver_strategy: z.enum(waiverStrategyOptions),
  simple_waiver_multiplier: z.coerce.number().optional(),
  has_caa_override: z.boolean().default(false),
  caa_override_amount: z.coerce.number().optional(),
  caa_waiver_strategy_override: z.enum(waiverStrategyOptions).optional(),
  caa_simple_waiver_multiplier_override: z.coerce.number().optional(),
});

interface FeeRuleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFeeRuleRequest | UpdateFeeRuleRequest) => Promise<void>;
  rule: FeeRule | null;
  categoryId: number;
}

export function FeeRuleFormDialog({ isOpen, onClose, onSubmit, rule, categoryId }: FeeRuleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fee_name: "",
      fee_code: "",
      amount: 0,
      calculation_basis: "NOT_APPLICABLE",
      waiver_strategy: "NONE",
      is_taxable: false,
      is_potentially_waivable_by_fuel_uplift: false,
      simple_waiver_multiplier: undefined,
      has_caa_override: false,
      caa_override_amount: undefined,
      caa_waiver_strategy_override: undefined,
      caa_simple_waiver_multiplier_override: undefined,
    },
  });

  const hasCaaOverride = form.watch("has_caa_override");

  useEffect(() => {
    if (rule) {
      const transformedRule = {
        ...rule,
        simple_waiver_multiplier: rule.simple_waiver_multiplier ?? undefined,
        caa_override_amount: rule.caa_override_amount ?? undefined,
        caa_waiver_strategy_override: rule.caa_waiver_strategy_override ?? undefined,
        caa_simple_waiver_multiplier_override: rule.caa_simple_waiver_multiplier_override ?? undefined,
      };
      form.reset(transformedRule);
    } else {
      form.reset({
        fee_name: "",
        fee_code: "",
        amount: 0,
        calculation_basis: "NOT_APPLICABLE",
        waiver_strategy: "NONE",
        is_taxable: false,
        is_potentially_waivable_by_fuel_uplift: false,
        simple_waiver_multiplier: undefined,
        has_caa_override: false,
        caa_override_amount: undefined,
        caa_waiver_strategy_override: undefined,
        caa_simple_waiver_multiplier_override: undefined,
      });
    }
  }, [rule, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const submissionData: CreateFeeRuleRequest | UpdateFeeRuleRequest = { 
      ...values, 
      applies_to_aircraft_classification_id: categoryId 
    };
    await onSubmit(submissionData);
    setIsSubmitting(false);
  };

  const renderSelect = (name: keyof z.infer<typeof formSchema>, label: string, options: readonly string[]) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name as any}
        control={form.control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
            <SelectTrigger id={name}>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => {
                let displayText = option.replace(/_/g, ' ').toLowerCase();
                if (name === 'waiver_strategy' || name === 'caa_waiver_strategy_override') {
                  if (option === 'SIMPLE_MULTIPLIER') displayText = 'Simple Multiplier';
                  else if (option === 'TIERED_MULTIPLIER') displayText = 'Tiered Multiplier';
                  else if (option === 'NONE') displayText = 'None';
                }
                return (
                  <SelectItem key={option} value={option}>{displayText}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Fee Rule" : "Create Fee Rule"}</DialogTitle>
          <DialogDescription>
            {rule ? "Update the details for this fee rule." : "Enter details for the new fee rule."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="fee_name">Fee Name</Label>
              <Input id="fee_name" {...form.register("fee_name")} disabled={isSubmitting} />
              {form.formState.errors.fee_name && <p className="text-sm text-red-500 mt-1">{form.formState.errors.fee_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="fee_code">Fee Code</Label>
              <Input id="fee_code" {...form.register("fee_code")} disabled={isSubmitting} />
              {form.formState.errors.fee_code && <p className="text-sm text-red-500 mt-1">{form.formState.errors.fee_code.message}</p>}
            </div>
            <div>
              <Label htmlFor="amount">Amount (in USD)</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount")} disabled={isSubmitting} />
              {form.formState.errors.amount && <p className="text-sm text-red-500 mt-1">{form.formState.errors.amount.message}</p>}
            </div>
            {renderSelect("calculation_basis", "Calculation Basis", calculationBasisOptions)}
            <div className="flex items-center space-x-2 mt-4">
              <Controller name="is_taxable" control={form.control} render={({ field }) => <Checkbox id="is_taxable" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />} />
              <Label htmlFor="is_taxable">Is this fee taxable?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Controller name="is_potentially_waivable_by_fuel_uplift" control={form.control} render={({ field }) => <Checkbox id="is_potentially_waivable_by_fuel_uplift" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />} />
              <Label htmlFor="is_potentially_waivable_by_fuel_uplift">Potentially waivable by fuel uplift?</Label>
            </div>
            
            <div className="col-span-1 md:col-span-2">
                <Separator className="my-4" />
            </div>

            {renderSelect("waiver_strategy", "Waiver Strategy", waiverStrategyOptions)}
             <div>
              <Label htmlFor="simple_waiver_multiplier">Simple Waiver Multiplier</Label>
              <Input id="simple_waiver_multiplier" type="number" step="0.1" {...form.register("simple_waiver_multiplier")} disabled={isSubmitting} />
            </div>

            <div className="col-span-1 md:col-span-2">
                <Separator className="my-4" />
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center space-x-2">
                <Controller name="has_caa_override" control={form.control} render={({ field }) => <Checkbox id="has_caa_override" checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />} />
                <Label htmlFor="has_caa_override">Has CAA Override?</Label>
            </div>
            
            {hasCaaOverride && (
                <>
                    <div>
                        <Label htmlFor="caa_override_amount">CAA Override Amount</Label>
                        <Input id="caa_override_amount" type="number" step="0.01" {...form.register("caa_override_amount")} disabled={isSubmitting} />
                    </div>
                    {renderSelect("caa_waiver_strategy_override", "CAA Waiver Strategy Override", waiverStrategyOptions)}
                    <div>
                        <Label htmlFor="caa_simple_waiver_multiplier_override">CAA Simple Waiver Multiplier Override</Label>
                        <Input id="caa_simple_waiver_multiplier_override" type="number" step="0.1" {...form.register("caa_simple_waiver_multiplier_override")} disabled={isSubmitting} />
                    </div>
                </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 