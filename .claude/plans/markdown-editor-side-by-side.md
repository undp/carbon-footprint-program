# Plan — Side-by-side Markdown Editor (reusable)

## Context

Admins currently edit category/subcategory `explanation` fields via a plain `TextField` (`multiline`, `minRows=8`) inside `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx`. The content is markdown (commits `f92e8218`, `3b753e36`, `1b462d05` inlined explanations onto Category/Subcategory and already render it via `ExplanationContent` — react-markdown + remark-gfm + remark-math + rehype-katex + Tailwind prose).

Gap: there is no editor preview; admins write markdown blind and only see the rendered result after saving and re-opening the read-only dialog. Goal: ship a reusable side-by-side (live-preview) markdown editor, wire it into the category/subcategory admin modal, and keep it decoupled from any entity so future non-entity explanation flows can consume the same component.

## Decisions (from clarifying questions)

- Library: `@uiw/react-md-editor`. Pin exact version in `package.json` (no `^`) — CSS overrides target library-internal classnames and break on minor bumps.
- New reusable component: `MarkdownEditor` at `apps/web/src/components/markdown/MarkdownEditor.tsx`.
- **Preview integration — Plan B (split view, not library preview).** `MDEditor` runs with `preview="edit"` (editor pane only); the preview pane is a sibling `ExplanationContent` rendered in a flex row. Rationale: guarantees 1:1 parity with the end-user viewer (same component, same empty state, same prose styling), avoids fighting the library's internal preview, and sidesteps CSS leakage between library preview styles and Tailwind `prose`. Tradeoff accepted: no built-in scroll-sync (see deferred item below).
- **readOnly handling**: the current `ExplanationModal` read-only branch shows the raw markdown source in a disabled `TextField` — a latent bug. Branch confirmed live: `CategoriesMaintainerScreen.tsx` passes `readOnly={isViewOnly}` and `SubcategoriesMaintainerScreen.tsx` passes `readOnly={scope.isViewOnly}` (viewing older methodology versions). Keep the branch, but replace the disabled `TextField` with `<ExplanationContent content={value} />` so admins see the rendered output — same renderer as the end-user dialog.
- **Lazy loading**: import `MarkdownEditor` via `React.lazy` at the `ExplanationModal` call-site, wrapped in `<Suspense fallback={<spinner/>} />`. Editor + CodeMirror bundle (~300–500kb gzipped) is only fetched on admin maintainer screens — regular users don't pay.
- **Reusability escape hatch**: default preview is `ExplanationContent` (future explanation-maintainer flows for non-category/subcategory entities share the same markdown + GFM + math + prose flavor). Expose optional `renderPreview?: (value: string) => ReactNode` prop for consumers that need a different preview renderer. Zero cost, keeps the "reusable" label honest.
- Wire-in: replace the `TextField` body inside `ExplanationModal.tsx` with lazy-loaded `MarkdownEditor`. Keep the modal's existing "Explicación" label and save/cancel actions.
- Layout: always side-by-side (no responsive collapse).
- Features: toolbar (bold, italic, headings, list, link, code, quote), always-visible live preview, math + GFM support in preview. No fullscreen. No image upload and no image toolbar button.
- Size: fixed height ~480px; both panes scroll internally.
- Theme: force light mode via `data-color-mode="light"`; add CSS overrides to align toolbar/background with MUI light surface.
- API: `MarkdownEditor({ value: string, onChange: (next: string) => void, placeholder?: string, disabled?: boolean, height?: number, minHeight?: number, renderPreview?: (value: string) => ReactNode })`.
- Null handling: caller converts `null ↔ ""` (matches current `ExplanationModal` behavior — `value ?? ""` on open, `trim() === "" ? null : value` on save).
- Admin gating: rely on existing route-level `requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN])` on Maintainer routes + backend `fastify.requireRoles(...)` on `PATCH /api/categories/:id` and `PATCH /api/subcategories/:id`. No extra client-side check in the component (keeps it reusable for non-entity future uses).
- Validation: none (schema remains nullable + unbounded).
- Constants: `apps/web/src/components/markdown/constants.ts` for default height, placeholder, toolbar commands.
- Tests: none for this component (thin wrapper; manual QA on Maintainer screens).

### Deferred

- **Scroll-sync** between edit and preview panes. Library's built-in sync is lost in Plan B. Explanations are typically short (headings + a few paragraphs + optional table/formula) and fit within the 480px viewport. Revisit only if admins report friction with long content; cheap impl at that point is a paired `onScroll` handler syncing `scrollTop` by ratio.

## Files to create

- `apps/web/src/components/markdown/MarkdownEditor.tsx` — the reusable editor. Props as above. Internally:
  - Renders a flex row with two children of equal width, each fixed at `height ?? DEFAULT_MARKDOWN_EDITOR_HEIGHT` and `overflow: auto` so each pane scrolls independently.
  - **Left pane**: `@uiw/react-md-editor`'s `MDEditor` with `preview="edit"`, `hideToolbar={false}`, `visibleDragbar={false}`. Default export is used as a **named default export** so the component can be lazy-imported by consumers via `React.lazy`.
  - **Right pane**: `renderPreview?.(value) ?? <ExplanationContent content={value} />`. When `value === ""`, `ExplanationContent`'s built-in empty state renders automatically (`InfoOutlined` icon + hint).
  - Wrapping `<div>` forces `data-color-mode="light"`.
  - Toolbar: use library default command set minus the image command; configurable via `commands` / `extraCommands` props if future consumers need it.
