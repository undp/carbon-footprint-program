## 1. Dependency

- [ ] 1.1 Verify `@uiw/react-md-editor` latest version's peer-dependency range accepts React 19.2 (`npm view @uiw/react-md-editor peerDependencies`). Escalate if it pins to React 18.
- [ ] 1.2 Add `@uiw/react-md-editor` to `apps/web/package.json` with an exact pinned version (no `^` or `~`).
- [ ] 1.3 Run `pnpm install` at the repo root; confirm resolution succeeds with zero peer-dependency warnings.

## 2. Reusable MarkdownEditor component

- [ ] 2.1 Create `apps/web/src/components/markdown/constants.ts` exporting `DEFAULT_MARKDOWN_EDITOR_HEIGHT = 480`, `DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER = "Escribe la explicación en Markdown..."`, and `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` (array of enabled command names excluding `image`).
- [ ] 2.2 Create `apps/web/src/components/markdown/MarkdownEditor.tsx` as a **default export** implementing the props `{ value, onChange, placeholder?, disabled?, height?, minHeight?, renderPreview? }` per design.
- [ ] 2.3 Render a flex-row layout with two equal-width children, each fixed at `height ?? DEFAULT_MARKDOWN_EDITOR_HEIGHT` and `overflow: auto` for independent scroll.
- [ ] 2.4 Left pane: `@uiw/react-md-editor` `MDEditor` with `preview="edit"`, `hideToolbar={false}`, `visibleDragbar={false}`, toolbar commands from `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` (image excluded).
- [ ] 2.5 Right pane: `renderPreview?.(value) ?? <ExplanationContent content={value} />`. Verify the empty-value case delegates to `ExplanationContent`'s built-in empty state.
- [ ] 2.6 Wrap the whole component in a `<div data-color-mode="light">` and add a co-located CSS file (or `sx`-based overrides) aligning `.w-md-editor-*` toolbar/background/border colors with `theme.palette.background.paper`, `theme.palette.text.primary`, `theme.palette.divider`. No hex/rgb literals.
- [ ] 2.7 Create `apps/web/src/components/markdown/index.ts` barrel: re-export `MarkdownEditor` as a named export and re-export all constants.
- [ ] 2.8 Run `pnpm type-check` — zero TypeScript errors.
- [ ] 2.9 Run `pnpm lint` — zero warnings.

## 3. Wire editor into ExplanationModal

- [ ] 3.1 In `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx`, lazy-import the editor: `const MarkdownEditor = React.lazy(() => import("@/components/markdown/MarkdownEditor"))`.
- [ ] 3.2 Replace the editable-branch `TextField` with `<Suspense fallback={<spinner/>}><MarkdownEditor value={localValue} onChange={setLocalValue} /></Suspense>`. Preserve the existing "Explicación" label above the editor (move from the old `TextField` `label` prop into a plain `<Typography>` styled to match a form field label).
- [ ] 3.3 Replace the read-only branch's disabled `TextField` with `<ExplanationContent content={value} />`. Keep the existing "Ver Explicación" title and the "Cerrar" button.
- [ ] 3.4 Preserve the `localValue` null handling already in place at the caller (`value ?? ""` on open, `""`-to-`null` mapping on save). Do not move null handling into `MarkdownEditor`.
- [ ] 3.5 Run `pnpm type-check`, `pnpm lint`, `pnpm format` — all green.

## 4. Manual QA

- [ ] 4.1 `pnpm --filter web dev`; sign in as `SUPERADMIN`.
- [ ] 4.2 On `/admin/categories`, open the explanation modal in edit mode (category with editable methodology). Confirm side-by-side editor + preview renders, toolbar lacks an image command, height ≈ 480px, and both panes scroll independently.
- [ ] 4.3 Type a rich sample: `# heading`, `**bold**`, a GFM table, a fenced code block, and a math block `$$E=mc^2$$`. Confirm preview matches end-user `ExplanationContent` rendering (headings, bold, table, code, formula).
- [ ] 4.4 Clear the field and save; reopen — value persists as `null` ("Agregar" state in the column).
- [ ] 4.5 Open a category in a read-only methodology version (triggers `isViewOnly`); confirm the modal title reads "Ver Explicación", body shows rendered markdown via `ExplanationContent` (not raw source), and only "Cerrar" is visible.
- [ ] 4.6 Repeat steps 4.2–4.5 on `/admin/subcategories`.
- [ ] 4.7 Open devtools Network tab on a fresh page load of `/admin/categories`. Confirm no `react-md-editor`/CodeMirror chunk is loaded until the explanation modal is first opened (lazy-split verified).
- [ ] 4.8 Navigate to a carbon inventory and click the info button on a category/subcategory; confirm the end-user `ExplanationContent` dialog still renders correctly (no regression on the untouched end-user path).
- [ ] 4.9 Sign in as a plain `USER` and confirm `/admin/categories` redirects per the existing route guard (sanity check that admin gating is unchanged).

## 5. Commit hygiene and merge

- [ ] 5.1 Split work into focused commits along the task-group boundaries: (1) dep + constants, (2) `MarkdownEditor` component, (3) `ExplanationModal` wire-in. Conventional Commits, `feat(web):` scope, `claude/` branch prefix.
- [ ] 5.2 Run `pnpm format && pnpm lint && pnpm type-check` before every commit.
- [ ] 5.3 Open PR; confirm CI (lint, type-check, format:check, test, build) passes.
- [ ] 5.4 Address reviewer feedback in dedicated per-comment commits per project conventions.
