 # Using Gemini CLI for Large Codebase Analysis

  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

  ## File and Directory Inclusion Syntax

  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  Examples:

  **Single file analysis:**
  gemini -p "@src/main.py Explain this file's purpose and structure"

  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"

  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"

  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  
 Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"

  Implementation Verification Examples

  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

  When to Use Gemini CLI

  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase

  Important Notes

  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results # Using Gemini CLI for Large Codebase Analysis


  When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
  context window. Use `gemini -p` to leverage Google Gemini's large context capacity.


  ## File and Directory Inclusion Syntax

  Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
   gemini command:

  ### Examples:
  **Single file analysis:**
  gemini -p "@src/main.py Explain this file's purpose and structure"

  Multiple files:
  gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

  Entire directory:
  gemini -p "@src/ Summarize the architecture of this codebase"

  Multiple directories:
  gemini -p "@src/ @tests/ Analyze test coverage for the source code"

  Current directory and subdirectories:
  gemini -p "@./ Give me an overview of this entire project"
  # Or use --all_files flag:
  gemini --all_files -p "Analyze the project structure and dependencies"

  Implementation Verification Examples

  Check if a feature is implemented:
  gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

  Verify authentication implementation:
  gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

  Check for specific patterns:
  gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

  Verify error handling:
  gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

  Check for rate limiting:
  gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

  Verify caching strategy:
  gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

  Check for specific security measures:
  gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

  Verify test coverage for features:
  gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

  When to Use Gemini CLI

  Use gemini -p when:
  - Analyzing entire codebases or large directories
  - Comparing multiple large files
  - Need to understand project-wide patterns or architecture
  - Current context window is insufficient for the task
  - Working with files totaling more than 100KB
  - Verifying if specific features, patterns, or security measures are implemented
  - Checking for the presence of certain coding patterns across the entire codebase

  Important Notes

  - Paths in @ syntax are relative to your current working directory when invoking gemini
  - The CLI will include file contents directly in the context
  - No need for --yolo flag for read-only analysis
  - Gemini's context window can handle entire codebases that would overflow Claude's context
  - When checking implementations, be specific about what you're looking for to get accurate results


## 1. Core Philosophy & Guiding Principles

**Your primary directive is to follow Test-Driven Development (TDD).** Every line of production code must be written in response to a failing test. This is not a suggestion; it is the fundamental practice for this project.

-   **Test First:** Always write a failing test that describes the desired business behavior before writing any implementation code (Red-Green-Refactor).
-   **Test Behavior, Not Implementation:** Tests must validate the public API of a module or component, treating the internals as a black box. Do not test private functions or internal state.
-   **Schema-First Development:** Define data structures with validation schemas first (Zod for frontend), then derive static types. This is the single source of truth.
-   **Immutability:** Treat all data as immutable. Create new objects/arrays instead of modifying existing ones.
-   **Clarity Over Cleverness:** Write self-documenting code with clear names. Avoid comments that explain *what* the code does; the code itself should be the explanation.
-   **Respect Existing Architecture:** Adhere to the established project structure, API conventions, and state management patterns outlined below.

## 2. Essential Commands

### Frontend Development (Next.js)
```bash
cd frontend
npm run dev            # Start development server (http://localhost:3000)
npm run build          # Build for production
npm run lint           # Run ESLint
npm run test           # Run Jest tests
npm run test:watch     # Run Jest in watch mode
npm run test:e2e       # Run Cypress E2E tests
```

### Backend Development (Flask with Docker)
```bash
cd backend
docker-compose up -d   # Start backend and database services
docker-compose down -v # Stop services and remove volumes (full reset)

# Run commands inside the running container
docker-compose exec backend flask db upgrade   # Run database migrations
docker-compose exec backend flask seed run     # Seed base data
docker-compose exec backend pytest             # Run all backend tests
```

### Quick Reset & Reseed Workflow
```bash
cd backend
docker-compose down -v
docker-compose up -d
docker-compose exec backend flask seed run
docker-compose exec backend flask create-permission-groups run
```

