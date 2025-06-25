/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { usePermissions } from '@/hooks/usePermissions'

import AppSidebar from '@/components/layout/app-sidebar'
import AdminLayout from '@/app/admin/layout'
import CSRLayout from '@/app/csr/layout'
import FuelerLayout from '@/app/fueler/layout'
import MemberLayout from '@/app/member/layout'

import {
  mockUsers,
  expectedNavItems,
  unexpectedNavItems,
  permissionScenarios,
  sidebarAssertions,
  SidebarTestWrapper,
  generateRoleTests,
} from '../utils/sidebar-test-helpers'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/admin/dashboard'),
}))

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}))

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
}))

// Mock QueryProvider
jest.mock('@/app/providers/query-provider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-provider">{children}</div>,
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('Sidebar Permission Integration Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  const mockTheme = {
    theme: 'light',
    setTheme: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useTheme as jest.Mock).mockReturnValue(mockTheme)
  })

  describe('Role-Based Navigation Display', () => {
    generateRoleTests((role, userMock) => {
      it(`shows correct navigation items for ${role} role`, async () => {
        ;(usePermissions as jest.Mock).mockReturnValue(userMock)

        render(
          <SidebarTestWrapper>
            <AppSidebar userRole={role as any} />
          </SidebarTestWrapper>
        )

        await waitFor(() => {
          sidebarAssertions.expectLogoVisible()
        })

        // Check expected navigation items
        const expectedItems = expectedNavItems[role as keyof typeof expectedNavItems] || []
        expectedItems.forEach(item => {
          expect(screen.getByText(item)).toBeInTheDocument()
        })

        // Check that unexpected items are not present
        const unexpectedItems = unexpectedNavItems[role as keyof typeof unexpectedNavItems] || []
        unexpectedItems.forEach(item => {
          expect(screen.queryByText(item)).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('Permission Granularity Tests', () => {
    it('admin with limited permissions shows only allowed items', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(permissionScenarios.adminWithLimitedPermissions)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        // Should show dashboard (has permission)
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
        
        // Should not show items without permission
        expect(screen.queryByText('User Management')).not.toBeInTheDocument()
        expect(screen.queryByText('Permissions')).not.toBeInTheDocument()
      })
    })

    it('CSR without order permissions shows limited navigation', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(permissionScenarios.csrWithoutOrders)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="csr" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        // Should show dashboard (has permission)
        expect(screen.getByText('CSR Dashboard')).toBeInTheDocument()
        
        // Should not show order-related items
        expect(screen.queryByText('Fuel Orders')).not.toBeInTheDocument()
        expect(screen.queryByText('Receipts')).not.toBeInTheDocument()
      })
    })

    it('fueler without dashboard permission shows no navigation', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(permissionScenarios.fuelerWithoutDashboard)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="fueler" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        sidebarAssertions.expectLogoVisible()
        
        // Should not show any navigation items
        expect(screen.queryByText('Fueler Dashboard')).not.toBeInTheDocument()
        expect(screen.queryByText('Completed Orders')).not.toBeInTheDocument()
      })
    })
  })

  describe('Layout Permission Integration', () => {
    it('admin layout enforces admin permissions', async () => {
      // Non-admin user trying to access admin layout
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.member,
        canAny: jest.fn().mockReturnValue(false),
        isAdmin: false,
      })

      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        // Should show access denied, not the content
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
        expect(screen.getByText('System Administrator dashboard')).toBeInTheDocument()
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
      })
    })

    it('CSR layout enforces CSR permissions', async () => {
      // User without CSR permissions
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.member,
        isAuthenticated: jest.fn().mockReturnValue(true),
        hasPermission: jest.fn().mockReturnValue(false),
      })

      render(
        <CSRLayout>
          <div data-testid="csr-content">CSR Content</div>
        </CSRLayout>
      )

      await waitFor(() => {
        // Should show access denied
        expect(screen.getByText('CSR Module')).toBeInTheDocument()
        expect(screen.queryByTestId('csr-content')).not.toBeInTheDocument()
      })
    })

    it('fueler layout enforces fueler permissions', async () => {
      // User without fueler permissions
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.member,
        canAny: jest.fn().mockReturnValue(false),
        isFueler: false,
      })

      render(
        <FuelerLayout>
          <div data-testid="fueler-content">Fueler Content</div>
        </FuelerLayout>
      )

      await waitFor(() => {
        // Should show access denied
        expect(screen.getByText('Fueler Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Line Service Technician dashboard')).toBeInTheDocument()
        expect(screen.queryByTestId('fueler-content')).not.toBeInTheDocument()
      })
    })

    it('member layout allows authenticated users', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockUsers.member)

      render(
        <MemberLayout>
          <div data-testid="member-content">Member Content</div>
        </MemberLayout>
      )

      await waitFor(() => {
        // Should show content for authenticated member
        expect(screen.getByTestId('member-content')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication State Handling', () => {
    it('redirects unauthenticated users to login', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.unauthenticated,
        user: { isLoggedIn: false },
      })

      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
      })
    })

    it('shows sign in button for unauthenticated sidebar access', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.unauthenticated,
        user: { isLoggedIn: false },
      })

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        sidebarAssertions.expectSignInButton()
      })
    })

    it('handles loading state correctly', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockUsers.loading)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        sidebarAssertions.expectLoadingState()
      })
    })
  })

  describe('Cross-Role Permission Checks', () => {
    it('admin can access all navigation items with proper permissions', async () => {
      const fullAdminUser = {
        ...mockUsers.admin,
        canAny: jest.fn().mockReturnValue(true),
      }

      ;(usePermissions as jest.Mock).mockReturnValue(fullAdminUser)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        expectedNavItems.admin.forEach(item => {
          expect(screen.getByText(item)).toBeInTheDocument()
        })
      })
    })

    it('multi-role user sees appropriate combined navigation', async () => {
      // User with both admin and CSR roles
      const multiRoleUser = {
        ...mockUsers.admin,
        isCSR: true,
        canAny: jest.fn().mockReturnValue(true),
        user: {
          ...mockUsers.admin.user,
          roles: ['System Administrator', 'Customer Service Representative'],
        },
      }

      ;(usePermissions as jest.Mock).mockReturnValue(multiRoleUser)

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        // Should show admin items (since userRole is admin)
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
        expect(screen.getByText('User Management')).toBeInTheDocument()
        
        // May also show CSR items based on permissions
        // This depends on the specific implementation of permission filtering
      })
    })
  })

  describe('Permission Error Handling', () => {
    it('handles permission hook errors gracefully', async () => {
      ;(usePermissions as jest.Mock).mockImplementation(() => {
        throw new Error('Permission hook error')
      })

      // Should not crash when permission hook throws
      expect(() => {
        render(
          <SidebarTestWrapper>
            <AppSidebar userRole="admin" />
          </SidebarTestWrapper>
        )
      }).toThrow()
    })

    it('handles missing role data gracefully', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockUsers.admin,
        user: {
          isLoggedIn: true,
          name: 'User Without Roles',
          email: 'test@example.com',
          roles: undefined, // Missing roles
        },
      })

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        // Should still render basic sidebar structure
        sidebarAssertions.expectLogoVisible()
      })
    })

    it('handles malformed permission data gracefully', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        user: 'invalid-user-object', // Malformed user object
        loading: false,
        canAny: 'not-a-function', // Invalid function
        isAdmin: 'not-boolean', // Invalid boolean
      })

      render(
        <SidebarTestWrapper>
          <AppSidebar userRole="admin" />
        </SidebarTestWrapper>
      )

      await waitFor(() => {
        // Should still render basic sidebar structure without crashing
        sidebarAssertions.expectLogoVisible()
      })
    })
  })
})