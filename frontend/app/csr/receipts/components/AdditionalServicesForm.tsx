"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, AlertCircle, Trash2 } from "lucide-react"
import { usePermissions } from "@/hooks/usePermissions"
import { getAvailableServices, type AvailableService } from "@/app/services/fee-service"
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface SelectedService {
  fee_code: string
  description: string
  quantity: number
  price: number
}

interface AdditionalServicesFormProps {
  onAddService: (serviceCode: string, description: string) => Promise<void>
  selectedServices: SelectedService[]
  onRemoveService: (serviceCode: string) => void
  isReadOnly?: boolean
  isLoading?: boolean
}


export default function AdditionalServicesForm({ 
  onAddService,
  selectedServices,
  onRemoveService,
  isReadOnly = false,
  isLoading = false 
}: AdditionalServicesFormProps) {
  const [selectedService, setSelectedService] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [servicesError, setServicesError] = useState<string | null>(null)
  
  const { user } = usePermissions()

  // Load available services when component mounts or user changes
  useEffect(() => {
    const loadServices = async () => {
      if (!user?.fbo_id) {
        setServicesError("No FBO ID found for current user")
        setIsLoadingServices(false)
        return
      }

      try {
        setIsLoadingServices(true)
        setServicesError(null)
        const services = await getAvailableServices(user.fbo_id)
        setAvailableServices(services)
      } catch (error) {
        console.error('Error loading available services:', error)
        setServicesError("Failed to load available services")
      } finally {
        setIsLoadingServices(false)
      }
    }

    loadServices()
  }, [user?.fbo_id])

  const handleAddService = async () => {
    if (!selectedService) return

    const service = availableServices.find(s => s.code === selectedService)
    if (!service) return

    setIsAdding(true)
    try {
      await onAddService(service.code, service.description)
      setSelectedService('') // Reset selection after adding
    } catch (error) {
      console.error('Error adding service:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isReadOnly ? (
          <div className="text-center py-8 text-muted-foreground">
            Additional services cannot be modified after receipt generation
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show error if services failed to load */}
            {servicesError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{servicesError}</AlertDescription>
              </Alert>
            )}

            {/* Show loading or service selection */}
            {isLoadingServices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading available services...</span>
              </div>
            ) : availableServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No additional services are currently available
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="service-select">Select Service</Label>
                  <Select 
                    value={selectedService} 
                    onValueChange={setSelectedService}
                    disabled={isLoading || isAdding}
                  >
                    <SelectTrigger 
                      id="service-select"
                      data-cy="additional-services-dropdown"
                    >
                      <SelectValue placeholder="Choose a service to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map((service) => (
                        <SelectItem 
                          key={service.code} 
                          value={service.code}
                          data-cy="service-option"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{service.description}</span>
                            <span className="text-sm text-muted-foreground ml-4">
                              ${service.price.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddService}
                  disabled={!selectedService || isLoading || isAdding || isLoadingServices}
                  className="w-full"
                  data-cy="add-service-btn"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Service...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Service
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Display selected services */}
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Services</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedServices.map((service) => (
                    <div 
                      key={service.fee_code}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{service.description}</div>
                        <div className="text-xs text-muted-foreground">
                          Code: {service.fee_code} | Qty: {service.quantity} | ${service.price.toFixed(2)}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveService(service.fee_code)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          data-cy="remove-service-btn"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> Additional services will be included in the fee calculation. 
                Some services may be eligible for waivers based on fuel quantity or customer agreements.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 