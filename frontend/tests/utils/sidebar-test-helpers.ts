/**
 * Test utilities and helpers for sidebar testing
 */

import { render, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'

// Mock user types for testing
export const mockUsers = {
  admin: {
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
  },
  csr: {
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
  },
  fueler: {
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
  },
  member: {
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
  },
  unauthenticated: {
    user: null,
    loading: false,
    can: jest.fn().mockReturnValue(false),
    canAny: jest.fn().mockReturnValue(false),
    isAdmin: false,
    isCSR: false,
    isFueler: false,
    isMember: false,
  },
  loading: {
    user: null,
    loading: true,
    can: jest.fn(),
    canAny: jest.fn(),
    isAdmin: false,
    isCSR: false,
    isFueler: false,
    isMember: false,
  },
}

// Test wrapper with SidebarProvider
export const SidebarTestWrapper = ({ 
  children, 
  defaultOpen = true 
}: { 
  children: React.ReactNode
  defaultOpen?: boolean 
}) => (
  <SidebarProvider defaultOpen={defaultOpen}>
    {children}
  </SidebarProvider>
)

// Helper to render components with sidebar context
export const renderWithSidebar = (
  ui: ReactElement,
  options: { defaultOpen?: boolean } = {}
) => {
  return render(
    <SidebarTestWrapper defaultOpen={options.defaultOpen}>
      {ui}
    </SidebarTestWrapper>
  )
}

// Navigation item expectations by role
export const expectedNavItems = {
  admin: [
    'Admin Dashboard',
    'User Management',
    'LST Management',
    'Permissions',
    'Fuel Trucks',
    'Customer Management',
    'Aircraft Management',
    'Fee Management',
  ],
  csr: [
    'CSR Dashboard',
    'Fuel Orders',
    'Receipts',
    'Export Data',
  ],
  fueler: [
    'Fueler Dashboard',
    'Completed Orders',
  ],
  member: [
    'Member Dashboard',
  ],
}

// Items that should NOT appear for each role
export const unexpectedNavItems = {
  admin: [
    'CSR Dashboard',
    'Fueler Dashboard',
    'Member Dashboard',
  ],
  csr: [
    'Admin Dashboard',
    'User Management',
    'Permissions',
    'Fueler Dashboard',
    'Member Dashboard',
  ],
  fueler: [
    'Admin Dashboard',
    'User Management',
    'CSR Dashboard',
    'Member Dashboard',
  ],
  member: [
    'Admin Dashboard',
    'User Management',
    'CSR Dashboard',
    'Fueler Dashboard',
  ],
}

// Permission test scenarios
export const permissionScenarios = {
  adminWithLimitedPermissions: {
    ...mockUsers.admin,
    canAny: jest.fn().mockImplementation((permissions) => {
      // Only allow dashboard access
      return permissions.includes('access_admin_dashboard')
    }),
  },
  csrWithoutOrders: {
    ...mockUsers.csr,
    hasPermission: jest.fn().mockImplementation((permission) => {
      // CSR without order permissions
      return permission === 'access_csr_dashboard'
    }),
  },
  fuelerWithoutDashboard: {
    ...mockUsers.fueler,
    canAny: jest.fn().mockReturnValue(false),
  },
}

// Common test assertions
export const sidebarAssertions = {
  expectLogoVisible: () => {
    expect(screen.getByText('FBO LaunchPad')).toBeInTheDocument()
  },
  
  expectUserInfo: (name: string, role: string) => {
    expect(screen.getByText(name)).toBeInTheDocument()
    expect(screen.getByText(role)).toBeInTheDocument()
  },
  
  expectThemeToggle: () => {
    expect(screen.getByText('Dark Mode')).toBeInTheDocument()
  },
  
  expectNavItems: (items: string[]) => {
    items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  },
  
  expectNoNavItems: (items: string[]) => {
    items.forEach(item => {
      expect(screen.queryByText(item)).not.toBeInTheDocument()
    })
  },
  
  expectLoadingState: () => {
    expect(screen.getByText('Loading permissions...')).toBeInTheDocument()
  },
  
  expectAccessDenied: (pageName: string) => {
    expect(screen.getByText(pageName)).toBeInTheDocument()
  },
  
  expectSignInButton: () => {
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  },
}

// Viewport configurations for responsive testing
export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  wide: { width: 1920, height: 1080 },
}

// Mock theme configurations
export const mockThemes = {
  light: {
    theme: 'light',
    setTheme: jest.fn(),
  },
  dark: {
    theme: 'dark',
    setTheme: jest.fn(),
  },
}

// Mock router configurations
export const mockRouters = {
  admin: {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/admin/dashboard',
  },
  csr: {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/csr/dashboard',
  },
  fueler: {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/fueler/dashboard',
  },
  member: {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/member/dashboard',
  },
}

// Helper to setup common mocks
export const setupMocks = (role: keyof typeof mockUsers, theme = 'light') => {
  const useRouter = jest.fn().mockReturnValue(mockRouters[role as keyof typeof mockRouters] || mockRouters.admin)
  const usePermissions = jest.fn().mockReturnValue(mockUsers[role])
  const useTheme = jest.fn().mockReturnValue(mockThemes[theme as keyof typeof mockThemes])
  const usePathname = jest.fn().mockReturnValue(mockRouters[role as keyof typeof mockRouters]?.pathname || '/')
  
  return {
    useRouter,
    usePermissions,
    useTheme,
    usePathname,
  }
}

// Test case generator for role-based testing
export const generateRoleTests = (testFn: (role: string, userMock: any) => void) => {
  Object.entries(mockUsers).forEach(([role, userMock]) => {
    if (role !== 'unauthenticated' && role !== 'loading') {
      testFn(role, userMock)
    }
  })
}

// Helper to simulate user interactions
export const userInteractions = {
  clickSidebarToggle: async (user: any) => {
    const toggleButton = screen.getByLabelText(/toggle sidebar/i)
    await user.click(toggleButton)
  },
  
  clickNavItem: async (user: any, itemName: string) => {
    const navItem = screen.getByText(itemName)
    await user.click(navItem)
  },
  
  clickThemeToggle: async (user: any) => {
    const themeToggle = screen.getByText(/mode/i)
    await user.click(themeToggle)
  },
  
  openUserDropdown: async (user: any) => {
    const userButton = screen.getByText(/user/i)
    await user.click(userButton)
  },
  
  clickLogout: async (user: any) => {
    const logoutButton = screen.getByText('Log out')
    await user.click(logoutButton)
  },
}

export default {
  mockUsers,
  SidebarTestWrapper,
  renderWithSidebar,
  expectedNavItems,
  unexpectedNavItems,
  permissionScenarios,
  sidebarAssertions,
  viewports,
  mockThemes,
  mockRouters,
  setupMocks,
  generateRoleTests,
  userInteractions,
}