"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AircraftClassification, type CreateAircraftClassificationRequest, type UpdateAircraftClassificationRequest } from "@/app/services/admin-fee-config-service";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Classification name must be at least 2 characters.",
  }),
});

interface AircraftClassificationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAircraftClassificationRequest | UpdateAircraftClassificationRequest) => Promise<void>;
  classification: AircraftClassification | null;
}

export function AircraftClassificationFormDialog({ isOpen, onClose, onSubmit, classification }: AircraftClassificationFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (classification) {
      form.reset({ name: classification.name });
    } else {
      form.reset({ name: "" });
    }
  }, [classification, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    await onSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{classification ? "Edit Aircraft Classification" : "Create Aircraft Classification"}</DialogTitle>
          <DialogDescription>
            {classification ? "Update the details for this aircraft classification." : "Enter a name for the new aircraft classification."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
            {form.formState.errors.name && (
              <p className="col-span-4 text-sm text-red-500 text-right">
                {form.formState.errors.name.message}
              </p>
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