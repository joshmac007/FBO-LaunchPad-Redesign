import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { vi } from "vitest"
import CustomerManagementPage from "../../app/admin/customers/page"
import * as customerService from "../../app/services/customer-service"
import { toast } from "sonner" // Mock sonner if its calls are part of the tested logic

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock the customer service
vi.mock("../../app/services/customer-service", async () => {
  const actual = await vi.importActual("../../app/services/customer-service")
  return {
    ...actual, // Import actual implementations for types if needed
    getAllAdminCustomers: vi.fn(),
    createAdminCustomer: vi.fn(),
    updateAdminCustomer: vi.fn(),
    deleteAdminCustomer: vi.fn(),
  }
})

const mockCustomers = [
  { id: 1, name: "Alice Wonderland", email: "alice@example.com", phone: "123-456-7890", created_at: new Date().toISOString() },
  { id: 2, name: "Bob The Builder", email: "bob@example.com", phone: "987-654-3210", created_at: new Date().toISOString() },
]

describe("CustomerManagementPage", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks()
    // @ts-ignore
    customerService.getAllAdminCustomers.mockResolvedValue(mockCustomers)
  })

  // --- Display Tests ---
  test("renders the Customer Management title", async () => {
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText("Customer Management")).toBeInTheDocument())
  })

  test("fetches and displays a list of customers", async () => {
    render(<CustomerManagementPage />)
    await waitFor(() => {
      expect(customerService.getAllAdminCustomers).toHaveBeenCalledTimes(1)
      expect(screen.getByText("Alice Wonderland")).toBeInTheDocument()
      expect(screen.getByText("Bob The Builder")).toBeInTheDocument()
    })
  })

  test("shows a loading state while fetching", async () => {
    // @ts-ignore
    customerService.getAllAdminCustomers.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(mockCustomers), 100)))
    render(<CustomerManagementPage />)
    expect(screen.getByText(/Loading customers.../i)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/Loading customers.../i)).not.toBeInTheDocument())
  })

  test("shows an error message if fetching fails", async () => {
    // @ts-ignore
    customerService.getAllAdminCustomers.mockRejectedValueOnce(new Error("Failed to fetch"))
    render(<CustomerManagementPage />)
    await waitFor(() => {
      expect(screen.getByText("Failed to fetch customers.")).toBeInTheDocument()
    })
  })

  test("shows a 'no customers found' message if service returns empty list", async () => {
    // @ts-ignore
    customerService.getAllAdminCustomers.mockResolvedValueOnce([])
    render(<CustomerManagementPage />)
    await waitFor(() => {
      expect(screen.getByText("No customers found.")).toBeInTheDocument()
    })
  })

  // --- Create Customer Tests ---
  test("opens 'Add New Customer' dialog and submits form", async () => {
    // @ts-ignore
    customerService.createAdminCustomer.mockResolvedValueOnce(mockCustomers[0]) // Mock successful creation
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText("Customer Management")).toBeInTheDocument()) // Ensure page is loaded

    fireEvent.click(screen.getByRole("button", { name: /Add Customer/i }))
    await screen.findByRole("dialog", {name: /Add New Customer/i}) // Wait for dialog

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "New Customer" } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "new@example.com" } })
    fireEvent.change(screen.getByLabelText(/Phone/i), { target: { value: "555-0101" } })

    fireEvent.click(screen.getByRole("button", { name: /Create Customer/i }))

    await waitFor(() => {
      expect(customerService.createAdminCustomer).toHaveBeenCalledWith({
        name: "New Customer",
        email: "new@example.com",
        phone: "555-0101",
      })
      expect(toast.success).toHaveBeenCalledWith("Customer created successfully!")
      expect(customerService.getAllAdminCustomers).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })
  
  test("shows an error in create dialog if createAdminCustomer fails", async () => {
    const errorMessage = "Email already exists"
    // @ts-ignore
    customerService.createAdminCustomer.mockRejectedValueOnce(new Error(errorMessage))
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText("Customer Management")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /Add Customer/i }))
    await screen.findByRole("dialog", {name: /Add New Customer/i})

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Test User" } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "test@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /Create Customer/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  // --- Edit Customer Tests ---
  test("opens 'Edit Customer' dialog, pre-fills, and submits form", async () => {
    const customerToEdit = mockCustomers[0]
    // @ts-ignore
    customerService.updateAdminCustomer.mockResolvedValueOnce({ ...customerToEdit, name: "Alice Updated" })
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText(customerToEdit.name)).toBeInTheDocument())

    // Find the dropdown menu for the first customer and click Edit
    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit/i }))
    
    await screen.findByRole("dialog", { name: /Edit Customer/i })
    expect(screen.getByLabelText(/Name/i)).toHaveValue(customerToEdit.name)
    expect(screen.getByLabelText(/Email/i)).toHaveValue(customerToEdit.email)

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Alice Updated" } })
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }))

    await waitFor(() => {
      expect(customerService.updateAdminCustomer).toHaveBeenCalledWith(customerToEdit.id, {
        name: "Alice Updated",
        email: customerToEdit.email,
        phone: customerToEdit.phone,
      })
      expect(toast.success).toHaveBeenCalledWith("Customer updated successfully!")
      expect(customerService.getAllAdminCustomers).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })

  test("shows an error in edit dialog if updateAdminCustomer fails", async () => {
    const customerToEdit = mockCustomers[0]
    const errorMessage = "Update failed"
    // @ts-ignore
    customerService.updateAdminCustomer.mockRejectedValueOnce(new Error(errorMessage))
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText(customerToEdit.name)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit/i }))
    
    await screen.findByRole("dialog", { name: /Edit Customer/i })
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Attempted Update" } })
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith(errorMessage)
    })
  })

  // --- Delete Customer Tests ---
  test("opens delete confirmation and calls deleteAdminCustomer", async () => {
    const customerToDelete = mockCustomers[0]
    // @ts-ignore
    customerService.deleteAdminCustomer.mockResolvedValueOnce({ message: "Customer deleted" })
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText(customerToDelete.name)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }))

    await screen.findByRole("dialog", { name: /Confirm Deletion/i })
    expect(screen.getByText(`Are you sure you want to delete customer "${customerToDelete.name}"? This action cannot be undone.`)).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole("button", { name: /Delete Customer/i }))

    await waitFor(() => {
      expect(customerService.deleteAdminCustomer).toHaveBeenCalledWith(customerToDelete.id)
      expect(toast.success).toHaveBeenCalledWith("Customer deleted successfully.")
      expect(customerService.getAllAdminCustomers).toHaveBeenCalledTimes(2) // Initial + refresh
    })
  })

  test("shows an error in delete dialog if deleteAdminCustomer fails (e.g., conflict)", async () => {
    const customerToDelete = mockCustomers[0]
    const errorMessage = "This customer cannot be deleted as they are referenced by other records (e.g., aircraft)."
    // @ts-ignore
    customerService.deleteAdminCustomer.mockRejectedValueOnce(new Error("API error (409): Conflict")) // Simulate 409
    render(<CustomerManagementPage />)
    await waitFor(() => expect(screen.getByText(customerToDelete.name)).toBeInTheDocument())

    const firstRowActionsButton = screen.getAllByRole("button", { name: /Open menu/i })[0]
    fireEvent.click(firstRowActionsButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete/i }))

    await screen.findByRole("dialog", { name: /Confirm Deletion/i })
    fireEvent.click(screen.getByRole("button", { name: /Delete Customer/i }))

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(toast.error).toHaveBeenCalledWith("Deletion failed: Customer is in use.")
    })
  })
})
