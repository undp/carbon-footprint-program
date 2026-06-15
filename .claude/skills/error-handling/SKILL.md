---
name: error-handling
description: Error handling across API and web. Use when throwing, shaping, or translating errors — the shared error classes, error-response schema, Prisma error helpers, and the frontend error-message mapping.
---

# Error Handling

- **API errors**: throw custom error classes from `apps/api/src/errors/` (e.g., `DataIntegrityError`, `EmptyResourceError`, `DatabaseUniqueConstraintViolationError`). Services can throw these at any point — Fastify's error handler plugin catches them automatically and normalizes them into a standard response. Always reuse the existing error classes instead of defining new feature-specific ones; the shared set covers the common cases (not found, unique constraint violation, data integrity, empty resource, config error).
- **Error response schema**: use `ApiErrorResponseSchema` from `apps/api/src/commonSchemas/errors.ts` for error responses in route schemas (e.g., `response: { 404: ApiErrorResponseSchema }`).
- **Prisma errors**: use helpers like `extractP2002Fields()` from `apps/api/src/errors/` to handle unique constraint violations with meaningful messages.
- **Frontend error messages**: `getApiErrorMessage()` in `apps/web/src/utils/getApiErrorMessage.ts` maps API error codes to user-facing Spanish messages.
