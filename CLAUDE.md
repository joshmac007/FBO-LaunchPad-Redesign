# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FBO LaunchPad** is a comprehensive Fixed Base Operator management system for aircraft fueling operations, built with a dual architecture: Flask/Python backend with PostgreSQL, and Next.js/TypeScript frontend.

**Key User Roles:**
- **System Administrator:** Full system access, manages users, roles, permissions
- **Customer Service Representative (CSR):** Manages fuel orders, customer interactions  
- **Line Service Technician (LST/Fueler):** Executes fuel orders, updates statuses
- **Member:** Basic user with limited view access

## Development Environment & Commands

### Backend (Dockerized)
The backend runs in Docker containers managed by `docker-compose.yml`. **Always execute Flask commands inside the backend container.**

**Essential Commands:**
```bash
# Start backend and database
cd backend && docker-compose up -d

# Database migrations
docker-compose exec backend flask db upgrade

# Seed initial data (permissions, roles, users)
docker-compose exec backend flask seed run

# Create permission groups and assign roles
docker-compose exec backend flask create-permission-groups run

# Create admin user
docker-compose exec backend flask create-admin

# Run backend tests
docker-compose exec backend python -m pytest

# View logs
docker-compose logs -f backend
```

**Database Access:**
- Internal Docker: `postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_dev`
- Host machine: `postgresql://fbo_user:fbo_password@localhost:5433/fbo_launchpad_dev`
- Backend API: `http://localhost:5001`

### Frontend
```bash
cd frontend

# Development server (runs on http://localhost:3000)
npm run dev

# Build production
npm run build

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
npm run test:e2e:open

# Lint code
npm run lint
```

**Important:** Frontend development server should run on `http://localhost:3000`. API calls to `/api/*` are proxied to `http://localhost:5001/api/*` via Next.js rewrites.

### Full System E2E Testing
```bash
# Run Cypress E2E tests (requires both backend and frontend running)
npx cypress run
npx cypress open

# Run specific test file
npx cypress run --spec "cypress/e2e/fuel-order-creation.cy.js"
```

## Architecture Overview

### Backend Structure
- **Framework:** Flask with SQLAlchemy ORM
- **Database:** PostgreSQL with Alembic migrations
- **Authentication:** JWT with enhanced Permission-Based Access Control (PBAC)
- **API Style:** RESTful with Marshmallow schema validation
- **Caching:** Redis for permission caching
- **WebSockets:** Flask-SocketIO for real-time updates

**Key Backend Directories:**
- `src/models/` - SQLAlchemy models with relationships
- `src/routes/` - API endpoints organized by resource
- `src/services/` - Business logic layer  
- `src/schemas/` - Marshmallow request/response schemas
- `src/utils/` - Authentication decorators and utilities
- `migrations/` - Alembic database migrations

### Frontend Structure  
- **Framework:** Next.js 15+ with App Router
- **Language:** TypeScript with strict typing
- **UI:** shadcn/ui components built on Radix UI primitives
- **Styling:** Tailwind CSS with design tokens
- **State:** React Context API + TanStack Query for server state
- **Forms:** React Hook Form with Zod validation

**Key Frontend Directories:**
- `app/` - All routes, layouts, and pages (App Router)
- `app/services/` - **API communication layer** (never call `fetch` directly in components)
- `app/contexts/` - Global state management
- `app/constants/permissions.ts` - **Single source of truth for permission strings**
- `components/ui/` - Base shadcn/ui components
- `components/` - Reusable application components

## Permission System

**Critical:** This system uses granular Permission-Based Access Control. All access decisions are based on specific permission strings, not role names.

### Permission Architecture
1. **Direct User Permissions** - Specific permissions assigned to users
2. **Permission Groups** - Collections of permissions assigned to users or roles  
3. **Role-based Permissions** - Permissions inherited through user roles
4. **Legacy Role Permissions** - Direct role-to-permission mappings

### Key Permission Files
- `backend/src/seeds.py` - **Canonical list of all permission strings** (`all_permissions`)
- `backend/src/migration_scripts/permission_groups_schema.py` - Permission group definitions
- `backend/src/services/permission_service.py` - Central permission resolution logic
- `frontend/app/constants/permissions.ts` - Frontend permission constants
- `frontend/app/contexts/permission-context.tsx` - Client-side permission state

### Permission Usage Patterns

**Backend API Protection:**
```python
from src.utils.enhanced_auth_decorators_v2 import require_permission_v2

@require_permission_v2('create_fuel_order')
def create_fuel_order():
    # Route implementation
```

**Frontend Permission Checks:**
```typescript
import { usePermissions } from '@/hooks/usePermissions'
import { FUEL_ORDERS } from '@/app/constants/permissions'

const { hasPermission } = usePermissions()

// Conditional rendering
{hasPermission(FUEL_ORDERS.CREATE) && <CreateButton />}

// Permission-aware components
<PermissionActionButton
  requiredPermission={FUEL_ORDERS.DELETE}
  onClick={handleDelete}
>
  Delete Order
</PermissionActionButton>
```

