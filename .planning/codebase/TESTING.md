# Testing

## Current State
- **Test framework**: Node.js built-in test runner (`node --test`)
- **Test script**: `"test": "node --test"` in package.json
- **Test files**: None found in the codebase currently
- **Test coverage**: 0% (no tests implemented)

## Testing Strategy (Not Implemented)
The project does not currently have any test files. The test script is configured but no tests exist.

## Manual Testing
Given the nature of this application (field data collection for a commune), testing appears to be manual:
- Role-based UI flows tested by switching users
- Form validation tested through the UI
- Offline/sync functionality can be tested manually
- API endpoints tested via browser/network tools

## Recommendations
If tests were to be added, the stack supports:
- **Unit tests**: Node.js test runner can test pure functions (duplicateDetector, conflictResolver, permissions, kAnonymity)
- **Integration tests**: Could test API endpoints with Express
- **Component tests**: Could use React Testing Library with Vitest/Jest
- **E2E tests**: Could use Playwright/Cypress

## Notes
- The `lint` script runs `tsc --noEmit` for type checking (acts as a basic quality check)
- No test coverage tools configured
- No CI/CD configuration visible
