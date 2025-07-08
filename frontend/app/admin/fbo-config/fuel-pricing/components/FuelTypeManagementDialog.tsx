"use client";

import React from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FuelTypesTable } from "./FuelTypesTable";

export function FuelTypeManagementDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Fuel Types</DialogTitle>
          <DialogDescription>
            Add, edit, and manage fuel types for your FBO.
          </DialogDescription>
        </DialogHeader>
        <FuelTypesTable />
      </DialogContent>
    </Dialog>
  );
}