## Data Flow & API Patterns

### Service Layer Pattern
**All API communication must go through service files.** Components should never call `fetch` directly.

```typescript
// ✅ Correct - in service file
export async function getFuelOrders(): Promise<FuelOrderDisplay[]> {
  const response = await fetch(`${API_BASE_URL}/fuel-orders`, {
    headers: getAuthHeaders(),
  })
  return handleApiResponse(response)
}

// ✅ Correct - in component
import { getFuelOrders } from '@/app/services/fuel-order-service'

const { data: orders } = useQuery({
  queryKey: ['fuel-orders'],
  queryFn: getFuelOrders
})
```

### Data Transformation
Services handle mapping between backend API format and frontend display format:
- `FuelOrderBackend` - API contract interface
- `FuelOrderDisplay` - Frontend optimized interface  
- `transformToDisplay()` / `transformToBackend()` - Conversion utilities

## Database Seeding & Initialization

**Critical for development setup:**

```bash
# 1. Seed base data (permissions, roles, users, fuel trucks)
docker-compose exec backend flask seed run

# 2. Create permission groups and role assignments  
docker-compose exec backend flask create-permission-groups run
```

**Both commands are idempotent** and safe to re-run. The `backend/entrypoint.sh` script automatically runs these if the database is empty.

**Convenience Script:**
```bash
cd backend
./reseed_database.sh reseed    # Re-run seeding commands
./reseed_database.sh fresh     # Full database reset + restart
```

## Testing Strategy

### Test Credentials (from seeds.py)
- Admin: `admin@fbolaunchpad.com` / `Admin123!`
- CSR: `csr@fbolaunchpad.com` / `CSR123!`  
- Fueler: `fueler@fbolaunchpad.com` / `Fueler123!`
- Member: `member@fbolaunchpad.com` / `Member123!`

### Running Tests
```bash
# Backend unit tests (inside container)
docker-compose exec backend python -m pytest
docker-compose exec backend python -m pytest tests/test_fuel_order_api.py -v

# Frontend unit tests
cd frontend && npm test
npm test -- --watch

# E2E tests (requires both services running)
npm run test:e2e
```

## Common Development Pitfalls

### 1. Docker Database Operations
**Always run Flask commands inside the Docker container.** The backend connects to PostgreSQL using the Docker service name `db:5432`, not `localhost`.

### 2. Frontend Service Layer
**Never bypass the service layer.** If you find `fetch()` calls directly in components, refactor them into service files. This often causes authentication issues when mock data bypasses proper API flows.

### 3. Permission String Management  
**Use constants, not hardcoded strings.** All permission checks should reference `frontend/app/constants/permissions.ts` or the backend's `seeds.py` definitions.

### 4. API Response Handling
Always use `handleApiResponse()` from `api-config.ts` for consistent error handling and authentication flow.

## Performance Considerations

### Critical Performance Files
- `frontend/app/csr/fuel-orders/page.tsx` - Heavy data processing with real-time polling
- `frontend/app/admin/fbo-config/fee-management/components/FeeScheduleTable.tsx` - Complex table with React Table
- `frontend/app/contexts/permission-context.tsx` - Global state affecting all components

### Optimization Patterns
- Use `React.memo` for expensive table row components
- Implement `useCallback` for event handlers to prevent re-renders  
- Add debouncing for search inputs (300ms minimum)
- Use TanStack Query with appropriate `staleTime` (15+ minutes for static data)
- Consider virtual scrolling for large tables

## Development Workflow

1. **Start Backend:** `cd backend && docker-compose up -d`
2. **Seed Database:** `docker-compose exec backend flask seed run && docker-compose exec backend flask create-permission-groups run`  
3. **Start Frontend:** `cd frontend && npm run dev`
4. **Verify Setup:** Navigate to `http://localhost:3000` and login with test credentials
5. **Run Tests:** Backend tests in container, frontend tests on host, E2E with both running

## Code Style Guidelines

### Frontend
- **Styling:** Tailwind CSS only, no inline styles or CSS files
- **Components:** shadcn/ui for primitives, compose for features
- **File Naming:** kebab-case for files, PascalCase for components
- **Imports:** Always use path aliases (`@/components`, `@/services`)
- **Forms:** React Hook Form + Zod validation required

### Backend  
- **Models:** SQLAlchemy with proper relationships and constraints
- **Routes:** Organized by resource with consistent RESTful patterns
- **Schemas:** Marshmallow for all request/response validation
- **Services:** Business logic separated from route handlers
- **Testing:** Pytest with fixtures for database state

## Security Requirements

- All API endpoints protected with JWT authentication
- Permission checks on both frontend (UX) and backend (security)
- No hardcoded credentials or API keys in code
- Audit logging for sensitive operations
- CORS properly configured for development/production

This system requires careful attention to the dual architecture, permission system, and Docker-based development workflow. Always consult the permission system documentation and test with multiple user roles.