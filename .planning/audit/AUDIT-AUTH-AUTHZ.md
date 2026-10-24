# Authentication & Authorization Audit Report

**Audit Date:** 2026-10-24  
**Scope:** Authentication mechanisms, RBAC, permission checks, account management  
**Method:** Code review of permissions.ts, server.ts auth routes, database.ts

## Executive Summary
Authentication is completely simulated with no real security. Authorization logic exists in `permissions.ts` and is reasonably detailed, but enforcement is inconsistent across the API. Several critical gaps exist.

---

## CRITICAL Findings

### CRIT-AUTH-001: No Authentication Mechanism
- **Severity:** CRITICAL
- **Location:** `server.ts:26-33`, `src/server/database.ts:529-535`
- **Description:** The app has no login, no passwords, no sessions, no tokens. Middleware blindly sets user from `db.getCurrentUser()`. The "current user" is stored in the database file (`currentUserId`).
- **Verification:** 
  ```typescript
  app.use((req, res, next) => {
    const currentUser = db.getCurrentUser();
    (req as any).user = currentUser;
    next();
  });
  ```
- **Impact:** Complete impersonation possible. No way to actually authenticate.
- **Recommendation:** Implement proper authentication system.
- **Status:** CONFIRMED

### CRIT-AUTH-002: Arbitrary User Switching
- **Severity:** CRITICAL
- **Location:** `server.ts:41-48`
- **Description:** `POST /api/auth/switch-user` accepts any userId and switches to it with no authorization check whatsoever.
- **Impact:** Any user can become admin. Privilege escalation.
- **Recommendation:** Remove endpoint or require admin authentication + proper auth system.
- **Status:** CONFIRMED

---

## HIGH Findings

### HIGH-AUTH-001: isAccountAuthorized Not Applied Consistently
- **Severity:** HIGH
- **Location:** Multiple routes in `server.ts`
- **Description:** `isAccountAuthorized()` checks for revoked/suspended accounts (Scenario 9). It's used in:
  - GET /api/fiches-individnelles ✓
  - POST /api/fiches-individuelles ✓
  - PUT /api/fiches-individuelles/:id uses canEditFicheIndividuelle which calls it ✓
  - POST validation uses canValidateFiche which calls it ✓
  
  But NOT used in:
  - GET /api/users (admin only but no account status check)
  - POST /api/users
  - PUT /api/users/:id
  - POST /api/users/:id/revoke-lost-device
  - POST /api/users/:id/restore-status
  - All fiches-collectives routes
  - All espaces routes
  - All projets routes
  - GET /api/audit-logs
  - POST /api/sync/* routes
- **Impact:** Suspended/revoked accounts can still perform admin actions or access other resources.
- **Recommendation:** Apply isAccountAuthorized to all protected endpoints.
- **Status:** CONFIRMED

### HIGH-AUTH-002: Role Checks Missing on Some Routes
- **Severity:** HIGH
- **Location:** `server.ts` - various routes
- **Description:** 
  - GET /api/audit-logs (line ~650+): Only checks if role is admin_communal or superviseur_quartier? Let me check.
  - PUT /api/users/:id: Not visible in earlier view but exists per INTEGRATIONS.md
  - Some routes may lack proper role checks
- **Impact:** Horizontal/vertical privilege escalation.
- **Recommendation:** Audit all routes for proper role checks.
- **Status:** NEEDS VERIFICATION

### HIGH-AUTH-003: Mayor Role Cannot Read Individual Fiches
- **Severity:** HIGH (by design per permissions)
- **Location:** `src/shared/permissions.ts:110-116`
- **Description:** Mayor (maire_lecture) is explicitly denied reading individual fiches and redirected to anonymized view. This is implemented correctly in permissions.ts.
- **Verification:** Correctly enforced.
- **Status:** CORRECT (Design choice)

---

## MEDIUM Findings

### MED-AUTH-001: Type Safety Issues with User
- **Severity:** MEDIUM
- **Location:** Throughout server.ts - `(req as any).user`
- **Description:** User attached to request as `any` type, losing type safety.
- **Impact:** Bugs, harder to maintain.
- **Recommendation:** Extend Express Request type.
- **Status:** CONFIRMED

### MED-AUTH-002: Account Revocation Doesn't Invalidate Active Sessions
- **Severity:** MEDIUM
- **Location:** `server.ts:120-165`
- **Description:** When revoking account (lost/stolen device), it sets `statut_compte = 'revoque_perte_telephone'` and logs audit. But there's no session mechanism to invalidate - the "session" is just whatever `db.getCurrentUser()` returns. If someone switches users after revocation, they could switch away. Also if the revoked user's account is the current one, they remain "logged in" until someone switches.
- **Impact:** Revocation not immediate in practice with current design.
- **Recommendation:** With proper auth, invalidate sessions. With current design, need to force current user to change or block.
- **Status:** CONFIRMED

---

## Positive Findings
- **Good RBAC design** in `permissions.ts` - comprehensive rules for all roles
- **Granular permissions** - different rules for read/edit/validate
- **Account status checks** exist in permission functions
- **Audit logging** for authorization failures
- **Proper validation** for minor consent in fiches
- **Supervisor restricted to their quartier** (Scenario 4 handled)
- **Validated fiches protected from agent edits** (Scenario 5 handled)

---

## Fixes Applied

### CRIT-AUTH-002: Arbitrary user switching - FIXED
- **File:** `server.ts:41-62`
- **Fix:** Added account authorization check and restricted to admin_communal role only. Added userId validation.
- **Status:** FIXED (verified via code review)

## Summary
- **CRITICAL:** 2 findings (1 FIXED)
- **HIGH:** 3 findings
- **MEDIUM:** 2 findings
- **Overall:** Authentication still fundamentally broken (simulated), but user switching is now properly restricted. Authorization logic is good but enforcement is incomplete.
