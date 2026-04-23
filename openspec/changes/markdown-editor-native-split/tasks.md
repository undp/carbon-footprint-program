## 1. Supersede the tabbed change

- [x] 1.1 Delete `openspec/changes/markdown-editor-tabbed/` in full (proposal, design, tasks, specs subtree) — its requirements were never archived, no base-spec rollback needed.
- [x] 1.2 Confirm `openspec list --json` no longer reports `markdown-editor-tabbed`.

## 2. Rewrite `constants.ts`

- [x] 2.1 Remove `MARKDOWN_EDITOR_TAB`, `MarkdownEditorTab`, and `MARKDOWN_EDITOR_TAB_LABEL`.
- [x] 2.2 Bump `DEFAULT_MARKDOWN_EDITOR_HEIGHT` from `480` to `520`.
- [x] 2.3 Add `MARKDOWN_EDITOR_TOOLBAR_ES_LABELS: Record<string, { ariaLabel: string; title: string }>` mapping every toolbar-command `name` (from `@uiw/react-md-editor`) to Spanish strings:
  - `bold → "Negrita"`
  - `italic → "Cursiva"`
  - `strikethrough → "Tachado"`
  - `hr → "Línea horizontal"`
  - `heading → "Encabezado"` (parent picker)
  - `heading1 → "Encabezado 1"` … `heading6 → "Encabezado 6"`
  - `link → "Enlace"`
  - `code → "Código en línea"`
  - `codeBlock → "Bloque de código"`
  - `quote → "Cita"`
  - `image → "Imagen"`
  - `table → "Tabla"`
  - `unorderedListCommand → "Lista"`
  - `orderedListCommand → "Lista numerada"`
  - `checkedListCommand → "Lista de tareas"`
  - `codeEdit → "Solo edición"`
  - `codeLive → "Edición y vista previa"`
  - `codePreview → "Solo vista previa"`
  - `fullscreen → "Pantalla completa"`
  - `help → "Ayuda"`
  - `issue → "Reportar problema"`
  - **Do NOT add entries for**: `title`, `title1..title6` (literal JS aliases of `heading`/`heading1..heading6` in the library source — including both would duplicate buttons), `comment` (excluded from the toolbar entirely), `group` (structural wrapper, not a button).
- [x] 2.4 Add a pure helper `localizeCommand(command: ICommand): ICommand` that returns a shallow-cloned command with `buttonProps` augmented by the matching entry in `MARKDOWN_EDITOR_TOOLBAR_ES_LABELS` (`aria-label` + `title`). Leave dividers and commands without a mapping untouched.
- [x] 2.5 Rebuild `MARKDOWN_EDITOR_TOOLBAR_COMMANDS: ICommand[]` from the set defined in `design.md` Decision 4 (formatting → structure → insert → lists → mode toggles → meta), each passed through `localizeCommand`, with `commands.divider` grouping between sections. Explicitly exclude `commands.title`, `commands.title1..title6`, `commands.comment`, and `commands.group`.

## 3. Rewrite `MarkdownEditor.tsx`

- [x] 3.1 Remove imports: `SyntheticEvent`, `useState`, `Tab`, `Tabs`, `EditOutlinedIcon`, `VisibilityOutlinedIcon`, and the tab-related constants.
- [x] 3.2 Delete `tabsSx`, `activeTab` state, `handleTabChange`, both wrapper `<Box>`s with `display: tab === ...` toggles.
- [x] 3.3 Wire fullscreen-safe behavior inside the component. **All five execute args must be cached** — the library's `commands.fullscreen.execute` only dispatches when `shortcuts && dispatch && executeCommandState` are all present (see `design.md` Decision 8).
  - Declare `const [isFullscreen, setIsFullscreen] = useState(false);` and a ref that matches the execute signature:
    ```ts
    const executeContextRef = useRef<{
      state: ExecuteState;
      api: TextAreaTextApi;
      dispatch: React.Dispatch<ContextStore> | undefined;
      executeCommandState: ExecuteCommandState | undefined;
      shortcuts: string[] | undefined;
    } | null>(null);
    ```
    (Import `ExecuteState`, `TextAreaTextApi`, `ContextStore`, `ExecuteCommandState` from `@uiw/react-md-editor`.)
  - Build a `fullscreenCommand: ICommand` via `useMemo` that spreads `commands.fullscreen`, keeps its Spanish `buttonProps`, and replaces `execute` with a wrapper that: (a) stores all 5 args in `executeContextRef.current`, (b) calls `commands.fullscreen.execute?.(state, api, dispatch, executeCommandState, shortcuts)`, (c) flips `setIsFullscreen((prev) => !prev)`.
  - Assemble the final toolbar commands by swapping `commands.fullscreen` in `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` for `fullscreenCommand` (keep order, preserve dividers). The library's orchestrator resolves the `ctrl+0` keyboard shortcut against this assembled command list, so ctrl+0 also routes through our wrapper — no separate shortcut handling.
  - Add a `useEffect([isFullscreen])` that, while `isFullscreen`, attaches a `keydown` listener on `document` in the **capture phase** (`addEventListener("keydown", handler, true)`). The handler: if `event.key === "Escape"`, call `event.preventDefault()` + `event.stopPropagation()`, then — if `executeContextRef.current` is non-null — re-invoke `commands.fullscreen.execute?.(...all 5 cached args)` and call `setIsFullscreen(false)`. Cleanup removes the listener.
