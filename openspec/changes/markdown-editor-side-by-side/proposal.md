## Why

Admins currently edit category and subcategory `explanation` markdown blind in a plain MUI `TextField` — there is no preview, so they only see rendered output after saving and reopening a read-only dialog. Formatting bugs, broken math blocks, or malformed GFM tables ship silently. Worse, the read-only branch of the same modal today shows the raw markdown source in a disabled `TextField` rather than rendered output — a latent bug for "view older methodology version" flows. We also anticipate a future explanation maintainer for non-category/subcategory content, so the editor should be built as a reusable admin component from day one.

## What Changes

- Add `MarkdownEditor`, a reusable admin component at `apps/web/src/components/markdown/MarkdownEditor.tsx`. Side-by-side layout: `@uiw/react-md-editor` edit pane on the left, rendered preview on the right.
- Preview renderer is `ExplanationContent` by default (same component the end-user dialog uses — guarantees viewer parity for markdown + GFM + math + `prose`). Consumers can override via an optional `renderPreview` prop for future non-explanation use cases.
- Wire the new editor into `ExplanationModal.tsx` (used by `CategoriesMaintainerScreen` and `SubcategoriesMaintainerScreen`), replacing the plain `TextField` in edit mode.
- Fix the read-only branch of `ExplanationModal` to render via `ExplanationContent` instead of a disabled raw-source `TextField`. Branch is confirmed in use: both maintainer screens pass `readOnly={isViewOnly}` for older methodology versions.
- Lazy-load the editor (including its CodeMirror/react-md-editor bundle) at the `ExplanationModal` call-site via `React.lazy` + `Suspense`. Regular users do not pay the ~300–500kb gzipped cost; admin pays only on first open.
- Add `@uiw/react-md-editor` as a new `apps/web` dependency, pinned to an exact version (CSS overrides target library-internal classnames and break on minor bumps).
- Force light theme, strip the image toolbar command, fixed ~480px height with independent scroll per pane. No fullscreen, no image upload, no responsive stacking in this change.

## Capabilities

### New Capabilities

- `admin-markdown-editor`: Reusable side-by-side markdown editor for admin screens. Covers the component contract (props, default preview renderer, lazy-load requirement), its integration into the category/subcategory explanation modal (edit + read-only paths), and the extension point for future admin flows that need a different preview renderer.

### Modified Capabilities

<!-- None — the end-user `ExplanationContent` viewer, the `ExplanationContext` dialog, the category/subcategory API contract, and the database shape are all unchanged. -->

## Impact

- **Frontend (web)**:
  - New: `apps/web/src/components/markdown/MarkdownEditor.tsx`, `apps/web/src/components/markdown/constants.ts`, `apps/web/src/components/markdown/index.ts`, co-located CSS overrides for the `@uiw/react-md-editor` toolbar/background to align with the MUI light palette.
  - Modified: `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` (body swap, lazy import, readOnly renders via `ExplanationContent`).
  - Modified: `apps/web/package.json` (`@uiw/react-md-editor` dep, pinned).
- **Untouched**: `apps/web/src/components/ExplanationContent.tsx`, `apps/web/src/contexts/ExplanationContext.tsx`, all end-user surfaces (`SubcategoryPreselectionField`, `CategoryCard`, `EmissionEditorHeader`, `ReductionPlanScreen`). No API, Zod schema, Prisma schema, or `packages/types` changes — explanation fields are already nullable strings and accept arbitrary markdown.
- **Tests**: no automated tests for the new component (thin wrapper over a third-party library). Manual QA covers both edit and read-only paths on category and subcategory maintainer screens, verifies the end-user explanation dialog still renders correctly (no regression), and confirms the editor chunk is lazy-loaded via devtools network inspection.
- **Risk**:
  - `@uiw/react-md-editor` peer-dependency range must accept React 19.2 (repo currently on React 19). Pre-install check required; escalate before merge if the library pins to React 18.
  - CSS overrides target library-internal class names (`.w-md-editor-*`); pin the library version exactly to avoid drift on minor bumps.
  - Bundle size: ~300–500kb gzipped added to admin routes only via lazy-loading — verify chunk split in Network tab during QA.
