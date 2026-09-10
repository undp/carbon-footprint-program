---
name: error-handling
description: Error handling across API and web. Use when throwing, shaping, or translating errors — the shared error classes, error-response schema, Prisma error helpers, and the frontend error-message mapping.
---

# Error Handling

- **API errors**: throw custom error classes from `apps/api/src/errors/` (e.g., `DataIntegrityError`, `EmptyResourceError`, `DatabaseUniqueConstraintViolationError`). Services can throw these at any point — Fastify's error handler plugin catches them automatically and normalizes them into a standard response. Reuse a shared class whenever the frontend has nothing feature-specific to say about the failure; the shared set covers the common cases (not found, unique constraint violation, data integrity, empty resource, config error).
- **Feature error classes**: when the failure needs its own user-facing Spanish copy, declare a `createError` class in the feature's `errors.ts` (`features/<feature>/errors.ts`, e.g. `SubcategoryPositionAlreadyExistsError`, `SameCategoryError`) and add its code to `getApiErrorMessage`. The distinguishing detail is the error _code_: `getApiErrorMessage` keys off it, so a shared class would collapse several messages into one. Keep the class in the feature that owns the rule, mirror the naming of the sibling feature (categories/subcategories are the reference pair), and give the code the same wording in both.
- **Error response schema**: use `ApiErrorResponseSchema` from `apps/api/src/commonSchemas/errors.ts` for error responses in route schemas (e.g., `response: { 404: ApiErrorResponseSchema }`).
- **Prisma errors**: use helpers like `extractP2002Fields()` from `apps/api/src/errors/` to handle unique constraint violations with meaningful messages.
- **Frontend error messages**: `getApiErrorMessage()` in `apps/web/src/utils/getApiErrorMessage.ts` maps API error codes to user-facing Spanish messages.
