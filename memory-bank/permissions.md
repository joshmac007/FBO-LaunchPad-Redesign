# FBO LaunchPad Permission System Mapping

## Document Overview
**Created:** 2025-01-24  
**Task:** PERMISSION_SYSTEM_MAPPING_FIX_001  
**Purpose:** Comprehensive mapping between frontend permission checks and backend permission definitions

## Current Backend Permissions (21 Total)

### Fuel Orders (10 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `CREATE_ORDER` | Allows creating new fuel orders | fuel_orders |
| `VIEW_ASSIGNED_ORDERS` | Allows viewing orders assigned to self | fuel_orders |
| `VIEW_ALL_ORDERS` | Allows viewing all fuel orders | fuel_orders |
| `UPDATE_OWN_ORDER_STATUS` | Allows LST to update status of own orders | fuel_orders |
| `COMPLETE_OWN_ORDER` | Allows LST to complete own orders | fuel_orders |
| `REVIEW_ORDERS` | Allows CSR/Admin to mark orders as reviewed | fuel_orders |
| `EXPORT_ORDERS_CSV` | Allows exporting order data to CSV | fuel_orders |
| `VIEW_ORDER_STATS` | Allows viewing order statistics | fuel_orders |
| `EDIT_FUEL_ORDER` | Allows editing fuel order details | fuel_orders |
| `DELETE_FUEL_ORDER` | Allows deleting fuel orders | fuel_orders |

### Users (2 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `VIEW_USERS` | Allows viewing user list | users |
| `MANAGE_USERS` | Allows creating, updating, deleting users and assigning roles | users |

### Fuel Trucks (2 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `VIEW_TRUCKS` | Allows viewing fuel truck list | fuel_trucks |
| `MANAGE_TRUCKS` | Allows creating, updating, deleting fuel trucks | fuel_trucks |

### Aircraft (2 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `VIEW_AIRCRAFT` | Allows viewing aircraft list | aircraft |
| `MANAGE_AIRCRAFT` | Allows creating, updating, deleting aircraft | aircraft |

### Customers (2 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `VIEW_CUSTOMERS` | Allows viewing customer list | customers |
| `MANAGE_CUSTOMERS` | Allows creating, updating, deleting customers | customers |

### System (3 permissions)
| Permission Name | Description | Category |
|---|---|---|
| `MANAGE_ROLES` | Allows managing roles and their permissions | system |
| `VIEW_PERMISSIONS` | Allows viewing available system permissions | system |
| `MANAGE_SETTINGS` | Allows managing global application settings | system |

## Frontend Permission Gaps Analysis

### 1. Missing Dashboard Access Permissions

**Problem:** Frontend checks for dashboard access permissions that don't exist in backend

| Frontend Permission | Current Usage | Required Backend Permission |
|---|---|---|
| `admin_access` | Admin layout, sidebar, role checks | `ACCESS_ADMIN_DASHBOARD` |
| `csr_access` | CSR layout, sidebar, role checks | `ACCESS_CSR_DASHBOARD` |
| `fueler_access` | Fueler layout, sidebar, role checks | `ACCESS_FUELER_DASHBOARD` |
| `access_admin_panel` | Admin navigation | `ACCESS_ADMIN_DASHBOARD` |
| `access_csr_module` | CSR navigation | `ACCESS_CSR_DASHBOARD` |
| `access_fueler_module` | Fueler navigation | `ACCESS_FUELER_DASHBOARD` |
| `member_access` | Member navigation | `ACCESS_MEMBER_DASHBOARD` |

### 2. Naming Inconsistencies

**Problem:** Frontend and backend use different naming conventions

| Frontend Permission | Backend Permission | Required Action |
|---|---|---|
| `view_fuel_trucks` | `VIEW_TRUCKS` | Rename backend to `VIEW_FUEL_TRUCKS` |
| `manage_fuel_trucks` | `MANAGE_TRUCKS` | Rename backend to `MANAGE_FUEL_TRUCKS` |

