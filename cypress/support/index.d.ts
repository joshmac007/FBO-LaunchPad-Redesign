/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Login as a specific user type
     * @param userType - 'admin', 'csr', 'fueler', or 'member'
     */
    loginAs(userType: 'admin' | 'csr' | 'fueler' | 'member'): Chainable<void>

    /**
     * Logout current user
     */
    logout(): Chainable<void>

    /**
     * Wait for permissions to load
     */
    waitForPermissions(): Chainable<void>

    /**
     * Check if page access works correctly
     * @param path - URL path to check
     * @param shouldHaveAccess - Whether user should have access
     */
    checkPageAccess(path: string, shouldHaveAccess: boolean): Chainable<void>

    /**
     * Check if navigation link exists
     * @param linkText - Text of the navigation link
     * @param shouldExist - Whether link should exist
     */
    checkNavLink(linkText: string, shouldExist: boolean): Chainable<void>

    /**
     * Check if button exists
     * @param buttonText - Text of the button
     * @param shouldExist - Whether button should exist
     */
    checkButton(buttonText: string, shouldExist: boolean): Chainable<void>

    /**
     * Get current user data from localStorage
     */
    getCurrentUser(): Chainable<any>

    /**
     * Create a test fuel order via API
     * @param status - Desired status of the fuel order (default: 'Completed')
     */
    createTestFuelOrder(status?: string): Chainable<any>

    /**
     * Create a test receipt from a fuel order via API
     * @param fuelOrderId - ID of the fuel order to create receipt from
     */
    createTestReceipt(fuelOrderId: number): Chainable<any>

    /**
     * Get the current auth token from localStorage
     */
    getAuthToken(): Chainable<string | null>

    /**
     * Create fee category via API
     * @param name - Name of the fee category
     * @param fboId - FBO location ID (defaults to 1)
     */
    createFeeCategory(name: string, fboId?: number): Chainable<any>

    /**
     * Create fee rule via API
     * @param feeRuleData - Fee rule configuration
     */
    createFeeRule(feeRuleData: any): Chainable<any>

    /**
     * Update aircraft type waiver minimum via API
     * @param aircraftTypeId - Aircraft type ID
     * @param waivMinGallons - Minimum gallons for waiver
     * @param fboId - FBO location ID (defaults to 1)
     */
    updateAircraftWaiverMinimum(aircraftTypeId: number, waivMinGallons: number, fboId?: number): Chainable<any>

    /**
     * Get aircraft types via API
     * @param fboId - FBO location ID (defaults to 1)
     */
    getAircraftTypes(fboId?: number): Chainable<any>

    /**
     * Create a test fuel order with specific characteristics
     * @param fuelOrderData - Fuel order configuration
     */
    createSpecificFuelOrder(fuelOrderData: any): Chainable<any>

    /**
     * Toggle waiver on a receipt line item via API
     * @param receiptId - Receipt ID
     * @param lineItemId - Line item ID
     * @param fboId - FBO location ID (defaults to 1)
     */
    toggleLineItemWaiver(receiptId: number, lineItemId: number, fboId?: number): Chainable<any>
  }
} 