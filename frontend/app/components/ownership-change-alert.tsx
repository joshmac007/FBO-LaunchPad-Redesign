"use client"

import { useState } from "react"
import { AlertTriangle, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock data for ownership change
const MOCK_OWNERSHIP_CHANGE = {
  id: 6,
  tailNumber: "N78901",
  previousOwner: "Old Aviation Inc.",
  currentOwner: "New Aviation Holdings LLC",
  changeDate: "2023-05-10T00:00:00Z",
}

export default function OwnershipChangeAlert() {
  const [dismissed, setDismissed] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  // If already acknowledged or dismissed, don't render anything
  if (acknowledged || dismissed) {
    return null
  }

  const handleAcknowledge = () => {
    setAcknowledged(true)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  return (
    <div className="fixed top-16 inset-x-0 z-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-amber-800">OWNERSHIP ALERT</h3>
                <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6 text-amber-600">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-amber-800 font-medium mt-1">
                Tail # {MOCK_OWNERSHIP_CHANGE.tailNumber} has a recent ownership change that requires verification
              </p>
              <div className="mt-2 bg-white bg-opacity-50 rounded-md p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm font-medium text-amber-800">Previous Owner:</span>{" "}
                    <span className="text-amber-900">{MOCK_OWNERSHIP_CHANGE.previousOwner}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-amber-800">Current Owner:</span>{" "}
                    <span className="text-amber-900">{MOCK_OWNERSHIP_CHANGE.currentOwner}</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-amber-800">Change Date:</span>{" "}
                  <span className="text-amber-900">
                    {new Date(MOCK_OWNERSHIP_CHANGE.changeDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={handleAcknowledge}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" /> Acknowledge & Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
