"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import ReceiptEditor from "./ReceiptEditor";
import ReceiptPreview from "./ReceiptPreview";
import { useReceipt } from "../hooks/useReceipt";
import { ReceiptContext } from "../contexts/ReceiptContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText } from "lucide-react";


interface ReceiptWorkspaceProps {
  receiptId: number | null;
}

function ReceiptWorkspaceInternal({ receiptId }: ReceiptWorkspaceProps) {
  const receiptData = useReceipt(receiptId);

  // Loading state
  if (receiptData.status === 'loading_initial') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading receipt...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (receiptData.status === 'error' || !receiptData.receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-cy="error-message">
            {receiptData.error || 'Failed to load receipt'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <ReceiptContext.Provider value={receiptData}>
      <div className="container mx-auto px-4 py-6 space-y-6" data-testid="receipt-workspace">
        
        {/* Auto-save indicator */}
        {receiptData.autoSaveStatus === 'saving' && (
            <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-200 rounded-md px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-blue-700">Saving...</span>
            </div>
        )}
        {receiptData.autoSaveStatus === 'saved' && (
            <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2" data-cy="auto-save-indicator">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Saved</span>
            </div>
        )}

        {/* Global Error Alert */}
        {receiptData.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-cy="error-message">
              {receiptData.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Editor */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <ReceiptEditor />
                
                {/* Notes Section */}
                <Card className="bg-white">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Internal Notes</Label>
                      <Textarea
                        id="notes"
                        data-cy="receipt-notes"
                        value={receiptData.receipt.notes || ''}
                        onChange={(e) => receiptData.handleNotesChange(e.target.value)}
                        disabled={receiptData.isReadOnly}
                        placeholder="Add any internal notes for this receipt..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Preview */}
          <div className="space-y-4">
            <ReceiptPreview />
            
            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={receiptData.handleGenerateReceipt}
                          disabled={!receiptData.canGenerateReceipt || receiptData.status === 'generating'}
                          data-cy="generate-receipt-btn"
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {receiptData.status === 'generating' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Generate & Send
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!receiptData.receipt}
                  >
                    Download PDF
                  </Button>

                  {receiptData.canMarkAsPaid && (
                    <Button
                      onClick={receiptData.handleMarkAsPaid}
                      disabled={receiptData.status === 'marking_paid'}
                      data-cy="mark-as-paid-btn"
                      variant="outline"
                      className="w-full"
                    >
                      {receiptData.status === 'marking_paid' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Marking as Paid...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </ReceiptContext.Provider>
  );
}


export default function ReceiptWorkspace({ receiptId }: ReceiptWorkspaceProps) {
    return <ReceiptWorkspaceInternal receiptId={receiptId} />;
} 