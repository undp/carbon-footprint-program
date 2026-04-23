## Context

The `markdown-editor-side-by-side` change shipped a reusable admin `MarkdownEditor` with a flex-row layout: `@uiw/react-md-editor` on the left, `ExplanationContent` on the right. After rolling it out and using it on `CategoriesMaintainerScreen` and `SubcategoriesMaintainerScreen`, two issues emerged that the original design explicitly deferred or missed:

- The original design accepted the loss of scroll-sync on the assumption that explanations "are typically short." In practice maintainers write multi-section explanations that exceed the 480px viewport, and once they scroll the editor the preview no longer tracks the cursor.
- The original design did not account for the preview width differing from the end-user render width. Admins confirmed layout via a ~570px preview pane, but end users see the same content at ~1100px+ in the `ExplanationContext` dialog. Formatting bugs (table column reflow, image stretch, code block wrap) hide at narrow widths.

Constraints carried over from the prior change:

- MUI v7 + Tailwind stack; theme colors via `theme.palette.*`, no hex literals.
- Zero `pnpm lint` warnings (CI gate).
- No visual-regression test infrastructure — manual QA for UI-only changes.
- End-user explanation rendering (`ExplanationContent` + `ExplanationContext` dialog) must not regress.
- Only existing consumer is `ExplanationModal` in the Maintainer screens.

## Goals / Non-Goals

**Goals:**

- Give maintainers a preview that matches the end-user render width byte-for-byte.
- Eliminate scroll-desync by showing one pane at a time.
- Keep the component a controlled, reusable primitive for future admin flows.
- Preserve editor caret position and internal scroll across tab switches.
- Preserve viewer parity: preview still routes through `ExplanationContent`.

**Non-Goals:**

