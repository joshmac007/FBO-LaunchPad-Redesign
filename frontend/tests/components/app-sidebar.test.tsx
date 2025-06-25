/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import AppSidebar from '@/components/layout/app-sidebar'
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar'
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

// Test wrapper component with SidebarProvider and Sidebar
const TestWrapper = ({ children, defaultOpen = true }: { children: React.ReactNode, defaultOpen?: boolean }) => {
  return React.createElement(SidebarProvider, { defaultOpen }, 
    React.createElement(Sidebar, {}, children)
  )
}

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
    can: jest.fn().mockReturnValue(true),
    canAny: jest.fn().mockReturnValue(true), // Admin has all permissions by default
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
    it('renders correct navigation items for admin role', async () => {
      const adminUser = {
        user: {
          isLoggedIn: true,
          name: 'Admin User',
          email: 'admin@test.com',
          roles: ['System Administrator'],
        },
        loading: false,
        can: jest.fn(),
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: true,
        isCSR: false,
        isFueler: false,
        isMember: false,
      }

      ;(usePermissions as jest.Mock).mockReturnValue(adminUser)

      render(
        <TestWrapper>
          <AppSidebar userRole="admin" />
        </TestWrapper>
      )

      // Admin should see Admin Dashboard
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })

      // Admin should also see other dashboards (because System Administrator is in all requiredRoles)
      expect(screen.getByText('CSR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Fueler Dashboard')).toBeInTheDocument() 
      expect(screen.getByText('Member Dashboard')).toBeInTheDocument()
    })

    it('renders correct navigation items for csr role', async () => {
      const csrUser = {
        user: {
          isLoggedIn: true,
          name: 'CSR User',
          email: 'csr@test.com',
          roles: ['Customer Service Representative'],
        },
        loading: false,
        can: jest.fn(),
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: false,
        isCSR: true,
        isFueler: false,
        isMember: false,
        isAuthenticated: jest.fn().mockReturnValue(true),
        hasPermission: jest.fn().mockReturnValue(true),
      }

      ;(usePermissions as jest.Mock).mockReturnValue(csrUser)

      render(
        <TestWrapper>
          <AppSidebar userRole="csr" />
        </TestWrapper>
      )

      // CSR should see CSR Dashboard
      await waitFor(() => {
        expect(screen.getByText('CSR Dashboard')).toBeInTheDocument()
      })

      // CSR should NOT see Admin Dashboard
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Fueler Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Member Dashboard')).not.toBeInTheDocument()
    })

    it('renders correct navigation items for fueler role', async () => {
      const fuelerUser = {
        user: {
          isLoggedIn: true,
          name: 'Fueler User',
          email: 'fueler@test.com',
          roles: ['Line Service Technician'],
        },
        loading: false,
        can: jest.fn(),
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: false,
        isCSR: false,
        isFueler: true,
        isMember: false,
      }

      ;(usePermissions as jest.Mock).mockReturnValue(fuelerUser)

      render(
        <TestWrapper>
          <AppSidebar userRole="fueler" />
        </TestWrapper>
      )

      // Fueler should see Fueler Dashboard
      await waitFor(() => {
        expect(screen.getByText('Fueler Dashboard')).toBeInTheDocument()
      })

      // Fueler should NOT see other dashboards
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('CSR Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Member Dashboard')).not.toBeInTheDocument()
    })

    it('renders correct navigation items for member role', async () => {
      const memberUser = {
        user: {
          isLoggedIn: true,
          name: 'Member User',
          email: 'member@test.com',
          roles: ['Member'],
        },
        loading: false,
        can: jest.fn(),
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: false,
        isCSR: false,
        isFueler: false,
        isMember: true,
      }

      ;(usePermissions as jest.Mock).mockReturnValue(memberUser)

      render(
        <TestWrapper>
          <AppSidebar userRole="member" />
        </TestWrapper>
      )

      // Member should see Member Dashboard
      await waitFor(() => {
        expect(screen.getByText('Member Dashboard')).toBeInTheDocument()
      })

      // Member should NOT see other dashboards
      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('CSR Dashboard')).not.toBeInTheDocument()
      expect(screen.queryByText('Fueler Dashboard')).not.toBeInTheDocument()
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

      // When collapsed, the logo text is conditionally rendered based on state
      // In collapsed state (state === 'collapsed'), the text should not be rendered
      await waitFor(() => {
        // The sidebar should still render without errors
        const sidebar = document.querySelector('[data-sidebar="sidebar"]')
        expect(sidebar).toBeInTheDocument()
      })

      // Logo text should not be present when collapsed
      expect(screen.queryByText('FBO LaunchPad')).not.toBeInTheDocument()
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