### 3. Broad vs Granular Permission Mismatches

**Problem:** Frontend uses broad permissions while backend has specific granular permissions

| Frontend Permission | Current Usage | Backend Mapping Strategy |
|---|---|---|
| `manage_orders` | Order management UI | Check multiple: `EDIT_FUEL_ORDER`, `DELETE_FUEL_ORDER`, `REVIEW_ORDERS` |
| `manage_permissions` | Permission management UI | Map to `MANAGE_ROLES` |
| `manage_lst` | LST management UI | Map to `MANAGE_USERS` |
| `view_orders` | Order list views | Map to `VIEW_ALL_ORDERS` |
| `view_lst` | LST list views | Map to `VIEW_USERS` |

### 4. Missing Operational Permissions

**Problem:** Frontend checks for operational permissions that don't exist in backend

| Frontend Permission | Current Usage | Required Backend Permission |
|---|---|---|
| `perform_fueling` | Fueling operations UI | `PERFORM_FUELING_TASK` |
| `update_fuel_order_status` | Status update UI | Maps to existing `UPDATE_OWN_ORDER_STATUS` |
| `start_fueling_task` | Task initiation UI | Consolidate with `PERFORM_FUELING_TASK` |

### 5. Missing Future-Ready Permissions

**Problem:** Frontend has capabilities for features not yet supported by backend permissions

| Frontend Permission | Current Usage | Required Backend Permission |
|---|---|---|
| `view_billing` | Fee calculator component | `VIEW_BILLING_INFO` |
| N/A | Future receipt system | `VIEW_ALL_RECEIPTS` |
| N/A | Future receipt system | `VIEW_OWN_RECEIPTS` |
| N/A | Future receipt system | `MANAGE_RECEIPTS` |
| N/A | Future receipt system | `EXPORT_RECEIPTS_CSV` |
| N/A | Future billing features | `CALCULATE_FEES` |

### 6. UI Filtered View Permissions

**Problem:** Frontend checks for specific filtered view permissions

| Frontend Permission | Current Usage | Backend Mapping Strategy |
|---|---|---|
| `view_pending_orders` | Fueler dashboard | Use `VIEW_ASSIGNED_ORDERS` with UI filtering |
| `view_in_progress_orders` | Fueler dashboard | Use `VIEW_ASSIGNED_ORDERS` with UI filtering |
| `view_completed_orders` | Fueler dashboard | Use `VIEW_ASSIGNED_ORDERS` with UI filtering |
| `view_own_orders` | Member dashboard | Use `VIEW_ASSIGNED_ORDERS` or create `VIEW_SELF_CREATED_ORDERS` |

## Required Backend Permission Additions (13 New Permissions)

### Module Access Permissions (4 new)
```python
{'name': 'ACCESS_ADMIN_DASHBOARD', 'description': 'Allows access to admin dashboard', 'category': 'dashboard_access'},
{'name': 'ACCESS_CSR_DASHBOARD', 'description': 'Allows access to CSR dashboard', 'category': 'dashboard_access'},
{'name': 'ACCESS_FUELER_DASHBOARD', 'description': 'Allows access to fueler dashboard', 'category': 'dashboard_access'},
{'name': 'ACCESS_MEMBER_DASHBOARD', 'description': 'Allows access to member dashboard', 'category': 'dashboard_access'},
```

### Operational Permissions (1 new)
```python
{'name': 'PERFORM_FUELING_TASK', 'description': 'Allows performing fueling operations and task management', 'category': 'fuel_orders'},
```

### Billing/Fees Permissions (2 new)
```python
{'name': 'VIEW_BILLING_INFO', 'description': 'Allows viewing billing information and fee calculations', 'category': 'billing'},
{'name': 'CALCULATE_FEES', 'description': 'Allows calculating fees and charges', 'category': 'billing'},
```