- Scroll-sync between panes — obsolete once only one pane is visible.
- Controlled `activeTab` prop, URL sync, persistence across modal opens. Internal state only.
- Keyboard shortcut to toggle tabs (MUI's default arrow-key navigation on the tab bar is sufficient for this admin-only surface).
- Automated tests (same rationale as the prior change).
- Layout responsive breakpoints — admin surfaces are desktop-only.

## Decisions

### 1. Layout: tabbed (Edit / Preview), one pane visible

**Decision**: Replace the flex-row container with a vertical stack: MUI `Tabs` on top, a single-panel content area below. Tab values: `"edit"` (default on mount) and `"preview"`.

**Why**:

- Full-width preview matches the end-user render width, so admins catch layout bugs that only manifest at the final viewing size.
- One-pane-at-a-time sidesteps scroll-sync entirely — the original design's deferred problem disappears instead of being solved.
- Tabs fit a ~46px tab bar above the existing 480px editor panel, a trivial vertical cost inside the `lg` modal (`maxHeight: 90vh`).

**Alternatives considered**:

- Keep side-by-side, add paired `onScroll` scroll-sync. Rejected — implements a feature the library intentionally omits, and does nothing about the width-mismatch problem.
- Resizable split (draggable divider). Rejected — solves width mismatch partially but not scroll-sync, and adds a stateful UI component (drag handle, persistence, a11y) for one screen.
- "Both" mode as a third tab alongside Edit/Preview. Rejected — restores the exact problems we are removing.

### 2. Tab values and labels in constants

**Decision**: Add `MARKDOWN_EDITOR_TAB` const object and `MARKDOWN_EDITOR_TAB_LABEL` record to `apps/web/src/components/markdown/constants.ts`. Shape:

```ts
export const MARKDOWN_EDITOR_TAB = {
  EDIT: "edit",
  PREVIEW: "preview",
} as const;

export type MarkdownEditorTab =
  (typeof MARKDOWN_EDITOR_TAB)[keyof typeof MARKDOWN_EDITOR_TAB];

export const MARKDOWN_EDITOR_TAB_LABEL: Record<MarkdownEditorTab, string> = {
  [MARKDOWN_EDITOR_TAB.EDIT]: "Edición",
  [MARKDOWN_EDITOR_TAB.PREVIEW]: "Vista previa",
};
```

**Why**: CLAUDE.md forbids magic strings for status/type-like values, and groups user-facing Spanish labels into `constants` files. Keeps internals (the tab id) and presentation (the Spanish label) in one place without inlining literals in the component.

### 3. Both panels mounted, inactive one hidden

**Decision**: Render both the `MDEditor` and the preview `<Box>` unconditionally. Toggle visibility via `sx={{ display: isActive ? "block" : "none" }}` on each panel wrapper.

**Why**:

- MDEditor's internal state (caret position, textarea scroll, focus) is preserved because the DOM node is never unmounted. Switching to Preview and back lands the user exactly where they were.
- The `ExplanationContent` preview re-renders on every keystroke even when hidden, but markdown rendering at the volume of a single explanation is cheap (remark + rehype + katex over a few KB of text). Not worth the caret-loss trade-off to gate it.

**Alternative considered**: use MUI `TabPanel`-style conditional rendering (unmount inactive pane). Rejected — MDEditor remount on every tab switch would lose caret position, which is the exact friction we are trying to reduce.

### 4. Remove `renderPreview` prop

**Decision**: Drop `renderPreview?: (value: string) => ReactNode` from the `MarkdownEditor` props. Hardcode the preview to `<ExplanationContent content={value} />`.

**Why**: The prior change justified the prop as a hedge for a future non-explanation admin editor. That future has not surfaced — zero external callers pass it today. YAGNI beats speculative extensibility. When a real second consumer appears with a different preview renderer, adding the prop back (or extracting a generic primitive) is a three-line change with a concrete use case to design against. Keeping it now costs an unused branch in the component and an unused `ReactNode` import.

**Revisit condition**: add the prop back (or split the component) the first time a caller actually needs a non-`ExplanationContent` preview. Not before.

### 5. Remove `disabled` prop

**Decision**: Drop `disabled?: boolean` from the `MarkdownEditor` props.

**Why**: Zero callers pass it. `ExplanationModal` already handles the read-only path _outside_ `MarkdownEditor`: when `readOnly={true}` it renders `<ExplanationContent content={value} />` directly and never mounts `MarkdownEditor`. Preserving `disabled` would require logic (auto-switch to Preview on disable, re-unlock on re-enable) that no code path exercises. Simpler to delete.

**Revisit condition**: add it back when a consumer mounts `MarkdownEditor` in a flow where the editor must be read-only but the tabbed surface itself is still the correct UI. Until then, `ExplanationContent` is the read-only primitive.

### 6. Tab styling mirrors `InventoryTabs`

**Decision**: Apply the same visual pattern as `apps/web/src/screens/CarbonInventories/components/InventoryTabs.tsx`:

- Indicator: 2px, `theme.palette.primary.main`.
- `minHeight: 46` on the Tabs container and each Tab.
- `textTransform: "none"`.
- `iconPosition="start"` with a small gap between icon and label.
- Subtle bottom border on the Tabs container acting as a divider.

**Why**: Consistent with existing tabbed surfaces in the admin app. Avoids inventing a bespoke tab look for a single feature.

### 7. Icons

**Decision**: `EditOutlined` for the Edit tab, `VisibilityOutlined` for the Preview tab, both from `@mui/icons-material`, `fontSize="small"`.

**Why**: Standard MUI outlined pair already used elsewhere in the app for edit/view semantics. No new icon dependency.

### 8. Component API shape (after this change)

```ts
interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  height?: number; // default 480, applies to the panel content area
  minHeight?: number; // applies to the panel content area
}
```

`height`/`minHeight` semantics: they size the panel content region. The tab bar adds ~46px above. Callers currently pass neither, so default behavior in `ExplanationModal` is unchanged modulo the extra ~46px tab bar inside the modal body.

## Risks / Trade-offs

- **Hidden-panel re-renders** → `ExplanationContent` re-parses markdown on every keystroke even on the inactive tab. Negligible for expected content sizes. If profiling flags it later, memoize the preview render against `value`.
- **Caret loss on tab switch** → Mitigated by keeping both panels mounted. Verify in manual QA that cursor position, selection, and textarea scroll survive an Edit → Preview → Edit round-trip.
- **Width-driven layout regressions revealed to admins** → Intended effect. After this ships, admins will see real end-user layout and may file follow-up bugs for previously hidden content that renders poorly at full width. Those are pre-existing issues surfaced by the change, not caused by it.
- **Library drift on `display: none` + focus** → Pinned-exact `@uiw/react-md-editor` already guards against minor bumps. If a future upgrade breaks hidden-panel focus behavior, the breakage is contained to the upgrade PR.

## Migration Plan

Frontend-only, non-breaking for consumers:

1. Update `constants.ts` with tab values and labels.
2. Rewrite `MarkdownEditor.tsx` (remove `renderPreview` and `disabled` props, replace flex-row with Tabs + stacked panels, preserve existing MDEditor and preview rendering logic).
3. No changes to `ExplanationModal` — the props it passes (`value`, `onChange`) are unchanged; the removed props were never passed.
4. Ship. No DB migration, no API deploy ordering, no dep update.

Rollback: revert the `MarkdownEditor.tsx` and `constants.ts` commit(s). No other files are affected.

## Open Questions

- None blocking. Persisting last-active tab across modal opens was considered and rejected: the modal unmounts on close (`{open && <ExplanationModalContent />}`), making persistence require an external store for a feature with unclear value. Default to Edit on every open.
