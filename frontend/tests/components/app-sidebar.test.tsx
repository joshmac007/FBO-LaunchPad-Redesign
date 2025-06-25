/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/usePermissions'

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

// Mock window.localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Test wrapper component with SidebarProvider
const TestWrapper = ({ children, defaultOpen = true }: { children: React.ReactNode, defaultOpen?: boolean }) => (
  <SidebarProvider defaultOpen={defaultOpen}>
    {children}
  </SidebarProvider>
)

describe('AppSidebar Component', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/admin/dashboard',
  }

  const mockTheme = {
    theme: 'light',
    setTheme: jest.fn(),
  }

  const mockPermissions = {
    user: {
      isLoggedIn: true,
      name: 'Test User',
      email: 'test@example.com',
      roles: ['System Administrator'],
    },
    can: jest.fn(),
    canAny: jest.fn(),
    isAdmin: true,
    isCSR: false,
    isFueler: false,
    isMember: false,
    loading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useTheme as jest.Mock).mockReturnValue(mockTheme)
    ;(usePermissions as jest.Mock).mockReturnValue(mockPermissions)
    
    // Mock usePathname
    jest.doMock('next/navigation', () => ({
      ...jest.requireActual('next/navigation'),
      usePathname: () => '/admin/dashboard',
    }))
  })

  describe('Rendering and Basic Functionality', () => {
    it('renders the sidebar with logo and main navigation', async () => {
      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Check for logo
      expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
      
      // Check for main navigation items (admin should see admin items)
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
    })

    it('renders user information in footer', async () => {
      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('Admin')).toBeInTheDocument()
      })
    })

    it('shows theme toggle button', async () => {
      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Dark Mode')).toBeInTheDocument()
      })
    })
  })

  describe('Role-Based Navigation', () => {
    const testRoles = [
      {
        role: 'admin',
        permissions: { isAdmin: true, isCSR: false, isFueler: false, isMember: false },
        expectedItems: ['Admin Dashboard', 'User Management', 'Permissions'],
        notExpectedItems: ['CSR Dashboard', 'Fueler Dashboard', 'Member Dashboard'],
      },
      {
        role: 'csr',
        permissions: { isAdmin: false, isCSR: true, isFueler: false, isMember: false },
        expectedItems: ['CSR Dashboard', 'Fuel Orders', 'Receipts'],
        notExpectedItems: ['Admin Dashboard', 'User Management', 'Fueler Dashboard'],
      },
      {
        role: 'fueler',
        permissions: { isAdmin: false, isCSR: false, isFueler: true, isMember: false },
        expectedItems: ['Fueler Dashboard', 'Completed Orders'],
        notExpectedItems: ['Admin Dashboard', 'CSR Dashboard', 'User Management'],
      },
      {
        role: 'member',
        permissions: { isAdmin: false, isCSR: false, isFueler: false, isMember: true },
        expectedItems: ['Member Dashboard'],
        notExpectedItems: ['Admin Dashboard', 'CSR Dashboard', 'Fueler Dashboard'],
      },
    ]

    testRoles.forEach(({ role, permissions, expectedItems, notExpectedItems }) => {
      it(`renders correct navigation items for ${role} role`, async () => {
        ;(usePermissions as jest.Mock).mockReturnValue({
          ...mockPermissions,
          ...permissions,
          canAny: jest.fn().mockReturnValue(true), // Allow access for testing
        })

        render(
          <TestWrapper>
            <AppSidebar userRole={role as any} />
          </TestWrapper>
        )

        // Check expected items are present
        for (const item of expectedItems) {
          await waitFor(() => {
            expect(screen.getByText(item)).toBeInTheDocument()
          })
        }

        // Check unexpected items are not present
        for (const item of notExpectedItems) {
          expect(screen.queryByText(item)).not.toBeInTheDocument()
        }
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('shows full logo and text when expanded', async () => {
      render(
        <TestWrapper defaultOpen={true}>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
    })

    it('handles collapsed state properly', async () => {
      render(
        <TestWrapper defaultOpen={false}>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Logo text should still be present but may be hidden via CSS
      // The important thing is that the component renders without errors
      await waitFor(() => {
        expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
      })
    })
  })

  describe('Interactive Elements', () => {
    it('handles theme toggle click', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      const themeToggle = await screen.findByText('Dark Mode')
      await user.click(themeToggle)

      expect(mockTheme.setTheme).toHaveBeenCalledWith('dark')
    })

    it('handles navigation link clicks', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      const dashboardLink = await screen.findByText('Admin Dashboard')
      await user.click(dashboardLink)

      // Link should be rendered correctly (navigation is handled by Next.js)
      expect(dashboardLink.closest('a')).toHaveAttribute('href', '/admin/dashboard')
    })

    it('handles logout functionality', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Open user dropdown
      const userButton = await screen.findByText('Test User')
      await user.click(userButton)

      // Click logout
      const logoutButton = await screen.findByText('Log out')
      await user.click(logoutButton)

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fboUser')
      expect(mockRouter.push).toHaveBeenCalledWith('/login')
    })
  })

  describe('Permission-Based Access Control', () => {
    it('shows loading state when permissions are loading', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockPermissions,
        loading: true,
      })

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading permissions...')).toBeInTheDocument()
      })
    })

    it('filters navigation items based on permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockPermissions,
        canAny: jest.fn().mockImplementation((permissions) => {
          // Only allow access to basic dashboard
          return permissions.includes('access_admin_dashboard')
        }),
      })

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })

      // Should not show items user doesn't have permission for
      expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    })

    it('shows sign in button when user is not logged in', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockPermissions,
        user: { isLoggedIn: false },
      })

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing user data gracefully', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockPermissions,
        user: null,
      })

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Should render without crashing
      await waitFor(() => {
        expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
      })
    })

    it('handles localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Should render without crashing
      await waitFor(() => {
        expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
      })
    })
  })
})