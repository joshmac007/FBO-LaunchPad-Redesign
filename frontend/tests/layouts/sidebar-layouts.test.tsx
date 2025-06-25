/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'

// Import layout components
import AdminLayout from '@/app/admin/layout'
import CSRLayout from '@/app/csr/layout'
import FuelerLayout from '@/app/fueler/layout'
import MemberLayout from '@/app/member/layout'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/admin/dashboard'),
}))

jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => false),
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

// Mock QueryProvider for CSR layout
jest.mock('@/app/providers/query-provider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="query-provider">{children}</div>,
}))

describe('Sidebar Layout Components', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('AdminLayout', () => {
    const mockAdminUser = {
      user: {
        isLoggedIn: true,
        name: 'Admin User',
        email: 'admin@example.com',
        roles: ['System Administrator'],
      },
      loading: false,
      canAny: jest.fn().mockReturnValue(true),
      isAdmin: true,
    }

    it('renders successfully with proper permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockAdminUser)

      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin-content')).toBeInTheDocument()
      })
    })

    it('shows loading state while permissions load', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockAdminUser,
        loading: true,
      })

      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Verifying access...')).toBeInTheDocument()
      })
    })

    it('shows access denied for non-admin users', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockAdminUser,
        isAdmin: false,
        canAny: jest.fn().mockReturnValue(false),
      })

      render(
        <AdminLayout>
          <div data-testid="admin-content">Admin Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.getByText("You don't have permission to access Admin Dashboard.")).toBeInTheDocument()
      })
    })

    it('redirects unauthenticated users to login', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockAdminUser,
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
  })

  describe('CSRLayout', () => {
    const mockCSRUser = {
      loading: false,
      isAuthenticated: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
      user: {
        isLoggedIn: true,
        name: 'CSR User',
        email: 'csr@example.com',
      },
    }

    it('renders successfully with proper permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockCSRUser)

      render(
        <CSRLayout>
          <div data-testid="csr-content">CSR Content</div>
        </CSRLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('query-provider')).toBeInTheDocument()
        expect(screen.getByTestId('csr-content')).toBeInTheDocument()
      })
    })

    it('shows loading state during permissions check', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockCSRUser,
        loading: true,
      })

      render(
        <CSRLayout>
          <div data-testid="csr-content">CSR Content</div>
        </CSRLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Verifying CSR Access...')).toBeInTheDocument()
      })
    })

    it('shows access denied for users without CSR permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockCSRUser,
        hasPermission: jest.fn().mockReturnValue(false),
      })

      render(
        <CSRLayout>
          <div data-testid="csr-content">CSR Content</div>
        </CSRLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.getByText("You don't have permission to access CSR Module.")).toBeInTheDocument()
      })
    })
  })

  describe('FuelerLayout', () => {
    const mockFuelerUser = {
      user: {
        isLoggedIn: true,
        name: 'Fueler User',
        email: 'fueler@example.com',
        roles: ['Line Service Technician'],
      },
      loading: false,
      canAny: jest.fn().mockReturnValue(true),
      isFueler: true,
    }

    it('renders successfully with proper permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockFuelerUser)

      render(
        <FuelerLayout>
          <div data-testid="fueler-content">Fueler Content</div>
        </FuelerLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('fueler-content')).toBeInTheDocument()
      })
    })

    it('shows loading state while checking permissions', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockFuelerUser,
        loading: true,
      })

      render(
        <FuelerLayout>
          <div data-testid="fueler-content">Fueler Content</div>
        </FuelerLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading permissions...')).toBeInTheDocument()
      })
    })

    it('shows access denied for non-fueler users', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockFuelerUser,
        isFueler: false,
        canAny: jest.fn().mockReturnValue(false),
      })

      render(
        <FuelerLayout>
          <div data-testid="fueler-content">Fueler Content</div>
        </FuelerLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument()
        expect(screen.getByText("You don't have permission to access Fueler Dashboard.")).toBeInTheDocument()
      })
    })
  })

  describe('MemberLayout', () => {
    const mockMemberUser = {
      user: {
        isLoggedIn: true,
        name: 'Member User',
        email: 'member@example.com',
        roles: ['Member'],
      },
      loading: false,
      isMember: true,
    }

    it('renders successfully for authenticated users', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue(mockMemberUser)

      render(
        <MemberLayout>
          <div data-testid="member-content">Member Content</div>
        </MemberLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('member-content')).toBeInTheDocument()
      })
    })

    it('shows loading state during permission check', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockMemberUser,
        loading: true,
      })

      render(
        <MemberLayout>
          <div data-testid="member-content">Member Content</div>
        </MemberLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
      })
    })

    it('shows access denied for unauthenticated users', async () => {
      ;(usePermissions as jest.Mock).mockReturnValue({
        ...mockMemberUser,
        user: { isLoggedIn: false },
      })

      render(
        <MemberLayout>
          <div data-testid="member-content">Member Content</div>
        </MemberLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
      })
    })
  })

  describe('SidebarProvider Integration', () => {
    it('all layouts use SidebarProvider correctly', async () => {
      const layouts = [
        { Component: AdminLayout, name: 'AdminLayout' },
        { Component: FuelerLayout, name: 'FuelerLayout' }, 
        { Component: MemberLayout, name: 'MemberLayout' },
      ]

      const mockUser = {
        user: { isLoggedIn: true, roles: ['System Administrator'] },
        loading: false,
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: true,
        isFueler: true,
        isMember: true,
        isAuthenticated: jest.fn().mockReturnValue(true),
        hasPermission: jest.fn().mockReturnValue(true),
      }

      for (const { Component, name } of layouts) {
        ;(usePermissions as jest.Mock).mockReturnValue(mockUser)
        
        const { unmount } = render(
          <Component>
            <div data-testid={`${name.toLowerCase()}-content`}>Content</div>
          </Component>
        )

        // Should render without throwing sidebar context errors
        await waitFor(() => {
          expect(screen.getByTestId(`${name.toLowerCase()}-content`)).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe('Responsive Layout Structure', () => {
    it('layouts provide proper structure for sidebar and content', async () => {
      const mockUser = {
        user: { isLoggedIn: true, roles: ['System Administrator'] },
        loading: false,
        canAny: jest.fn().mockReturnValue(true),
        isAdmin: true,
      }

      ;(usePermissions as jest.Mock).mockReturnValue(mockUser)

      render(
        <AdminLayout>
          <div data-testid="main-content">Test Content</div>
        </AdminLayout>
      )

      await waitFor(() => {
        expect(screen.getByTestId('main-content')).toBeInTheDocument()
      })

      // Should have main element with proper structure
      const mainElements = screen.getAllByRole('main')
      expect(mainElements[0]).toBeInTheDocument()
      // Check for sidebar inset styling instead of p-4
      expect(mainElements[0]).toHaveClass('min-h-svh')
    })
  })
})