## 3. Project Architecture

### System Overview
FBO LaunchPad is a Fixed Base Operator management system for aircraft fueling operations with a React/Next.js frontend and Flask/Python backend.

### Technology Stack
-   **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, Shadcn UI, React Query, **Zod (for schema validation)**
-   **Backend**: Flask, SQLAlchemy, PostgreSQL, Redis, **Pydantic (for schema validation)**
-   **Authentication**: JWT tokens with Permission-Based Access Control (PBAC)
-   **Infrastructure**: Docker Compose for backend services
-   **Testing**: Jest/React Testing Library (frontend), Pytest (backend), Cypress (E2E)

### Key User Roles & Permissions
-   **System Administrator**: Full system access.
-   **Customer Service Representative (CSR)**: Manages fuel orders.
-   **Line Service Technician (LST/Fueler)**: Executes fuel orders.
-   **Member**: Basic view access.

### Core Data Models
-   **Users**: JWT authentication with roles and permissions.
-   **Fuel Orders**: Lifecycle from creation to completion.
-   **Aircraft**: Created from fuel orders if tail number is new.
-   **Customers**, **Fuel Trucks**, **Receipts**.

### Frontend Architecture (`frontend/`)
-   **Structure**: Next.js App Router (`app/`) with routes for `admin`, `csr`, `fueler`.
-   **Components**: Shared components in `app/components/`, Shadcn UI in `components/ui/`.
-   **API Layer**: API calls are in `app/services/` and use React Query for state management.
-   **State Management**: React Query for server state. React Context for Auth/Permissions. No global state library.
-   **Permissions**: UI is controlled via a `PermissionContext`.

### Backend Architecture (`backend/`)
-   **Structure**: Feature-based organization.
    -   `src/models/`: SQLAlchemy ORM models.
    -   `src/schemas/`: **Pydantic** serialization schemas (the source of truth for data shapes).
    -   `src/services/`: Business logic layer.
    -   `src/routes/`: Flask blueprints (API endpoints).
    -   `tests/`: Pytest test suite.
-   **Permissions**: Layered system with decorators (`@require_permission`).

## 4. Development Principles & Code Style

This section details **how** we write code. Adhere to these rules strictly.

### The TDD Workflow: Red-Green-Refactor
This is the **mandatory** development cycle for any change, big or small.

1.  **RED**: Write a new test that describes a piece of required functionality. Run the test suite and watch it fail. It must fail for the expected reason.
2.  **GREEN**: Write the *absolute minimum* amount of production code required to make the failing test pass. Do not add extra features or "nice-to-haves."
3.  **REFACTOR**: With the tests passing, assess the code you just wrote. Can it be made cleaner, clearer, or more efficient without changing its behavior? Refactor only if it adds value. Run tests again to ensure they still pass. Commit your work.

### Frontend (TypeScript/Next.js)

-   **Strict TypeScript**: `tsconfig.json` is set to `strict: true`. **No `any` types, ever.** Use `unknown` for values whose type is truly unknown. Avoid type assertions (`as Type`) and `@ts-ignore`.
-   **Schema-First with Zod**: For any data structure that crosses an API boundary or comes from user input, define a `Zod` schema first. Derive TypeScript types from this schema.
    ```typescript
    // frontend/app/schemas/fuelOrder.ts
    import { z } from 'zod';
    
    export const FuelOrderSchema = z.object({
      id: z.string().uuid(),
      tailNumber: z.string().min(1, "Tail number is required"),
      gallonsRequested: z.number().positive(),
      status: z.enum(['Created', 'Dispatched', 'Complete']),
    });
    
    export type FuelOrder = z.infer<typeof FuelOrderSchema>;
    ```
