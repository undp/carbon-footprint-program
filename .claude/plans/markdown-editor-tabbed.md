# Plan — Migrate MarkdownEditor from side-by-side to tabbed (Edit / Preview)

> Note: memory preference says `/create-plan` output should live under the project's `.claude/plans/`, but plan-mode restricts edits to this single designated file. Move it into `apps/web/...` or the project `.claude/plans/` after approval if desired.

## Context

Currently `apps/web/src/components/markdown/MarkdownEditor.tsx` renders the `@uiw/react-md-editor` textarea and a live `ExplanationContent` preview side-by-side inside a flex row. That doubles the horizontal footprint and forces a narrow editor inside modals (e.g. `ExplanationModal`). Switching to a tab-based layout (Edit / Preview) lets the editor use the full width of its container while preserving the preview as a one-click toggle. No functional change to markdown rendering or toolbar — this is purely a layout/UX swap.

Only caller today is `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx`, which passes no `renderPreview` and no custom `height`/`minHeight`. Migration risk is low.

## Decisions (from clarifications)

- **Tab labels (Spanish):** `Edición` / `Vista previa`.
- **Default tab:** `Edit` on mount (fallback to `Preview` when `disabled=true`).
- **Preview impl:** reuse `ExplanationContent` (same as today). `renderPreview` prop is dropped — no caller uses it and the tabbed API stays smaller.
- **Mounting:** both panels stay mounted; inactive one hidden via `sx={{ display: "none" }}` so editor caret/scroll survive toggles.
- **Icons:** `EditOutlined` + `VisibilityOutlined` from `@mui/icons-material`, `iconPosition="start"`.
- **Disabled state:** Edit tab is disabled; component auto-selects Preview. User can still switch back only if `disabled` becomes false again.
- **Tab values:** const object in `./constants.ts` (no magic strings, per CLAUDE.md).
- **Tab bar:** top, left-aligned; indicator 2px primary, `minHeight: 46`, `textTransform: "none"`, icon+label gap — mirrors `InventoryTabs`.
- **Height semantics:** `height`/`minHeight` apply to the panel content area; tab bar adds ~46 px above.
- **State:** internal only (no controlled `activeTab` prop).
- **A11y:** rely on MUI Tabs defaults.
- **Toolbar:** keep `MARKDOWN_EDITOR_TOOLBAR_COMMANDS`.
- **Tests:** skip — manual verify in dev server.
- **Keyboard shortcut:** none.

## Files to modify

1. `apps/web/src/components/markdown/constants.ts` — add tab const + labels.
2. `apps/web/src/components/markdown/MarkdownEditor.tsx` — rewrite render to tabs.

No changes required to:

- `apps/web/src/components/markdown/index.ts` (re-export stays).
- `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` (public API is backward-compatible minus the unused `renderPreview` prop).

## Implementation outline

### 1) `constants.ts`

Add:

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

### 2) `MarkdownEditor.tsx`

- Drop `renderPreview` from props and the `ExplanationContent`-override branch.
- Replace root `Box` flex-row container with a vertical stack (`Tabs` on top, panels below).
- Introduce internal state `const [activeTab, setActiveTab] = useState<MarkdownEditorTab>(disabled ? MARKDOWN_EDITOR_TAB.PREVIEW : MARKDOWN_EDITOR_TAB.EDIT)`.
- `useEffect` watching `disabled`: when it flips to `true`, force `setActiveTab(PREVIEW)`.
- Render `<Tabs value={activeTab} onChange={(_, next) => setActiveTab(next)} sx={tabsSx} aria-label="Editor de markdown">` with:
  - `<Tab value={MARKDOWN_EDITOR_TAB.EDIT} label={MARKDOWN_EDITOR_TAB_LABEL.edit} icon={<EditOutlinedIcon fontSize="small" />} iconPosition="start" disabled={disabled} />`
  - `<Tab value={MARKDOWN_EDITOR_TAB.PREVIEW} label={MARKDOWN_EDITOR_TAB_LABEL.preview} icon={<VisibilityOutlinedIcon fontSize="small" />} iconPosition="start" />`
- Panels:
  - Edit panel: existing `MDEditor` (unchanged props: `value`, `onChange`, `preview="edit"`, toolbar commands, textareaProps). Wrap in a `Box` whose `sx` sets `display: activeTab === EDIT ? "block" : "none"`.
  - Preview panel: `Box` with the current preview styling (border, radius, padding, `overflow: "auto"`, `height`, `minHeight`) rendering `<ExplanationContent content={value} />`; its `sx.display` toggles off when Edit is active.
- Container `sx`: keep CSS custom-property assignments (`--color-fg-default`, etc.) on the outer wrapper so MDEditor theming remains consistent. Convert `flexDirection` to `column` and drop the `gap: 2`.
- Tab `sx` mirrors `InventoryTabs.tsx`: `minHeight: 46`, `"& .MuiTab-root": { minHeight: 46, textTransform: "none", gap: 1 }`, `"& .MuiTabs-indicator": { height: 2, backgroundColor: "primary.main" }`, plus a subtle bottom border divider.

### Prop changes (public API)

Before:

```ts
interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  minHeight?: number;
  renderPreview?: (value: string) => ReactNode;
}
```

After:

```ts
interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  minHeight?: number;
}
```

`renderPreview` removal is safe — grepped: zero callers pass it. `ReactNode` import becomes unused and must be removed.

## Reuse notes

- `ExplanationContent` (`apps/web/src/components/ExplanationContent.tsx`) stays as the preview renderer — reuse verbatim.
- Tab styling pattern lifted from `apps/web/src/screens/CarbonInventories/components/InventoryTabs.tsx`.
- Constants for height/placeholder/toolbar already live in `./constants.ts`; new tab constants belong there.

## Verification

1. `pnpm install` (session setup) then `pnpm format && pnpm lint && pnpm type-check` — must pass clean.
2. Start dev server (`pnpm dev` at repo root) and open the Maintainer screen that surfaces `ExplanationModal`:
   - Open the modal → Edit tab is active by default, MDEditor visible with toolbar.
   - Type markdown (e.g. `# Hola` + list items) → text persists.
   - Switch to `Vista previa` → rendered HTML matches input via `ExplanationContent`; math / GFM still work.
   - Switch back to `Edición` → cursor/scroll/text preserved (both panels mounted).
   - Clear content, switch to Preview → empty-state message `"No existe una explicación disponible aún"` shows.
   - Save & close modal → unchanged behavior.
3. Sanity-check dark/light theme: MDEditor CSS vars still sourced from MUI theme (`--color-fg-default`, etc.).
4. Manually set `disabled` on the component in a local override → Edit tab appears disabled, Preview active; value still rendered read-only.

## Out of scope

- No changes to `@uiw/react-md-editor` version or toolbar commands.
- No new tests (per decision).
- No updates to `ExplanationModal` layout/sizing — rely on the existing modal width.
