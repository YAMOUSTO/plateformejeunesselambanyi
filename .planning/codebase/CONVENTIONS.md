# Conventions

## Code Style
- **TypeScript** throughout - strict typing with interfaces
- **ES Modules** - `"type": "module"` in package.json
- **Functional components** - React components use function declarations/expressions
- **Hooks** - React hooks (useState, useEffect, useCallback) for state and effects
- **Named exports** preferred in some places, default exports for main components

## Naming Conventions
- **Components**: PascalCase (`Header.tsx`, `DashboardView.tsx`)
- **Files**: PascalCase for components/views, camelCase for utilities
- **Interfaces/Types**: PascalCase (`UserProfile`, `FicheIndividuelle`, `Quartier`)
- **Variables/Functions**: camelCase (`fetchAllData`, `updatePendingSync`, `currentUser`)
- **Constants**: UPPER_SNAKE_CASE for true constants, PascalCase for objects like `INITIAL_QUARTIERS`
- **Boolean variables**: prefixed with `is`, `has`, `can` (e.g., `isOnline`, `isLoading`, `canEditFicheIndividuelle`)
- **Event handlers**: prefixed with `handle` or just descriptive names

## File Organization
- **Components** in `src/components/` with .tsx extension
- **Types** centralized in `src/shared/types.ts`
- **Utilities** split between client (`src/utils/`) and shared (`src/shared/`)
- **Server code** in `src/server/` and root `server.ts`

## Import Style
- Use `.ts`/`.tsx` extensions in imports (ESM requirement)
- Relative imports for local modules
- Named imports from libraries
- Example: `import { Header } from './components/Header.tsx';`

## TypeScript Patterns
- Strict typing - all props, state, and API responses typed
- Type-only imports where appropriate
- Union types for enums-like values (e.g., `UserRole`, `StatutFiche`)
- Optional properties with `?`
- Array types with `[]` or `Array<T>`

## React Patterns
- **Functional components** with hooks
- **useCallback** for memoized functions passed as deps
- **useEffect** for side effects (data fetching, subscriptions)
- **Props typing** with interfaces
- **Conditional rendering** based on role/state
- **Event handlers** as inline or separated functions

## API Conventions
- RESTful endpoints under `/api/`
- JSON request/response bodies
- Consistent response format: `{ success: boolean, data/message, ... }`
- HTTP status codes used appropriately (200, 201, 400, 403, 404)
- Role checks in route handlers
- Audit logging for mutations

## Database Conventions
- JSON file storage in `data/db.json`
- Singleton pattern via `db` export from `src/server/database.ts`
- `db.getData()` returns mutable reference to data
- `db.save()` persists changes
- Initialization creates default data if file doesn't exist
- Collections use plural names in schema (e.g., `fiches_individuelles`)

## Commenting
- Comments in French (codebase is French - "Plateforme Communale de Consultation des Jeunes de Lambanyi")
- JSDoc-style comments for modules
- Section comments with separators (e.g., `// ==================== AUTH & UTILISATEURS ====================`)
- Minimal inline comments where code is self-explanatory

## Error Handling
- Try-catch blocks for async operations
- API returns error objects with messages
- Client handles errors gracefully (fallbacks, alerts)
- Validation on both client and server side