- [x] 3.4 Render a single `<MDEditor>` inside the existing `<Box data-color-mode="light" sx={editorContainerSx}>` wrapper with: `value`, `onChange={(next) => onChange(next ?? "")}`, `preview="live"`, `hideToolbar={false}`, `visibleDragbar={false}`, `height`, `minHeight`, `commands={toolbarCommands}` (the assembled list from 3.3), `extraCommands={[]}`, `textareaProps={{ placeholder }}`, and `components={{ preview: renderExplanationPreview }}`.
- [x] 3.5 Define `renderExplanationPreview` (module-scope or inline `useCallback`) as `(source: string | undefined) => <ExplanationContent content={source ?? ""} />`. The MDEditor signature passes additional args (`state`, `dispatch`) — ignore them; the source string is all we need.
- [x] 3.6 Keep `editorContainerSx` as-is — no changes to the MUI → CSS-var theming bridge. Keep `data-color-mode="light"`.
- [x] 3.7 Leave the public props (`value`, `onChange`, `placeholder?`, `height?`, `minHeight?`) unchanged.

## 4. Manual QA

- [ ] 4.1 Open `ExplanationModal` on a maintainer screen in editable mode; confirm the editor shows side-by-side edit + preview immediately on open, with the editor on the left and the `ExplanationContent`-rendered preview on the right.
- [ ] 4.2 Type markdown including a GFM table, a `$$\\sum_i x_i$$` math block, a heading, an ordered list, and an inline link; confirm the preview updates live and renders identically to the end-user `ExplanationContent` (same prose styling, math rendered via KaTeX).
- [ ] 4.3 Scroll the editor past the viewport; confirm the preview scrolls in proportional sync. If sync is broken (editor scrolls but preview stays, or jitter), file a follow-up issue — no fallback scoped in this change.
- [ ] 4.4 Hover every toolbar button; confirm each tooltip and `aria-label` is Spanish and reads naturally (no "Bold Ctrl+B" artifacts, no empty tooltips). Confirm the following are absent from the toolbar: `commands.title` and `commands.title1..title6` (aliases of `heading*`), `commands.comment`, `commands.group`. Confirm the following ARE present: `strikethrough` (Tachado), `hr` (Línea horizontal), `heading` parent picker (Encabezado), and `heading1..heading6` individual buttons.
- [ ] 4.5 Clear the editor to empty; confirm the preview pane shows the `ExplanationContent` empty state (InfoOutlined + "No existe una explicación disponible aún").
- [ ] 4.6 Verify the editor wrapper still carries `data-color-mode="light"` and that background/border colors match the rest of the admin modal (no dark-mode artifacts).
- [ ] 4.7 Fullscreen inside `ExplanationModal`:
  - Click the "Pantalla completa" toolbar button; confirm the editor covers the viewport (above the modal backdrop) and that both edit and preview panes remain visible.
  - While fullscreen, press `Escape`; confirm the editor exits fullscreen **and the modal stays open** with the in-progress draft intact.
  - Back in the normal (non-fullscreen) editor view, press `Escape`; confirm the modal closes as usual (the capture listener is no longer active).
  - Toggle fullscreen off by clicking the toolbar button again; confirm the editor returns to the modal and the listener is cleaned up (Escape again closes the modal).

## 5. Validation

- [x] 5.1 Run `pnpm format && pnpm lint && pnpm type-check` at the repo root; all must pass.
- [x] 5.2 Run `openspec validate markdown-editor-native-split --strict`; must report no errors.
- [x] 5.3 Confirm no consumer besides `ExplanationModal.tsx` imports `MarkdownEditor` (grep `from "@/components/markdown"` and `MarkdownEditor`).
