# Structure

## Directory Layout
```
plateformejeunesselambanyi/
├── .aistudio/              # AI Studio configuration
├── data/                   # JSON database storage
│   └── db.json            # Main database file
├── docs/                   # Documentation
├── node_modules/           # Dependencies
├── public/                 # Static assets
├── src/                    # Source code
│   ├── components/         # React components
│   ├── server/            # Server-side code
│   ├── shared/            # Shared types and utilities
│   ├── utils/             # Client utilities
│   ├── App.tsx            # Main app component
│   ├── index.css          # Global styles
│   └── main.tsx           # React entry point
├── server.ts              # Express server entry point
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
└── README.md              # Project documentation
```

## Source Code Organization

### `src/components/` (Frontend UI)
Contains React components organized by feature/view:
- `Header.tsx` - App header
- `Navigation.tsx` - Tab navigation (role-filtered)
- `DashboardView.tsx` - Dashboard/statistics
- `ConsultationIndividuelleView.tsx` - Individual consultation forms
- `ConsultationCollectiveView.tsx` - Collective consultation forms
- `ValidationView.tsx` - Form validation (supervisors/admin)
- `CartographieView.tsx` - Map view with Leaflet
- `ProjetsCitoyensView.tsx` - Citizen projects
- `AdministrationView.tsx` - User/admin management
- `ExportsView.tsx` - Data export
- Additional components may exist for forms, modals, etc.

### `src/server/` (Backend)
- `database.ts` - Database layer, initialization, CRUD operations

### `src/shared/` (Shared between client/server)
- `types.ts` - All TypeScript interfaces and types
- `permissions.ts` - RBAC logic
- `duplicateDetector.ts` - Duplicate detection algorithm
- `conflictResolver.ts` - Sync conflict resolution
- `kAnonymity.ts` - Anonymization logic

### `src/utils/` (Client utilities)
- `offlineStorage.ts` - Offline storage and sync queue management

### `data/` (Data Storage)
- `db.json` - File-based database with all application data

## Key Files

### Entry Points
- **Frontend**: `src/main.tsx` → `src/App.tsx`
- **Backend**: `server.ts` (serves API and Vite)
- **HTML**: `index.html`

### Configuration
- `tsconfig.json` - TypeScript compiler options
- `vite.config.ts` - Vite build/dev configuration
- `package.json` - Project metadata and dependencies

## Naming Conventions
- **Components**: PascalCase (e.g., `Header.tsx`, `DashboardView.tsx`)
- **Files**: kebab-case or PascalCase depending on type
- **Types/Interfaces**: PascalCase (e.g., `UserProfile`, `FicheIndividuelle`)
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE or PascalCase

## Module Resolution
- Uses ES modules with `.ts` extensions in imports
- Path resolution via TypeScript/Vite
- Both relative and absolute-style imports used
