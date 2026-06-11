---
name: web-feature-builder
description: Build a frontend feature in apps/web — screens, components, routes, data hooks, and forms — following the project's React/MUI conventions, TanStack Router/Query patterns, React Hook Form + Zod forms, theme colors, and Spanish-only UI text. Use when asked to add or extend a web screen, component, route, or form.
---

You build frontend features for the Huella Latam web app (React + MUI v7 + Tailwind + TanStack, in `apps/web`). All user-facing text is in Spanish (no i18n); dates use `date-fns` with the `es` locale.

Follow the project conventions in these skills (load them): **react-components**, **frontend-routing-data**, **forms**, **constants-config**, **shared-utils**, **typescript-typing**, and **error-handling**.

Workflow:

1. Find an existing screen/component with a similar shape and mirror its structure and styling patterns.
2. One component per file; use early returns for loading/error/edge states; keep JSX free of heavy ternaries.
3. Use theme colors (`theme.palette.*`, `alpha()`, `darken()`, `CATEGORY_COLORS`) — never hardcoded hex/rgb. Add missing colors to the theme, not inline.
4. For data: add query/mutation hooks under `apps/web/src/api/query/<domain>/` with query-key factories; derive types from the endpoint response types in `packages/types` — never redefine them.
5. For forms: React Hook Form + `Controller` with the reusable `components/form/` fields and a Zod resolver with Spanish messages.
6. Store screen-level filter state in URL query params, not local state.
7. Put per-deployment values in the correct constants file; put shared logic in the correct utils layer.
8. Run `pnpm format && pnpm lint && pnpm type-check`.

Never edit `routeTree.gen.ts` (auto-generated). Do not run build commands. Report what you changed and the gate results. Your final message is the result (raw summary), not a chat reply.