### Fuel Receipt System Permissions (4 new)
```python
{'name': 'VIEW_ALL_RECEIPTS', 'description': 'Allows viewing all fuel receipts', 'category': 'receipts'},
{'name': 'VIEW_OWN_RECEIPTS', 'description': 'Allows viewing own fuel receipts', 'category': 'receipts'},
{'name': 'MANAGE_RECEIPTS', 'description': 'Allows creating, editing, and managing fuel receipts', 'category': 'receipts'},
{'name': 'EXPORT_RECEIPTS_CSV', 'description': 'Allows exporting receipt data to CSV', 'category': 'receipts'},
```

### Naming Updates (2 renames)
```python
# Rename existing permissions for consistency
'VIEW_TRUCKS' → 'VIEW_FUEL_TRUCKS'
'MANAGE_TRUCKS' → 'MANAGE_FUEL_TRUCKS'
```

## Updated Role Permission Mappings

### System Administrator (All permissions)
```python
'System Administrator': [
    # All existing permissions plus new ones
    'ACCESS_ADMIN_DASHBOARD', 'ACCESS_CSR_DASHBOARD', 'ACCESS_FUELER_DASHBOARD', 'ACCESS_MEMBER_DASHBOARD',
    'PERFORM_FUELING_TASK', 'VIEW_BILLING_INFO', 'CALCULATE_FEES',
    'VIEW_ALL_RECEIPTS', 'VIEW_OWN_RECEIPTS', 'MANAGE_RECEIPTS', 'EXPORT_RECEIPTS_CSV',
    # ... all existing permissions
]
```

### Customer Service Representative
```python
'Customer Service Representative': [
    'ACCESS_CSR_DASHBOARD',
    'CREATE_ORDER', 'VIEW_ALL_ORDERS', 'REVIEW_ORDERS', 'EXPORT_ORDERS_CSV',
    'VIEW_ORDER_STATS', 'EDIT_FUEL_ORDER',
    'VIEW_USERS', 'VIEW_FUEL_TRUCKS', 'VIEW_AIRCRAFT', 'VIEW_CUSTOMERS',
    'MANAGE_AIRCRAFT', 'MANAGE_CUSTOMERS',
    'VIEW_PERMISSIONS', 'VIEW_BILLING_INFO'
]
```

### Line Service Technician
```python
'Line Service Technician': [
    'ACCESS_FUELER_DASHBOARD',
    'CREATE_ORDER', 'VIEW_ASSIGNED_ORDERS', 'UPDATE_OWN_ORDER_STATUS', 'COMPLETE_OWN_ORDER',
    'VIEW_ORDER_STATS', 'PERFORM_FUELING_TASK',
    'VIEW_OWN_RECEIPTS'
]
```

### Member
```python
'Member': [
    'ACCESS_MEMBER_DASHBOARD',
    'VIEW_ORDER_STATS', 'VIEW_CUSTOMERS', 'VIEW_AIRCRAFT',
    'VIEW_OWN_RECEIPTS'
]
```

## Frontend Permission Mapping Strategy

### 1. Update usePermissions.ts Role Checks
```typescript
// Replace role-based checks with permission-based checks
const isAdmin = useMemo(() => {
  return can('ACCESS_ADMIN_DASHBOARD')
}, [can])

const isCSR = useMemo(() => {
  return can('ACCESS_CSR_DASHBOARD')
}, [can])

const isFueler = useMemo(() => {
  return can('ACCESS_FUELER_DASHBOARD')
}, [can])

const isMember = useMemo(() => {
  return can('ACCESS_MEMBER_DASHBOARD')
}, [can])
```

### 2. Update Layout Permission Checks
```typescript
// Admin Layout
const hasAdminAccess = can('ACCESS_ADMIN_DASHBOARD')

// CSR Layout  
const hasCSRAccess = can('ACCESS_CSR_DASHBOARD')

// Fueler Layout
const hasFuelerAccess = can('ACCESS_FUELER_DASHBOARD')
```

