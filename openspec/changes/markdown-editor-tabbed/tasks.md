## 1. Prerequisite

- [x] 1.1 Archive the shipped `markdown-editor-side-by-side` change (`openspec archive markdown-editor-side-by-side`) so the canonical `admin-markdown-editor` spec exists at `openspec/specs/admin-markdown-editor/spec.md` before this change's deltas are applied. Tick all 30 tasks in the prior change's `tasks.md` first if the archive command requires task completion.

## 2. Constants

- [x] 2.1 In `apps/web/src/components/markdown/constants.ts`, add:
  - `MARKDOWN_EDITOR_TAB = { EDIT: "edit", PREVIEW: "preview" } as const`.
  - `MarkdownEditorTab` type derived from `MARKDOWN_EDITOR_TAB`.
  - `MARKDOWN_EDITOR_TAB_LABEL: Record<MarkdownEditorTab, string>` with `"Edición"` and `"Vista previa"`.
- [x] 2.2 Keep existing exports (`DEFAULT_MARKDOWN_EDITOR_HEIGHT`, `DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER`, `MARKDOWN_EDITOR_TOOLBAR_COMMANDS`) untouched.

## 3. MarkdownEditor component rewrite

- [x] 3.1 Remove `renderPreview?: (value: string) => ReactNode` from the `MarkdownEditorProps` interface. Remove the unused `ReactNode` import.
- [x] 3.2 Remove `disabled?: boolean` from the `MarkdownEditorProps` interface. Remove the `disabled` destructure and the `textareaProps.disabled` passthrough.
- [x] 3.3 Replace the flex-row container with a vertical stack:
  - Outer `Box` keeps `data-color-mode="light"` and the CSS-custom-property theme overrides; change `flexDirection` to `column` and drop the horizontal `gap: 2` applied to the flex row. Keep any width constraints intact.
  - Render `<Tabs value={activeTab} onChange={handleChange} aria-label="Editor de markdown">` as the first child, with styling mirroring `apps/web/src/screens/CarbonInventories/components/InventoryTabs.tsx` (2px primary indicator, `minHeight: 46`, `textTransform: "none"`, icon gap, subtle bottom-border divider). Extract the tab `sx` into a named constant alongside the existing container `sx`.
  - Render two `<Tab>` children:
    - `value={MARKDOWN_EDITOR_TAB.EDIT}`, `label={MARKDOWN_EDITOR_TAB_LABEL.edit}`, `icon={<EditOutlinedIcon fontSize="small" />}`, `iconPosition="start"`.
    - `value={MARKDOWN_EDITOR_TAB.PREVIEW}`, `label={MARKDOWN_EDITOR_TAB_LABEL.preview}`, `icon={<VisibilityOutlinedIcon fontSize="small" />}`, `iconPosition="start"`.
- [x] 3.4 Introduce `const [activeTab, setActiveTab] = useState<MarkdownEditorTab>(MARKDOWN_EDITOR_TAB.EDIT)` and a `handleChange` callback typed against the MUI `Tabs` `onChange` signature.
- [x] 3.5 Render both panels unconditionally inside a panel container below the Tabs:
  - Edit panel: wrap the existing `<MDEditor />` usage (value, onChange, `preview="edit"`, `hideToolbar={false}`, `visibleDragbar={false}`, `height`, `minHeight`, `commands={MARKDOWN_EDITOR_TOOLBAR_COMMANDS}`, `extraCommands={[]}`, `textareaProps={{ placeholder }}`) inside a `Box` whose `sx` sets `display: activeTab === MARKDOWN_EDITOR_TAB.EDIT ? "block" : "none"`. No other MDEditor props change.
  - Preview panel: wrap the existing preview `Box` (border, radius, padding, `overflow: "auto"`, `height`, `minHeight`, `backgroundColor: "background.paper"`) with the same visibility rule against `MARKDOWN_EDITOR_TAB.PREVIEW`. Its children render `<ExplanationContent content={value} />`. No `renderPreview` branch.
- [x] 3.6 Confirm `height`/`minHeight` are still the prop-driven panel-content heights; the tab bar adds its own ~46px vertical space above, which is acceptable inside the existing `ExplanationModal` layout.
- [x] 3.7 Run `pnpm type-check` — zero TypeScript errors. Expected unused-import warning for `ReactNode` must be resolved by deleting the import.
- [x] 3.8 Run `pnpm lint` — zero warnings.
- [x] 3.9 Run `pnpm format`.

## 4. No ExplanationModal changes

- [x] 4.1 Verify `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` needs no source edits: the only `MarkdownEditor` call site passes `value` and `onChange` only, both of which survive this change. Confirm by grepping that no file passes `renderPreview` or `disabled` to `<MarkdownEditor>`.

## 5. Manual QA

- [ ] 5.1 `pnpm --filter web dev`; sign in as `SUPERADMIN`.
- [ ] 5.2 On `/admin/categories`, open the explanation modal in edit mode. Confirm:
  - Tab bar renders at the top with `Edición` (active) and `Vista previa` (inactive), icons to the left of each label.
  - Edit tab shows the MDEditor at full modal width with the toolbar intact (no image command).
  - Typing markdown (`# H1`, `**bold**`, a GFM table, fenced code, `$$E=mc^2$$`) updates the source.
- [ ] 5.3 Switch to `Vista previa`:
  - Rendered output uses `ExplanationContent` (same plugins, same prose styling as the end-user `ExplanationContext` dialog).
  - Preview occupies the full modal width (the exact layout issue this change addresses).
  - Empty-value case: after clearing content and switching to Preview, the `ExplanationContent` empty state ("No existe una explicación disponible aún" or equivalent) is shown.
- [ ] 5.4 Switch back to `Edición`:
  - Textarea content is preserved verbatim.
  - Cursor position and selection survive the round-trip (both panels mounted).
  - MDEditor internal scroll position survives the round-trip.
- [ ] 5.5 Read-only flow unchanged:
  - Open a category in a read-only methodology version (`readOnly={true}` path). Confirm the dialog still renders `ExplanationContent` directly (no tabs, no "Guardar cambios" button, only "Cerrar"). `MarkdownEditor` is not mounted in this path.
- [ ] 5.6 Repeat 5.2–5.5 on `/admin/subcategories`.
- [ ] 5.7 Open devtools Network tab on a fresh page load of `/admin/categories`. Confirm the `@uiw/react-md-editor` chunk is still absent until the explanation modal is first opened (lazy-loading unchanged).
- [ ] 5.8 End-user regression check: sign in as a plain `USER`, open a carbon inventory, click the info button on a category/subcategory. Confirm the `ExplanationContent` dialog still renders correctly.

## 6. Commit hygiene and merge

- [ ] 6.1 Split work into focused commits: (1) constants, (2) component rewrite. Conventional Commits, `refactor(web):` scope, `claude/` branch prefix.
- [ ] 6.2 Run `pnpm format && pnpm lint && pnpm type-check` before every commit.
- [ ] 6.3 Open PR; confirm CI (lint, type-check, format:check, test, build) passes.
- [ ] 6.4 Address reviewer feedback in dedicated per-comment commits per project conventions.
