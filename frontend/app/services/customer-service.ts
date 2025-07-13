import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "./api-config"

// --- Core Interfaces ---

export interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  company_name?: string
  phone_number?: string
  address?: string
  payment_type?: string
  poc_role?: string
  is_placeholder?: boolean
  is_caa_member?: boolean
  caa_member_id?: string
  created_at?: string
  updated_at?: string
}

interface BackendCustomer {
  id: number
  name: string
  email: string
  phone?: string
  company_name?: string
  phone_number?: string
  address?: string
  payment_type?: string
  poc_role?: string
  is_placeholder?: boolean
  is_caa_member?: boolean
  caa_member_id?: string
  created_at?: string
  updated_at?: string
}

export interface AdminCustomerCreateRequest {
  name: string
  email: string
  phone?: string
  company_name?: string
  phone_number?: string
  address?: string
  payment_type?: string
  poc_role?: string
}

export interface AdminCustomerUpdateRequest {
  name?: string
  email?: string
  phone?: string
  company_name?: string
  phone_number?: string
  address?: string
  payment_type?: string
  poc_role?: string
}

// Expected response type for list
interface AdminCustomerListResponse {
  customers: BackendCustomer[]
  message: string
  // Add other pagination/metadata fields if backend provides them
}

// Expected response type for a single customer.
// Assuming backend might wrap it in a 'customer' key or return directly.
// For flexibility, handleApiResponse<BackendCustomer> or handleApiResponse<{customer: BackendCustomer}>
// can be used. Let's assume it might be wrapped for now.
interface AdminCustomerDetailResponse {
  customer: BackendCustomer
  message?: string // Optional message for single detail
}

// --- Data Mapping Helper Function ---

function mapBackendToFrontendCustomer(backend: BackendCustomer): Customer {
  return {
    id: backend.id,
    name: backend.name,
    email: backend.email,
    phone: backend.phone,
    company_name: backend.company_name,
    phone_number: backend.phone_number,
    address: backend.address,
    payment_type: backend.payment_type,
    poc_role: backend.poc_role,
    is_placeholder: backend.is_placeholder,
    is_caa_member: backend.is_caa_member,
    caa_member_id: backend.caa_member_id,
    created_at: backend.created_at,
    updated_at: backend.updated_at,
  }
}

// --- Admin Customer CRUD Functions ---

export async function getAllAdminCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/`, {
    method: "GET",
    headers: getAuthHeaders(),
  })
  const data = await handleApiResponse<AdminCustomerListResponse>(response)
  return data.customers.map(mapBackendToFrontendCustomer)
}

export async function getAdminCustomerById(customerId: number): Promise<Customer | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    })
    // Assuming the backend returns the customer object directly or wrapped,
    // handleApiResponse should manage this. If it's not wrapped, BackendCustomer is fine.
    // If wrapped, e.g. { customer: {...} }, then use AdminCustomerDetailResponse.
    // Let's assume it might be wrapped as per the interface defined.
    const data = await handleApiResponse<AdminCustomerDetailResponse | BackendCustomer>(response)

    if ("customer" in data) {
      return mapBackendToFrontendCustomer(data.customer)
    }
    return mapBackendToFrontendCustomer(data as BackendCustomer) // Cast if not wrapped
  } catch (error) {
    if (error instanceof Error && error.message.includes("API error (404)")) {
      return null
    }
    throw error
  }
}

export async function createAdminCustomer(customerData: AdminCustomerCreateRequest): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/`, {
    method: "POST",
    headers: getAuthHeaders(), // getAuthHeaders from api-config should set Content-Type
    body: JSON.stringify(customerData),
  })
  // Assuming response is { customer: BackendCustomer, message: string } or just BackendCustomer
  const data = await handleApiResponse<AdminCustomerDetailResponse | BackendCustomer>(response)
  if ("customer" in data) {
    return mapBackendToFrontendCustomer(data.customer)
  }
  return mapBackendToFrontendCustomer(data as BackendCustomer)
}

export async function updateAdminCustomer(
  customerId: number,
  customerData: AdminCustomerUpdateRequest,
): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(customerData),
  })
  const data = await handleApiResponse<AdminCustomerDetailResponse | BackendCustomer>(response)
  if ("customer" in data) {
    return mapBackendToFrontendCustomer(data.customer)
  }
  return mapBackendToFrontendCustomer(data as BackendCustomer)
}

export async function deleteAdminCustomer(customerId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/${customerId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  // handleApiResponse should ideally handle 204 No Content.
  // If it expects JSON, this might need adjustment in handleApiResponse or a specific check here.
  await handleApiResponse<unknown>(response) // Expecting no JSON content for a successful DELETE
}