### 3. Update Sidebar Navigation Permissions
```typescript
// Replace broad permissions with specific ones
{
  title: "Orders",
  permissions: ['VIEW_ALL_ORDERS', 'EDIT_FUEL_ORDER'], // Instead of 'manage_orders'
}
{
  title: "Fuel Trucks", 
  permissions: ['VIEW_FUEL_TRUCKS', 'MANAGE_FUEL_TRUCKS'], // Updated naming
}
```

### 4. Update Operational Permission Checks
```typescript
// Fueling operations
const canPerformFueling = can('PERFORM_FUELING_TASK')

// Billing features
const canViewBilling = can('VIEW_BILLING_INFO')
const canCalculateFees = can('CALCULATE_FEES')
```

## Implementation Migration Plan

### Phase 1: Backend Permission Updates
1. Update `backend/src/seeds.py` with new permissions
2. Update role mappings with new permissions
3. Rename existing truck permissions for consistency
4. Create database migration for permission changes
5. Test permission seeding

### Phase 2: Frontend Core Updates
1. Update `frontend/hooks/usePermissions.ts` role checks
2. Update `frontend/app/contexts/permission-context.tsx`
3. Update core layout files with new permission strings
4. Update sidebar navigation permission checks

### Phase 3: Component-Level Updates
1. Update all permission-aware components
2. Update protected route permission checks
3. Update permission action buttons
4. Update permission debug component

### Phase 4: Testing & Validation
1. Test all user roles with new permission system
2. Verify frontend components show/hide correctly
3. Test API endpoint access with new permissions
4. Update existing tests
5. Verify no orphaned permission strings remain

## Success Criteria Checklist

- [ ] All 13 new backend permissions added to seeds.py
- [ ] All role mappings updated with appropriate permissions
- [ ] Truck permissions renamed for consistency
- [ ] Database migration created and tested
- [ ] Frontend role checks use backend permissions
- [ ] All layout files use correct permission strings
- [ ] Sidebar navigation uses specific permissions
- [ ] No orphaned permission strings in frontend code
- [ ] All user roles have appropriate dashboard access
- [ ] Permission system ready for fuel receipt features
- [ ] Zero security regressions during migration
- [ ] Comprehensive testing across all user roles completed

## Files Requiring Updates

### Backend Files
- `backend/src/seeds.py` - Add new permissions and update mappings
- Database migration file - Add new permissions to database

### Frontend Files
- `frontend/hooks/usePermissions.ts` - Update role checks
- `frontend/app/contexts/permission-context.tsx` - Update context
- `frontend/components/layout/app-sidebar.tsx` - Update navigation
- `frontend/app/admin/layout.tsx` - Update admin layout
- `frontend/app/csr/layout.tsx` - Update CSR layout  
- `frontend/app/fueler/layout.tsx` - Update fueler layout
- `frontend/app/components/permission-action-button.tsx` - Update buttons
- `frontend/app/components/permission-aware.tsx` - Update components
- `frontend/app/components/protected-route.tsx` - Update routes
- `frontend/app/components/permission-debug.tsx` - Update debug component
- `frontend/app/components/fee-calculator.tsx` - Update billing permissions

## Risk Mitigation

### Security Risks
- **Risk**: Permission changes could create security vulnerabilities
- **Mitigation**: Comprehensive testing of all user roles and permission combinations

### Data Integrity Risks  
- **Risk**: Database migration could fail or corrupt permission data
- **Mitigation**: Backup database before migration, test migration on development environment

### User Experience Risks
- **Risk**: Users could lose access to features during migration
- **Mitigation**: Ensure new permissions are properly assigned to existing roles

### Development Risks
- **Risk**: Orphaned permission strings could cause runtime errors
- **Mitigation**: Systematic search and replace of all permission strings, comprehensive testing