- `apps/web/src/components/markdown/constants.ts`:
  - `DEFAULT_MARKDOWN_EDITOR_HEIGHT = 480`
  - `DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER = "Escribe la explicación en Markdown..."`
  - `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` (exported array of enabled command names, excludes image).
- `apps/web/src/components/markdown/index.ts` — barrel re-export (`MarkdownEditor`, constants).
- `apps/web/src/components/markdown/MarkdownEditor.css` (or co-located styled-wrapper using Tailwind `@apply` / MUI `sx`) — override editor toolbar + textarea colors to match `theme.palette.background.paper`, `theme.palette.text.primary`, `theme.palette.divider`. Keep overrides minimal.

## Files to modify

- `apps/web/package.json` — add `@uiw/react-md-editor` dependency with an **exact** (pinned) version. Run `pnpm install` at the repo root after edit. Confirm the library's declared React peer range accepts React 19.2 before committing; if it pins to 18, escalate before proceeding. `katex`/`rehype-katex`/`remark-math`/`remark-gfm` already present (used by `ExplanationContent`).
- `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` — replace the `TextField` with lazy-loaded `MarkdownEditor`:
  - Import via `const MarkdownEditor = React.lazy(() => import("@/components/markdown/MarkdownEditor"))` (or relative path equivalent).
  - Wrap the editor body in `<Suspense fallback={<spinner/>} />` so the admin pays the bundle cost on first open.
  - **readOnly branch**: callers confirmed (`CategoriesMaintainerScreen.tsx:620`, `SubcategoriesMaintainerScreen.tsx:411` both pass `readOnly={isViewOnly}`). Keep the branch; swap the disabled `TextField` for `<ExplanationContent content={value} />` so admins see rendered markdown — same renderer as the end-user `ExplanationContext` dialog.
  - Add a plain `<Typography>` "Explicación" label above the editor (move it out of the old `TextField`'s `label` prop, styled to match current form field label).
  - Preserve null/empty handling: pass `value ?? ""` into the editor; on save, map `""` back to `null` (current behavior).

## Files that stay untouched

- `apps/web/src/components/ExplanationContent.tsx` — reused as preview renderer.
- `apps/web/src/contexts/ExplanationContext.tsx` — read-only dialog path unchanged.
- Backend: category/subcategory PATCH endpoints, Zod schemas, Prisma schema — explanation field is already nullable + unbounded, accepts any markdown.
- `packages/types` — no schema changes.

## Reuse map (existing code leveraged)

- Viewer: `apps/web/src/components/ExplanationContent.tsx` (already wires react-markdown + remark-gfm + remark-math + rehype-katex + Tailwind prose; has built-in empty state).
- Admin route gating: `apps/web/src/utils/requireRole.ts` + `apps/web/src/interfaces/routes/routes.const.ts` (Maintainer routes already gated on `ADMIN`/`SUPERADMIN`).
- Modal shell + save/cancel: `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` (keep shell, swap body).
- Backend auth: `fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])` already on `apps/api/src/routes/api/categories/index.ts` and the subcategories sibling.

## Verification

1. `pnpm install` — confirm `@uiw/react-md-editor` resolves and React 19 peer is satisfied.
   1a. Confirm the readOnly branch renders via `ExplanationContent` in both callers (`CategoriesMaintainerScreen`, `SubcategoriesMaintainerScreen`) when `isViewOnly` is true.
   1b. With devtools Network tab, confirm the editor chunk is only downloaded after the modal opens (lazy split verified).
2. `pnpm type-check` — zero errors.
3. `pnpm lint` — zero warnings (CI requirement).
4. `pnpm format` — writes Prettier formatting.
5. Manual UI test (`pnpm dev` in `apps/web`):
   - Sign in as `SUPERADMIN`. Navigate to `/admin/categories`, click the "Agregar/Editar/Ver" button in the explanation column — modal opens with side-by-side editor + live preview.
   - Type markdown including: `# heading`, `**bold**`, a GFM table, and a math block `$$E=mc^2$$` — preview renders headings/bold/table/formula correctly and matches the end-user view on `CategoryCard`.
   - Clear the field, save — confirm the column shows "Agregar" again (saved as `null`). Open a different category with existing content, save without changes — value preserved.
   - Repeat on `/admin/subcategories`.
   - Sign in as plain `USER` and confirm `/admin/categories` redirects (existing route guard, sanity check).
6. Open a category on the inventory side (end-user path) and click its info button — `ExplanationContent` still renders correctly (no regression).

## Out of scope

- Image upload pipeline (confirmed).
- Dark mode theming.
- Fullscreen toggle.
- Responsive stacking / tabs.
- Replacing `ExplanationContent` or touching the context dialog.
- Any backend changes; Zod, schema, and endpoints already accept arbitrary nullable markdown.
