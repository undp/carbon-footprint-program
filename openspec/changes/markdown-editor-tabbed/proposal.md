## Why

The side-by-side markdown editor shipped by the prior change (`markdown-editor-side-by-side`) surfaced two usability problems in practice:

1. **Scroll desynchronization**: the library does not sync scroll positions between the editor and preview panes. As soon as a maintainer scrolls down past the first ~viewport of content (common while editing a long explanation), the preview no longer corresponds to what they are typing, defeating the purpose of the preview.
2. **Width mismatch with end-user rendering**: inside the `lg` modal each pane takes ~570px, but end users see the same markdown at ~1100px+ inside `ExplanationContent`. Layout bugs that only manifest at the larger width (wrapped tables, stretched images, column breaks) ship invisibly because the admin preview never reflects the real viewing width.

Both failures trace to the same cause: the split layout compresses the preview and disconnects it from the editing flow. A tabbed layout (Edit / Preview) lets the preview render at full container width — the same width the end user sees — and removes the scroll-sync expectation entirely by showing one pane at a time.

## What Changes

- **BREAKING** the layout requirement on `admin-markdown-editor`: drop the side-by-side flex-row layout; render the editor and preview in a tabbed container (`Edición` / `Vista previa`), one pane visible at a time.
- Remove the `renderPreview?: (value: string) => ReactNode` prop from `MarkdownEditor`. Zero callers pass it today; the speculative "future non-explanation admin flow" has not materialized. A future consumer can reintroduce a hook with a concrete use case.
- Remove the `disabled?: boolean` prop from `MarkdownEditor`. Zero callers pass it today; `ExplanationModal` handles the read-only path by rendering `ExplanationContent` directly, bypassing `MarkdownEditor` entirely.
- Keep both tab panels mounted in the DOM (inactive one hidden via `display: "none"`) so the editor's caret position, selection, and internal scroll survive tab switches.
- Default tab on mount: `Edición`. Consumers do not control it — internal state only.
- Tab styling mirrors `InventoryTabs` (2px primary indicator, `minHeight: 46`, `textTransform: "none"`, icon + label with start position). Icons: `EditOutlined` and `VisibilityOutlined`.

## Capabilities

### Modified Capabilities

- `admin-markdown-editor`: the reusable admin markdown editor is retained, but its layout requirement flips from side-by-side to tabbed, the `renderPreview` extension point is removed, and the `disabled` prop is removed. The component remains a controlled `value`/`onChange` primitive, lazy-loadable from `ExplanationModal`, forced to light theme, with the same toolbar command set.

## Impact

- **Frontend (web)**:
  - Modified: `apps/web/src/components/markdown/MarkdownEditor.tsx` (layout rewrite, prop removals, tab state).
  - Modified: `apps/web/src/components/markdown/constants.ts` (add tab value const + Spanish labels).
  - Unchanged: `apps/web/src/components/markdown/index.ts` (barrel re-export), `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` (public API of `MarkdownEditor` stays backward-compatible aside from the two removed props, neither of which this file passes).
- **Untouched**: `apps/web/src/components/ExplanationContent.tsx` and all end-user surfaces. No API, Zod schema, Prisma schema, `packages/types`, or dependency changes.
- **Tests**: no automated tests for the new layout (matches the prior change's decision — thin wrapper over a third-party library, no visual-regression infra in this repo). Manual QA covers both tabs on both maintainer screens.
- **Risk**:
  - Both panels mounted means `ExplanationContent` re-renders on every keystroke even when hidden. Acceptable: explanations are short, remark/rehype/katex handle the volume we expect. Revisit only if profiling flags it.
  - Caret/scroll preservation depends on `display: "none"` rather than unmounting. If the MDEditor's internal textarea loses focus on hide in a future library version, tab round-trips will feel jumpy. Pin-exact dependency already mitigates.
