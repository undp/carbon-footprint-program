---
name: Frontend Development
description: Standards for building frontend features in apps/web with React + MUI v7 + Tailwind — component structure (one per file, early returns), theme colors only, state management, TanStack Router routing, TanStack Query data fetching, React Hook Form + Zod forms, and Spanish-only UI text. Use when creating or editing any React component, route, query/mutation hook, or form.
when_to_use: Use when adding or editing a React component, defining a route or route guard, writing a query/mutation hook or query keys, building a form, choosing colors/styles, managing screen filter state, or writing user-facing text (always Spanish).
---

# Frontend Development

Frontend rules for `apps/web` (React + MUI v7 + Tailwind). All user-facing text is in **Spanish** — there is no i18n library.

## React component rules

- **One component per file.** Do not define multiple components or subcomponents in the same file.
- **Early returns** for loading, error, and edge-case states — check at the top of the component and return early instead of nesting the main content inside conditionals.
- **Avoid excessive ternaries in JSX.** Prefer early returns or intermediate variables. A simple one-line ternary is fine; extract anything more complex.
- **Avoid prop drilling.** When data is needed across many levels, use the Context API or Zustand instead of threading props through intermediate components.
- **Memoization.** Use `React.memo` for components and `useMemo`/`useCallback` for expensive calculations and callbacks passed as props, to prevent unnecessary re-renders.

## Styling — theme colors, never hardcoded values

- Always reference colors from the theme (`theme.palette.*`) instead of ad-hoc hex/rgb literals.
- Use MUI helpers `alpha()` and `darken()` from `@mui/material/styles` for transparency or shade variations.
- For category-specific colors use the existing patterns: `theme.palette.requestTypeColors`, `theme.palette.recognitionTypeColors`, and the `CATEGORY_COLORS` utility in `utils/categoryColors.ts`.
- If a required color doesn't exist, add it to `apps/web/src/theme/palette.ts` (and augment the type in `undp-huella-latam.theme.d.ts`) rather than hardcoding inline.

## Routing & data fetching

- **Router**: TanStack Router with file-based routing in `apps/web/src/routes/`. `routeTree.gen.ts` is auto-generated — never edit it manually.
- **Route guards**: use `beforeLoad` in route definitions for auth checks and redirects.
- **Layout routes**: `app.tsx` and `admin.tsx` are layout wrappers for nested routes.
- **Server state**: TanStack Query v5. Query and mutation hooks live in `apps/web/src/api/query/`, organized by domain (e.g. `query/organizations/`, `query/carbonInventories/`).
- **Query key factories**: each domain defines a keys file (e.g. `apps/web/src/api/query/organizations/keys.ts`) with a structured key object (`organizationKeys.all`, `.detail(id)`, `.users(orgId)`). Use these for cache invalidation.
- **HTTP client**: `ky` via `apiClient` in `apps/web/src/api/http/client.ts`. Auth tokens are injected automatically in a `beforeRequest` hook via MSAL.
- **Screen filter state in query params**: store screen-level filter selections (header dropdowns, search inputs) in URL query params, not local state, so filters are shareable, bookmarkable, and persistent across navigation.

## Forms

- **Library**: React Hook Form with `Controller` — no Formik.
- **Reusable components**: use the existing components in `apps/web/src/components/form/` (`FormTextField`, `FormSelectField`, `FormDateField`, `FormAutocompleteField`, `FormFileUpload`, etc.). They accept `control` and `name` props.
- **Validation**: use Zod schemas via `@hookform/resolvers/zod`. Define the schema with Spanish error messages using Zod's `message` option (e.g. `z.string().min(1, { message: "Este campo es obligatorio" })`), then pass it to `useForm` as `resolver: zodResolver(mySchema)`.

## Spanish UI & dates

- All labels, placeholders, error messages, tooltips, and button text are in Spanish.
- Dates use `date-fns` with the Spanish locale (`es`).

## Error messages

`getApiErrorMessage()` in `apps/web/src/utils/getApiErrorMessage.ts` maps API error codes to user-facing Spanish messages — use it for displaying API errors.

## Related skills

- Where to place constants and utils: see the **Constants & Utils Placement** skill.
- API contract types to derive component types from: see the **TypeScript Conventions** skill.
