import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { vi } from "vitest"
import FuelTruckManagementPage from "../../app/admin/fuel-trucks/page"
import * as fuelTruckService from "../../app/services/fuel-truck-service"
import { toast } from "sonner"

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the fuel truck service
vi.mock("../../app/services/fuel-truck-service", async () => {
  const actual = await vi.importActual("../../app/services/fuel-truck-service")
  return {
    ...actual, // Import actual implementations for types
    getAllFuelTrucks: vi.fn(),
    createFuelTruck: vi.fn(),
    updateFuelTruck: vi.fn(),
    deleteFuelTruck: vi.fn(),
  }
})

const mockFuelTrucks = [
  { id: 1, truck_number: "FT-001", fuel_type: "Jet A", capacity: 5000, current_meter_reading: 2500, is_active: true, created_at: new Date().toISOString() },
  { id: 2, truck_number: "FT-002", fuel_type: "Avgas 100LL", capacity: 3000, current_meter_reading: 1500, is_active: false, created_at: new Date().toISOString() },
]

describe("FuelTruckManagementPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // @ts-ignore
    fuelTruckService.getAllFuelTrucks.mockResolvedValue(mockFuelTrucks)
  })

  // --- Display Tests ---
  test("renders the Fuel Truck Management title", async () => {
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText("Fuel Truck Management")).toBeInTheDocument())
  })

  test("fetches and displays a list of fuel trucks", async () => {
    render(<FuelTruckManagementPage />)
    await waitFor(() => {
      expect(fuelTruckService.getAllFuelTrucks).toHaveBeenCalledTimes(1)
      expect(screen.getByText("FT-001")).toBeInTheDocument()
      expect(screen.getByText("FT-002")).toBeInTheDocument()
    })
  })
  
  test("shows a loading state while fetching", async () => {
    // @ts-ignore
    fuelTruckService.getAllFuelTrucks.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(mockFuelTrucks), 100)))
    render(<FuelTruckManagementPage />)
    expect(screen.getByText(/Loading fuel trucks.../i)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/Loading fuel trucks.../i)).not.toBeInTheDocument())
  })

  test("shows an error message if fetching fails (toast)", async () => {
    // @ts-ignore
    fuelTruckService.getAllFuelTrucks.mockRejectedValueOnce(new Error("Failed to fetch"))
    render(<FuelTruckManagementPage />)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load fuel trucks.")
    })
  })

  // --- Create Fuel Truck Tests ---
  test("opens 'Add New Fuel Truck' dialog and submits form", async () => {
    const newTruckData = { truck_number: "FT-003", fuel_type: "Jet A", capacity: 6000, current_meter_reading: 0 }
    // @ts-ignore
    fuelTruckService.createFuelTruck.mockResolvedValueOnce({ ...newTruckData, id: 3, is_active: true })
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText("Fuel Truck Management")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /Add Fuel Truck/i }))
    await screen.findByRole("dialog", { name: /Add New Fuel Truck/i})

    fireEvent.change(screen.getByLabelText(/Truck Number/i), { target: { value: newTruckData.truck_number } })
    // Assuming Select for fuel_type, testing its change might be more complex or rely on data-testid
    // For simplicity, we'll assume default or that service handles it if not changed.
    fireEvent.change(screen.getByLabelText(/Capacity \(Gallons\)/i), { target: { value: newTruckData.capacity.toString() } })
    fireEvent.change(screen.getByLabelText(/Current Meter Reading/i), { target: { value: newTruckData.current_meter_reading.toString() } })

    fireEvent.click(screen.getByRole("button", { name: /Create Truck/i }))

    await waitFor(() => {
      expect(fuelTruckService.createFuelTruck).toHaveBeenCalledWith(newTruckData)
      expect(toast.success).toHaveBeenCalledWith("Fuel truck created successfully!")
      expect(fuelTruckService.getAllFuelTrucks).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })
  
  test("shows an error in create dialog if createFuelTruck fails", async () => {
    const errorMessage = "Truck number already exists"
    // @ts-ignore
    fuelTruckService.createFuelTruck.mockRejectedValueOnce(new Error(errorMessage))
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText("Fuel Truck Management")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /Add Fuel Truck/i }))
    await screen.findByRole("dialog", {name: /Add New Fuel Truck/i})

    fireEvent.change(screen.getByLabelText(/Truck Number/i), { target: { value: "FT-DUP" } })
    fireEvent.change(screen.getByLabelText(/Capacity \(Gallons\)/i), { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: /Create Truck/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument() // Error displayed in form
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  // --- Edit Fuel Truck Tests ---
  test("opens 'Edit Fuel Truck' dialog, pre-fills, and submits form", async () => {
    const truckToEdit = mockFuelTrucks[0]
    const updatedTruckData = { ...truckToEdit, capacity: 5500, is_active: false }
    // @ts-ignore
    fuelTruckService.updateFuelTruck.mockResolvedValueOnce(updatedTruckData)
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText(truckToEdit.truck_number)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit/i }))
    
    await screen.findByRole("dialog", { name: /Edit Fuel Truck/i })
    expect(screen.getByLabelText(/Truck Number/i)).toHaveValue(truckToEdit.truck_number)
    expect(screen.getByLabelText(/Capacity \(Gallons\)/i)).toHaveValue(truckToEdit.capacity)
    // is_active Switch needs specific handling to check its state
    // For now, we'll focus on changing a text field and submitting
    
    fireEvent.change(screen.getByLabelText(/Capacity \(Gallons\)/i), { target: { value: "5500" } })
    // To test the Switch, you might need to find it by its role 'switch' and check 'aria-checked'
    // fireEvent.click(screen.getByRole('switch', { name: /Status/i })); // This might not work directly with shadcn Switch

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }))

    await waitFor(() => {
      expect(fuelTruckService.updateFuelTruck).toHaveBeenCalledWith(truckToEdit.id, 
        expect.objectContaining({ capacity: 5500 }) // Check part of the payload
      )
      expect(toast.success).toHaveBeenCalledWith("Fuel truck updated successfully!")
      expect(fuelTruckService.getAllFuelTrucks).toHaveBeenCalledTimes(2)
    })
  })

  test("shows an error in edit dialog if updateFuelTruck fails", async () => {
    const truckToEdit = mockFuelTrucks[0]
    const errorMessage = "Update failed due to conflict"
    // @ts-ignore
    fuelTruckService.updateFuelTruck.mockRejectedValueOnce(new Error(errorMessage))
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText(truckToEdit.truck_number)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit/i }))
    
    await screen.findByRole("dialog", { name: /Edit Fuel Truck/i })
    fireEvent.change(screen.getByLabelText(/Capacity \(Gallons\)/i), { target: { value: "1234" } })
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  // --- Delete Fuel Truck Tests ---
  test("opens delete confirmation and calls deleteFuelTruck", async () => {
    const truckToDelete = mockFuelTrucks[0]
    // @ts-ignore
    fuelTruckService.deleteFuelTruck.mockResolvedValueOnce({ message: "Fuel truck deleted" })
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText(truckToDelete.truck_number)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }))

    await screen.findByRole("dialog", { name: /Confirm Delete/i })
    expect(screen.getByText(`Are you sure you want to delete truck ${truckToDelete.truck_number}? This action cannot be undone.`)).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }))

    await waitFor(() => {
      expect(fuelTruckService.deleteFuelTruck).toHaveBeenCalledWith(truckToDelete.id)
      expect(toast.success).toHaveBeenCalledWith("Fuel truck deleted successfully!")
      expect(fuelTruckService.getAllFuelTrucks).toHaveBeenCalledTimes(2)
    })
  })

  test("shows an error in delete dialog if deleteFuelTruck fails (e.g., conflict)", async () => {
    const truckToDelete = mockFuelTrucks[0]
    const specificErrorMessage = "Cannot delete truck. It may have associated records or operations."
    // @ts-ignore
    fuelTruckService.deleteFuelTruck.mockRejectedValueOnce(new Error("API error (409): Conflict, truck has active orders"))
    render(<FuelTruckManagementPage />)
    await waitFor(() => expect(screen.getByText(truckToDelete.truck_number)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }))

    await screen.findByRole("dialog", { name: /Confirm Delete/i })
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }))

    await waitFor(() => {
      expect(screen.getByText(specificErrorMessage)).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith(specificErrorMessage)
    })
  })
})
