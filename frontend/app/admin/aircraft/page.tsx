"use client"

import React from "react"
import AircraftInstancesTable from "./components/AircraftInstancesTable"
import AircraftTypesTable from "./components/AircraftTypesTable"

export default function AdminAircraftPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">✈️ Aircraft Management</h1>
      </div>
      <div className="text-muted-foreground">
        Manage individual aircraft instances and the master list of aircraft types.
      </div>
      
      <div className="flex flex-col gap-6">
        <AircraftInstancesTable />
        <AircraftTypesTable />
      </div>
    </div>
  )
}