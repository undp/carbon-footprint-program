## Context

Category and Subcategory `explanation` fields were recently inlined as nullable markdown on their own rows (see archived change `explanation-inline-refactor`). The end-user path renders them via `ExplanationContent` (`react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + Tailwind `prose`) inside the `ExplanationContext` dialog, triggered from `SubcategoryPreselectionField`, `CategoryCard`, `EmissionEditorHeader`, and `ReductionPlanScreen`.

The admin-side editor is `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx`, used by both `CategoriesMaintainerScreen` and `SubcategoriesMaintainerScreen`. Today the modal body is a plain multiline `TextField`:

- **Edit mode**: admins type markdown with no preview. They only see the rendered output after saving and reopening.
- **Read-only mode** (`readOnly={isViewOnly}` for "view older methodology version" flows in both callers): the same `TextField` renders raw markdown source in a disabled input — not rendered HTML.

A future admin feature is planned: an explanation maintainer that edits explanation content for entities beyond Category/Subcategory. The editor should be reusable for that flow without refactoring.

Constraints:

- MUI v7 + Tailwind stack; theme colors must come from `theme.palette.*`, not hardcoded literals.
- Zero new warnings in `pnpm lint` (CI gate).
- No test infrastructure for visual components in this repo today; manual QA is the norm for thin wrappers.
- End-user surfaces must not regress — preview must be byte-for-byte the same renderer the user sees.

## Goals / Non-Goals

**Goals:**

- Ship a single reusable `MarkdownEditor` component usable by any current or future admin flow.
- Deliver viewer parity between editor preview and end-user rendered markdown (same component, same plugins, same CSS).
- Fix the read-only branch of `ExplanationModal` so admins see rendered markdown instead of raw source.
- Keep the new dependency's cost off non-admin routes via lazy-loading.
- Leave the end-user explanation flow untouched.

**Non-Goals:**

- Image upload, fullscreen mode, dark-mode theming, responsive collapse / mobile stacking.
- Scroll-sync between edit and preview panes (deferred; short explanations fit within the 480px viewport and do not need synchronization in practice).
- Field-level validation or length limits (schema remains nullable and unbounded).
- Replacing `ExplanationContent`, the `ExplanationContext` dialog, or any end-user markdown rendering.
- Backend changes of any kind (Zod schemas, Prisma schema, API contracts).
- Extracting a shared "Markdown" package to `packages/` — premature until a second consumer exists.

## Decisions

### 1. Library: `@uiw/react-md-editor`, pinned exact

**Decision**: Use `@uiw/react-md-editor` as the editor pane, pinned to an exact version in `apps/web/package.json` (no `^`).

**Why**: Mature library, GFM-aware, provides a configurable toolbar out of the box. Pinning avoids the risk that CSS overrides targeting `.w-md-editor-*` classes silently break on a minor bump.

**Alternatives considered**:

- Roll our own `<textarea>` + toolbar on top of `react-markdown` for the preview. Rejected — reinventing command palette, history, and selection handling for marginal gain.
- `@mdxeditor/editor`. Rejected — heavier WYSIWYG surface than needed; we want to keep the source-markdown mental model for admins.
- `react-simplemde-editor` / `easymde`. Rejected — less React-idiomatic API surface.

**Pre-check**: confirm the installed version's React peer range accepts React 19.2 before proceeding. Escalate if it pins to React 18.

### 2. Preview integration: Plan B (split view), not the library's `preview="live"` mode

**Decision**: Run `MDEditor` with `preview="edit"` (editor pane only). Render the preview as a sibling component in a flex row, inside `MarkdownEditor`'s own layout. Preview renderer defaults to `<ExplanationContent content={value} />`.

**Why**:

- **Parity**: the preview is _literally_ the same component the end user sees. No chance of divergence in plugin set, prose styling, or empty state.
- **Avoids fighting library internals**: `previewOptions.components` lets you override renderers but does not cleanly let you swap in a wholly different subtree carrying its own styles (Tailwind `prose`, the built-in `InfoOutlined` empty state).
- **No CSS leakage**: the library's own preview pane ships styles for `.wmde-markdown` that would collide with `prose`. Side-stepping it keeps the Tailwind utility approach intact.

**Trade-off accepted**: lose the library's built-in scroll-sync. Explanations are typically short (headings + a few paragraphs + optional table/formula) and fit within the 480px viewport. If admins report friction with long content later, revisit with a paired `onScroll` handler syncing `scrollTop` by ratio.

### 3. Reusability via `renderPreview` prop, default `ExplanationContent`

**Decision**: Component API includes an optional `renderPreview?: (value: string) => ReactNode`. Default is `(value) => <ExplanationContent content={value} />`.

**Why**: The future "explanation maintainer" described in the problem statement will also render markdown with GFM + math + `prose` — same flavor as today. Defaulting to `ExplanationContent` covers that case with zero consumer boilerplate. Exposing the prop as an escape hatch keeps the "reusable" label honest for any non-explanation future admin editor that needs a different preview, at near-zero implementation cost.

**Alternative considered**: hardcode `ExplanationContent` and rename the component `ExplanationMarkdownEditor`. Rejected — the three lines needed for a render prop outweigh the risk of a future rename if a non-explanation consumer emerges.

### 4. Lazy-load at the `ExplanationModal` call-site

**Decision**: Import `MarkdownEditor` via `React.lazy` inside `ExplanationModal.tsx`, wrapped in `<Suspense fallback={<spinner/>} />`. Export the component as a `default export` so lazy-import shape is idiomatic (named re-export also available from the barrel for consumers that don't need lazy).

**Why**: `@uiw/react-md-editor` plus its CodeMirror bundle is ~300–500kb gzipped. Only maintainer admin routes use it. Lazy-splitting keeps regular end-user bundles unchanged. The admin pays the download only on first modal open.

**Where the split goes**: at `ExplanationModal`, not at the screen level. The modal is conditionally rendered inside the maintainer screens anyway, but doing the split _inside_ the modal means any future admin flow that imports `MarkdownEditor` directly from the barrel also benefits without needing its own lazy wiring — they just import via `React.lazy(() => import("@/components/markdown/MarkdownEditor"))`.

### 5. readOnly branch renders via `ExplanationContent`

**Decision**: Keep the `readOnly` prop on `ExplanationModal`. When true, render `<ExplanationContent content={value} />` inside the dialog body instead of a disabled `TextField`.

**Why**: Branch is confirmed in use (`CategoriesMaintainerScreen.tsx:620` and `SubcategoriesMaintainerScreen.tsx:411` both pass `readOnly={isViewOnly}` for "view older methodology version"). The current disabled `TextField` shows raw markdown source — inconsistent with the end-user rendered view and inconsistent with what `readOnly` should mean for a markdown field.

### 6. Fixed layout, forced light theme

**Decision**: Fixed height `DEFAULT_MARKDOWN_EDITOR_HEIGHT = 480`; both panes `overflow: auto` and scroll independently. Side-by-side always (no responsive collapse). Force `data-color-mode="light"` on a wrapping `<div>` and add minimal CSS overrides to align toolbar + editor background with MUI light surface (`theme.palette.background.paper`, `theme.palette.text.primary`, `theme.palette.divider`). No hex literals — use `theme.palette.*` via `sx` or a tiny CSS file co-located with the component.

**Why**: The entire admin UI is currently light-mode only. Dark theming is out of scope. Responsive collapse is out of scope (maintainer screens are desktop-only admin surfaces). 480px is comfortable on a 13" laptop without dominating the dialog.

### 7. Component API shape

```
MarkdownEditor({
  value: string,
  onChange: (next: string) => void,
  placeholder?: string,                                    // default from constants
  disabled?: boolean,
  height?: number,                                         // default 480
  minHeight?: number,
  renderPreview?: (value: string) => ReactNode,            // default <ExplanationContent content={value} />
})
```

- Null handling stays at the caller (`ExplanationModal` maps `value ?? ""` on open, `trim() === "" ? null : value` on save — current behavior preserved).
- No React Hook Form integration in this change. The component is a controlled `value`/`onChange` primitive; the existing `ExplanationModal` uses local `useState`, not RHF. A future RHF adapter can wrap it trivially when needed.
- Admin gating lives at the route (`requireRole([SystemRole.SUPERADMIN, SystemRole.ADMIN])` on maintainer routes) and the backend (`fastify.requireRoles` on `PATCH /api/categories/:id` and `PATCH /api/subcategories/:id`). The component has no opinion on who may edit, keeping it reusable.

### 8. No automated tests for the new component

**Decision**: Ship without unit or integration tests for `MarkdownEditor`. Manual QA only, tracked in `tasks.md`.

**Why**: It is a thin orchestration layer over a third-party editor and an existing renderer. The repo has no visual-regression infrastructure. Adding JSDom/RTL tests for a library that heavily leans on browser contenteditable primitives would be high cost, low signal. The two callers (`CategoriesMaintainerScreen`, `SubcategoriesMaintainerScreen`) do not have existing tests either.

## Risks / Trade-offs

- **React 19 peer compatibility** → Pre-install check: verify `@uiw/react-md-editor`'s peer-range accepts React 19.2. If the installed version pins to React 18, escalate before merge; do not silence with `--legacy-peer-deps`.
- **CSS override drift across library minors** → Pin exact version. Co-locate overrides in a named CSS file so future upgrades see diffs in one place.
- **Bundle size** → Lazy-load inside `ExplanationModal`. Verified by inspecting network waterfall in devtools during QA — the editor chunk must not appear in the initial admin bundle.
- **Preview parity regression** → Default preview is literally `ExplanationContent`; no separate rendering code path. Any future change to explanation rendering automatically applies here.
- **Scroll-sync absence for long explanations** → Accepted; revisit if real usage surfaces friction. Cheap follow-up (paired `onScroll`).
- **readOnly behavior change** → Today readOnly shows raw source in a disabled `TextField`; after this change it shows rendered output. Manual QA must confirm "Ver Explicación" title + "Cerrar" button still render correctly when readOnly is true.
- **Toolbar command list hardcoded** → Image button removed; other defaults kept. If a future admin flow needs a different command set, expose `commands`/`extraCommands` as pass-through props then. Don't preemptively add surface area.

## Migration Plan

This is an additive frontend change:

1. Add dep + constants + new component (no behavior change yet — nothing imports it).
2. Wire into `ExplanationModal` (behavior change: editor preview appears; readOnly branch now renders markdown).
3. Ship. No DB migration, no API deploy ordering.

Rollback: revert the `ExplanationModal` commit to restore the plain `TextField`. The new component files can stay dormant without impact. Reverting the dep alone is also safe if the component is not imported by anything else.

## Open Questions

- None blocking. Scroll-sync decision is explicitly deferred.
