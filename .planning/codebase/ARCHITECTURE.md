# Architecture

## Overview
This is a **full-stack monolithic application** with Express serving both API routes and Vite dev server (with HMR in development). The app follows a client-server architecture with React frontend, Express backend, and file-based JSON storage.

## System Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Client   │────▶│  Express Server │────▶│  JSON Database  │
│   (Vite dev)     │     │   (API + SSR)   │     │   (data/db.json) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        └──────────┬─────────────┘
                   │
              ┌────▼────┐
              │ Offline  │
              │ Storage  │
              └─────────┘
```

## Layers

### Frontend Layer (`src/`)
- **App.tsx** - Root component, manages global state, data fetching, offline/sync
- **components/** - React UI components (Header, Navigation, views for each module)
- **utils/** - Client utilities (offlineStorage, etc.)
- **main.tsx** - React entry point
- **index.css** - Global styles

### Backend Layer (`src/server/`, `server.ts`)
- **server.ts** - Main Express server, API routes, Vite middleware integration
- **src/server/database.ts** - Database layer with CRUD operations and data initialization

### Shared Layer (`src/shared/`)
- **types.ts** - TypeScript type definitions (domain models)
- **permissions.ts** - Role-based access control logic
- **duplicateDetector.ts** - Duplicate detection algorithm
- **conflictResolver.ts** - Sync conflict resolution
- **kAnonymity.ts** - Data anonymization for mayor view

## Key Architectural Patterns

### 1. Full-Stack Monolith
- Express server in `server.ts` serves both API endpoints and the Vite app
- In development, uses `createViteServer` with middleware mode for HMR
- Single deployment unit

### 2. Role-Based Access Control (RBAC)
- 5 user roles: `agent_individuel`, `agent_collectif`, `superviseur_quartier`, `admin_communal`, `maire_lecture`
- Permissions enforced in both API routes and shared logic
- Different UI views based on role (Navigation filtered by role)

### 3. Offline-First Architecture
- **OfflineStorageManager** in `src/utils/offlineStorage.ts` queues operations when offline
- **Sync queue** stored locally, pushed when online
- **Conflict detection/resolution** mechanism
- Sync endpoints: `/api/sync/push`, `/api/sync/pull`, `/api/sync/manifest`

### 4. Data Validation & Workflow
- **Fiche lifecycle**: `brouillon` → `envoye` → `valide`/`a_corriger`/`rejete`
- **Validation workflow** requires supervisor/admin approval
- **Duplicate detection** runs on form submission
- **Audit logging** tracks all significant actions

### 5. Privacy & Security
- **k-Anonymity** - Mayor gets anonymized statistics via `sanitizeFichesForMayor()`
- **Permission checks** - Granular permissions per action
- **Audit trail** - All modifications logged with user, action, timestamps
- **Account revocation** - Can revoke accounts (e.g., lost/stolen device)

## Data Flow
1. Client makes API calls to Express server
2. Server authenticates via middleware (gets current user from DB)
3. Server checks permissions using `src/shared/permissions.ts`
4. Server performs business logic, updates `data/db.json` via `db.save()`
5. Server creates audit logs for significant actions
6. Response sent back to client
7. Client updates React state

## State Management
- **React useState/useEffect** - Local component state
- **App.tsx** holds global app state (users, fiches, quartiers, etc.)
- **No external state library** (Redux, Zustand) - simple React state
- **Offline queue** managed separately via OfflineStorageManager
