"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

interface AdditionalServicesFormProps {
  onAddService: (serviceCode: string, description: string) => Promise<void>
  isReadOnly?: boolean
  isLoading?: boolean
}

// Mock available services - in real implementation this would come from FBO config
const availableServices = [
  { code: 'GPU_SERVICE', description: 'GPU Service', price: 50.00 },
  { code: 'LAVATORY_SERVICE', description: 'Lavatory Service', price: 75.00 },
  { code: 'WATER_SERVICE', description: 'Water Service', price: 25.00 },
  { code: 'CATERING_COORDINATION', description: 'Catering Coordination', price: 100.00 },
  { code: 'HANGAR_OVERNIGHT', description: 'Hangar Overnight', price: 200.00 },
  { code: 'TIE_DOWN', description: 'Tie Down', price: 50.00 },
  { code: 'CUSTOMS_HANDLING', description: 'Customs Handling', price: 150.00 },
  { code: 'CREW_CAR', description: 'Crew Car', price: 75.00 },
]

export default function AdditionalServicesForm({ 
  onAddService, 
  isReadOnly = false,
  isLoading = false 
}: AdditionalServicesFormProps) {
  const [selectedService, setSelectedService] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)

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
              disabled={!selectedService || isLoading || isAdding}
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