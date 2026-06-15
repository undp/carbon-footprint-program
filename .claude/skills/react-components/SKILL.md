---
name: react-components
description: React + UI conventions for apps/web (MUI v7 + Tailwind). Use when building or editing a React component — structure, theme colors, memoization, filter state, and Spanish-only UI text.
---

# Frontend & React Rules

- **One component per file**: each React component must live in its own file. Do not define multiple components or subcomponents in the same file.
- **Early returns**: handle loading, error, and edge cases with early returns at the top of the component rather than nesting the main content inside conditionals.
- **Avoid excessive ternaries in JSX**: prefer early returns or intermediate variables over inline ternary expressions in the render tree. A simple one-line ternary is acceptable; extract anything more complex.
- **UI stack**: MUI v7 + Tailwind CSS. Follow existing patterns for styling.
- **Use theme colors, never hardcoded values**: reference colors from the theme (`theme.palette.*`) instead of ad-hoc hex/rgb literals. Use `alpha()` and `darken()` from `@mui/material/styles` for transparency or shade variations. For category-specific colors use `theme.palette.requestTypeColors`, `theme.palette.recognitionTypeColors`, and the `CATEGORY_COLORS` utility in `utils/categoryColors.ts`. If a required color doesn't exist, add it to `apps/web/src/theme/palette.ts` (and augment the type in `undp-huella-latam.theme.d.ts`) rather than hardcoding it inline.
- **Avoid prop drilling**: when data is needed across many component levels, use the Context API or an external state library like Zustand instead of passing props through intermediate components.
- **Memoization**: prevent unnecessary re-renders with `React.memo`, `useMemo`, and `useCallback`. Only reach for `useCallback` when the consumer is memoized or the function lands in a hook dependency array — never wrap a bare `setState`.
- **Screen filter state in query params**: store screen-level filter selections (header dropdowns, search inputs) in URL query params, not local component state. This makes filters shareable, bookmarkable, and persistent across navigation.
- **Status chips**: every status chip must show a tooltip; the tooltip text is required in the centralized chip config.
- **Language**: all user-facing text is in Spanish (no i18n library). Dates use `date-fns` with the Spanish locale (`es`). Labels, placeholders, error messages, tooltips, and button text are all in Spanish.
