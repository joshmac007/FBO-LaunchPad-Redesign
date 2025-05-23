# Active Context

**Current Task ID:** None
**Current Focus:** Awaiting next task or VAN mode initialization.

This file will be updated by VAN mode when a new task is selected or created.

**Last Task Completed:** UI Redesign & TypeScript Migration (Level 4)
**Archive Link:** [archive/archive-UI-Redesign-Styleguide-L4-20240727.md](archive/archive-UI-Redesign-Styleguide-L4-20240727.md)

**Immediate Blockers:** None.

**Open Questions:** None.

**General Notes:** The Memory Bank is ready for the next task. It is recommended to start in VAN mode to define the next objective.

## Current Focus / Development Focus
- **Backend:**
    - PBAC schema and core logic implemented (Permissions, Roles, User relations).
    - User, Fuel Truck, Aircraft, Customer CRUD APIs defined (Note: Admin User POST/PATCH/DELETE may be inactive).
    - Fuel Order API supports creation (inc. Aircraft auto-create, LST/Truck auto-assign via -1), status updates, review, export.
    - Dedicated seeding script (`src/seeds.py`) for PBAC initial data.
    - CORS configured.
- **Frontend:**
    - PBAC integration completed (role checks removed, relies on backend enforcement).
    - AuthContext updated for full user data.
    - Admin User Management UI complete.
    - Admin Aircraft/Customer Management UI scaffolded.
    - CSR Dashboard implementation ongoing.
    - Real-time order tracking focus.
    - Using React Router v6, Axios, Tailwind CSS, React Context API.

## Current State
- Backend enforces authorization via granular permissions.
- Frontend relies on backend 403 responses for unauthorized actions.
- Fuel order creation handles aircraft auto-creation and LST/truck auto-assignment.
- Admin User Management UI is functional.
- Admin Aircraft/Customer UI needs backend integration.

## Current Technical Decisions / Active Decisions
- **Backend:**
    - Flask with Factory Pattern, Blueprints, Model-View-Service.
    - SQLAlchemy ORM, Alembic migrations.
    - PyJWT for auth, Werkzeug for hashing.
    - APISpec/Marshmallow for API docs/validation.
    - Pytest for testing.
    - PBAC with `User.has_permission()` and `@require_permission` decorator.
- **Frontend:**
    - React functional components with TypeScript.
    - Custom hooks for data fetching.
    - Atomic design principles.
    - React hooks for local state, Context API for global state (Auth).
    - JWT token in localStorage.
    - API polling for real-time updates (WebSockets considered).
    - Tailwind CSS for styling (with PostCSS nesting/import).
    - Vite build tool.
    - Vitest/React Testing Library for testing.

## Next Steps
- **Backend:**
    - Add pagination/search to list endpoints.
    - Complete unit/integration test coverage.
    - Improve error messages and documentation.
    - Verify status of Admin User Management POST/PATCH/DELETE routes.
- **Frontend:**
    - Implement order filtering and sorting.
    - Add pagination to orders table.
    - Enhance error handling (implement Error Boundaries).
    - Add loading skeletons.
    - Implement real-time updates (verify API polling or implement WebSockets).
    - Implement JWT refresh/expiration logic.
    - Complete component/unit/integration test coverage (Vitest/RTL).
    - Add E2E tests for critical flows.
    - Connect Admin Aircraft/Customer UI to backend APIs.
    - Finalize CSR Dashboard implementation.
    - Verify API integration points thoroughly.
    - Update user documentation for PBAC changes.
    - Consider frontend permission caching for performance.

## Known Issues / Current Issues
- **Frontend:**
    - No global Error Boundary component (app can crash).
    - No loading skeletons (poor UX).
    - Incomplete test coverage (unit, integration, E2E).
    - JWT refresh/expiration not handled.
    - Real-time updates via polling may not be efficient (consider WebSockets).
- **Backend:**
    - No pagination/search on list endpoints.
    - Unit test coverage incomplete.
    - Admin User Management POST/PATCH/DELETE routes might be commented out/inactive.

## Dependencies
- Backend PBAC implementation complete and functional.
- Frontend error handling system needs improvement (Error Boundaries).

## Current Considerations
- **Performance:** API response times, component re-renders, loading states, pagination, bundle size.
- **Security:** JWT management, API protection, input validation.
- **User Experience:** Status indicators, navigation, feedback, accessibility.
- **Testing:** Expand coverage (unit, integration, E2E).

## Development Notes
- **Frontend:** Run npm commands from `fbo-launchpad-frontend-csr`. Ensure proper route protection. Maintain consistent state management. Follow component patterns. PostCSS uses nesting/import.
- **Backend:** Use `flask` CLI for commands (`db upgrade`, `seed run`).

## Project Insights
- **Component Organization:** Separation of concerns, reusable components, naming conventions.
- **Data Flow:** API integration via hooks, error handling, data transformation, TypeScript safety.
- **Development Patterns:** Component-first, TDD planned, code style consistency.

## Important Notes for Other AI Agents
- **Component Replacement:** Replace, don't run parallel implementations. Update related components/routes. Clean up old code.
- **React Router v6:** Use `Outlet` for nesting, not `children` prop. Maintain hierarchy. Wrap layouts in protected routes.
- **State Management:** Prefer component-level state. Use custom hooks for shared logic. Implement error boundaries.
- **Common Pitfalls:** Avoid mixing implementations, assuming `children` prop, duplicating state, skipping hierarchy.
- **Obsolete Code:** Be aware frontend calls obsolete backend APIs (LST Queue, Assignment Settings) that need removal.

Current task: VAN - Run frontend tests, debug, and document.
