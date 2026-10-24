# Integrations

## External Services
- **Google Gemini AI** (@google/genai ^2.4.0) - Referenced in dependencies and README mentions AI Studio app
- **Google AI Studio** - App hosted/viewed via ai.studio (https://ai.studio/apps/18fedf31-6044-4e0b-aee7-8f0e95f1e1e4)

## APIs
### Internal REST API
The application provides a full REST API through Express server at `/api/*`:

#### Authentication & Users
- `GET /api/auth/current` - Get current user
- `GET /api/auth/available-users` - List all users
- `POST /api/auth/switch-user` - Switch active user
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `POST /api/users/:id/revoke-lost-device` - Revoke user account (admin only)
- `POST /api/users/:id/restore-status` - Restore user status (admin only)
- `PUT /api/users/:id` - Update user (admin only)

#### Quartiers
- `GET /api/quartiers` - List all quartiers

#### Fiches Individuelles
- `GET /api/fiches-individuelles` - List individual forms
- `GET /api/fiches-individuelles/:id` - Get specific form
- `POST /api/fiches-individuelles` - Create form
- `PUT /api/fiches-individuelles/:id` - Update form
- `POST /api/fiches-individuelles/:id/valider` - Validate form (supervisor/admin)
- `POST /api/fiches-individuelles/:id/corriger` - Request corrections
- `POST /api/fiches-individuelles/:id/rejeter` - Reject form

#### Fiches Collectives
- `GET /api/fiches-collectives` - List collective forms
- `POST /api/fiches-collectives` - Create collective form
- `PUT /api/fiches-collectives/:id` - Update collective form
- `POST /api/fiches-collectives/:id/valider` - Validate collective form

#### Espaces Jeunesse
- `GET /api/espaces` - List youth spaces
- `POST /api/espaces` - Create youth space
- `PUT /api/espaces/:id` - Update youth space

#### Projets Citoyens
- `GET /api/projets` - List citizen projects
- `POST /api/projets` - Create citizen project
- `PUT /api/projets/:id/statut` - Update project status (admin/maire)

#### Statistiques & Audit
- `GET /api/statistiques` - Get statistics
- `GET /api/audit-logs` - Get audit logs (admin/supervisor)
- `GET /api/maire/statistiques-anonymisees` - Anonymized stats for mayor
- `GET /api/maire/espaces-cartographie` - Spaces for mayor map view

#### Synchronisation Offline
- `POST /api/sync/push` - Push offline changes
- `GET /api/sync/pull` - Pull changes
- `GET /api/sync/manifest` - Sync manifest

## Data Storage
- **File-based JSON database** - `data/db.json` (persisted locally)
- **Database module** at `src/server/database.ts` manages initialization, CRUD, and persistence
- **Offline storage** - `src/utils/offlineStorage.ts` handles offline queue and sync
- **Conflict resolution** - `src/shared/conflictResolver.ts` for sync conflicts
- **Duplicate detection** - `src/shared/duplicateDetector.ts` for detecting duplicates in forms

## Environment Variables
- `GEMINI_API_KEY` - For Google Gemini AI (mentioned in README)

## Authentication
- **Session-based/simulated auth** - Server uses middleware setting `req.user` from `db.getCurrentUser()`
- **User switching** - Can switch between available users via API/UI
- **Role-based access control** - Implemented in permissions module (`src/shared/permissions.ts`)
- **Account status checks** - Handles 'actif', 'suspendu', 'revoque_perte_telephone' states