-   **Test Data Factories**: Use factory functions in tests to create mock data. They **must** return valid types derived from the real Zod schemas to ensure tests and production code stay in sync.
    ```typescript
    // frontend/tests/factories.ts
    import { FuelOrder, FuelOrderSchema } from '@/schemas/fuelOrder';

    export const createMockFuelOrder = (overrides?: Partial<FuelOrder>): FuelOrder => {
      const defaults: FuelOrder = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        tailNumber: 'N12345',
        gallonsRequested: 100,
        status: 'Created',
      };
      // Return a valid object, validated by the real schema
      return FuelOrderSchema.parse({ ...defaults, ...overrides });
    };
    ```
-   **Component Testing (RTL)**: Test component behavior from the user's perspective. Find elements by their accessible roles and text. Do not test implementation details like internal state or private function calls.

### Backend (Python/Flask)

-   **Strict Typing**: All code must have type hints. Code must pass `mypy` checks.
-   **Schema-First with Pydantic**: All API request/response bodies and service-layer data structures must be defined as `Pydantic` models. This provides runtime validation and is the single source of truth for data.
    ```python
    # backend/src/schemas/fuel_order.py
    from pydantic import BaseModel, Field, conint
    from uuid import UUID
    from enum import Enum

    class FuelOrderStatus(str, Enum):
        CREATED = "Created"
        DISPATCHED = "Dispatched"
        COMPLETE = "Complete"

    class FuelOrderSchema(BaseModel):
        id: UUID
        tail_number: str = Field(..., min_length=1)
        gallons_requested: conint(gt=0)
        status: FuelOrderStatus
        
        class Config:
            orm_mode = True # For SQLAlchemy integration
    ```
-   **Service Layer**: All business logic must reside in the `src/services/` layer, not in routes. Services should be stateless and easily testable in isolation.
-   **Testing (Pytest)**: Write unit tests for service layer logic and integration tests for API endpoints. Use fixtures for setting up test data and dependencies.

### Refactoring Guidelines

-   **Commit Before Refactoring**: Always commit a working "Green" state before starting to refactor.
-   **Abstract Knowledge, Not Just Syntax**: Do not create an abstraction just because two pieces of code look the same. Only abstract when they represent the same **business concept**. A wrong abstraction is far more costly than duplicated code.
-   **Small, Focused Functions**: Keep functions short and focused on a single responsibility. Use guard clauses (early returns) to reduce nesting.

## 5. Typical Development Task Workflow

This combines the TDD process with our project's specific setup.

#### Example Task: Adding a "High Priority" field to Fuel Orders

1.  **Start Services**: `cd backend && docker-compose up -d`, then `cd frontend && npm run dev`.

2.  **Write a Failing Backend Test (RED)**: In `backend/tests/services/test_fuel_order_service.py`, add a test that tries to create an order with `is_priority=True` and asserts it's saved correctly. Run `pytest`. It will fail.

3.  **Make Backend Test Pass (GREEN)**:
    -   Update the `FuelOrderSchema` Pydantic model in `backend/src/schemas/` to include `is_priority: bool = False`.
    -   Add the `is_priority` column to the `FuelOrder` SQLAlchemy model in `backend/src/models/`.
    -   Generate and run a database migration: `docker-compose exec backend flask db migrate -m "add priority to fuel orders"` then `... flask db upgrade`.
    -   Update the `FuelOrderService` to handle the new field.
    -   Run `pytest`. The test should now pass.

4.  **Write a Failing Frontend Test (RED)**: In the frontend, write a component test for the fuel order form. Simulate a user checking a "High Priority" checkbox and submitting. Assert that the API service function is called with an object including `isPriority: true`. Run `npm run test`. It will fail.

5.  **Make Frontend Test Pass (GREEN)**:
    -   Update the `FuelOrderSchema` Zod schema in `frontend/app/schemas/` to include `isPriority: z.boolean().optional()`.
    -   Add the checkbox to the `FuelOrderForm` React component.
    -   Update the component's state management and the API service call to include the new field.
    -   Run `npm run test`. The test should now pass.

6.  **Refactor (if needed)**: Look at the code you just wrote in both the frontend and backend. Is it clean? Are the names clear? Could logic be simplified? Refactor if it adds value and ensure all tests still pass.