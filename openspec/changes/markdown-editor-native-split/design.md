## Context

`MarkdownEditor` has cycled through two layouts in a short window:

1. **`markdown-editor-side-by-side` (archived)** — hand-rolled flex row: `MDEditor preview="edit"` on the left, `ExplanationContent` on the right. Both panes scrolled independently (no sync), and the preview was squeezed to ~570px in the `lg` modal, hiding layout bugs visible at the end-user width.
2. **`markdown-editor-tabbed` (in-progress, partially shipped on this branch)** — MUI `Tabs` wrapping two stacked panels, one visible at a time. Solves scroll-sync (only one pane at a time) and width mismatch, but removes simultaneous visibility, which maintainers want while authoring tables and math.

The library `@uiw/react-md-editor@4.1.0` already supports what both iterations tried to approximate:

- `preview="live"` renders a two-pane split with proportional scroll sync wired at the wrapper level.
- `components.preview` lets a consumer return any `ReactNode` in the preview pane, so the library owns the split chrome while we own the rendered markdown.

Adopting the native mode lets us keep simultaneous edit/preview and gain scroll sync without custom code. The only consumer is `ExplanationModal.tsx`, lazy-loading the editor — no migration surface outside the component itself.

## Goals / Non-Goals

**Goals:**

- Replace the tabbed layout with `MDEditor preview="live"`, preserving the component's public API (`value`, `onChange`, `placeholder?`, `height?`, `minHeight?`).
- Render the preview pane through `ExplanationContent` via `components.preview`, guaranteeing byte-for-byte parity with the end-user explanation viewer (same plugin set: `remark-gfm`, `remark-math`, `rehype-katex`; same Tailwind `prose` wrapper; same empty state).
- Use the library's proportional scroll sync between editor and preview, unless verification shows the default is broken with our custom preview — in which case a ref-based fallback is well-scoped.
- Expose every `commands.*` export from the library in the toolbar, localized to Spanish via per-command `buttonProps` overrides.
- Delete the tabbed-layout primitives (`MARKDOWN_EDITOR_TAB*`, MUI `Tabs/Tab`, `EditOutlined/VisibilityOutlined` icons) — they become dead code under the new layout.
- Supersede the `markdown-editor-tabbed` openspec change by deleting its directory before it can be archived.

**Non-Goals:**

- No mobile breakpoint fallback. The split layout stays at all widths; narrow viewports are acknowledged as ugly and out of scope.
- No opinionated filtering of toolbar commands. The user wants the full surface now; filtering is a follow-up change informed by real usage.
- No automated tests for the layout. Matches the precedent set by both prior changes; manual QA on `ExplanationModal` is the gate.
- No API / Prisma / types / end-user surface changes. No dependency bump (`@uiw/react-md-editor@4.1.0` is already latest).
- No reintroduction of `renderPreview` or `disabled` props. The tabbed change removed both for lack of callers; that removal stands.

## Decisions

### 1. Layout: `preview="live"` over tabs or custom flex

- **Chosen**: single `<MDEditor preview="live" components={{ preview }} ... />` at the root.
- **Alternatives**:
  - _Keep tabs_: rejected — user explicitly asked to kill it; simultaneous edit+preview is the whole point.
  - _Hand-rolled flex row (previous archived approach)_: rejected — we'd be rebuilding features (scroll sync, resize, fullscreen) the library already ships.
- **Why**: minimum custom code. The library's split owns the chrome (toolbar, resize, fullscreen, scroll sync). Our only responsibility is the preview content.

### 2. Preview content: `components.preview` returning `<ExplanationContent>`

- **Chosen**: `components={{ preview: (source) => <ExplanationContent content={source ?? ""} /> }}`.
- **Alternatives**:
  - _`previewOptions`_: configures the library's bundled `react-markdown-preview` renderer. Could work by passing `remarkPlugins` + `rehypePlugins` + `components`, but duplicates plugin wiring already centralized in `ExplanationContent` and can't reuse our empty-state UI.
  - _Two separate components (`MarkdownEditorView` + `MarkdownPreviewView`)_: rejected — splits a cohesive primitive for a speculative future need.
- **Why**: one source of truth for preview rendering. Any future change to `ExplanationContent` (new plugin, styling tweak) automatically propagates to the admin preview.

### 3. Scroll sync: trust library, no fallback

- **Chosen**: no custom scroll handler. Rely fully on the library's proportional `scrollTop / (scrollHeight - clientHeight)` sync wired to the editor/preview wrapper elements. If manual QA surfaces a sync bug, address it in a separate change rather than carrying a dormant fallback design here.
- **Why**: the sync lives on wrapper divs the library still owns; swapping preview content should not break it. A ref-based shadow implementation would rebuild exactly what we're delegating to the library.

### 4. Toolbar: expose every `commands.*` except aliases and niche `comment`, localize via `buttonProps`

- **Chosen**: `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` becomes the full set of built-in commands (formatting, structure, insert, mode toggles, meta), each wrapped with Spanish `aria-label` + `title` via `{ ...commands.bold, buttonProps: { "aria-label": "Negrita", title: "Negrita" } }`. A `MARKDOWN_EDITOR_TOOLBAR_ES_LABELS` map keys command `name` → `{ ariaLabel, title }` so the overrides live in one lookup table and the command list is assembled by a small helper.
- **Included set** (verified against `@uiw/react-md-editor@4.1.0` source):
  - Formatting: `bold`, `italic`, `strikethrough`, `hr`
  - Structure: `heading` (parent picker), `heading1`, `heading2`, `heading3`, `heading4`, `heading5`, `heading6`
  - Insert: `link`, `code`, `codeBlock`, `quote`, `image`, `table`
  - Lists: `unorderedListCommand`, `orderedListCommand`, `checkedListCommand`
  - Mode toggles: `codeEdit`, `codeLive`, `codePreview`
  - Meta: `fullscreen` (wrapped per Decision 8), `help`, `issue`
  - Structural separators: `divider` (grouping; no label needed)
- **Excluded** with rationale:
  - `commands.title` and `commands.title1..commands.title6` — these are **literal JS aliases** to `commands.heading` / `commands.heading1..heading6` respectively (`var title = heading;` in the library source). Including both would surface the same command twice.
  - `commands.comment` — inserts `<!-- -->` HTML comment markers. Too niche for the admin audience; adds toolbar noise without matching signal.
  - `commands.group` — not a standalone toolbar button; it's a structural wrapper for nested command menus. No rendering path as a button.
- **Alternatives**:
  - _Hardcode English tooltips_: rejected — admin UI is Spanish; mixed language hurts UX and violates project convention.
  - _Monkey-patch the library's i18n_: the library has no built-in i18n surface; overriding per-command `buttonProps` is the documented escape hatch.
  - _Curate a further subset now_: rejected by user — filtering is deferred beyond the alias/niche drops above.
- **Why**: one seam (`buttonProps`) localizes everything without forking library internals. Separating the label map from the command list keeps future filtering trivial; dropping aliases and `comment` now avoids shipping duplicate buttons and a high-friction edge case.

### 5. Default height: 520px (up from 480px)

- **Chosen**: `DEFAULT_MARKDOWN_EDITOR_HEIGHT = 520`.
- **Why**: split halves horizontal width, which pushes tables and stacked paragraphs into more vertical real estate. A 40px bump gives a visible breathing line without dominating the modal. Still overridable via the `height` prop.

### 6. Supersession: delete `markdown-editor-tabbed` directory

- **Chosen**: delete `openspec/changes/markdown-editor-tabbed/` entirely as part of this change's tasks. Its specs were never archived into base, so no `specs/admin-markdown-editor/spec.md` rollback is required.
- **Why**: leaving an abandoned change dir invites confusion for contributors running `openspec list`. One decisive cleanup.

### 7. Light-mode theming bridge: unchanged

- **Chosen**: keep `data-color-mode="light"` on the wrapper and the existing MUI → CSS custom property bridge (`--color-fg-default`, `--color-canvas-default`, etc.) exactly as-is in `editorContainerSx`.
- **Why**: the native preview pane uses the same CSS vars. No work needed, no regression risk.

### 8. Fullscreen coexists with MUI Dialog via capture-phase Escape interception

- **Problem surface**: `commands.fullscreen` causes the library to apply `position:fixed; inset:0; z-index:99999` to the editor root (via the `.w-md-editor-fullscreen` class defined in the library's `index.less`). Inside `ExplanationModal` (MUI `Dialog`, z-index 1300), three collision categories exist:
  - z-index stacking → library `99999` > Dialog `1300`, so fullscreen visually escapes the Dialog cleanly. No action.
  - Backdrop click closing the Dialog → the fullscreen `position:fixed` layer sits above the backdrop, so clicks land on the editor and never reach the backdrop. No action.
  - `Escape` key → MUI `Dialog` listens at the document level and closes on Escape. The library does not handle Escape for fullscreen. Without intervention, a user who hits Escape while fullscreen-editing closes the modal and discards the draft. **This is the only real bug; everything else is benign stacking.**
- **Chosen**: keep the fix self-contained in `MarkdownEditor`. Wrap `commands.fullscreen` so its `execute` both delegates to the library and toggles a local `isFullscreen` state. While `isFullscreen` is true, install a `keydown` listener on `document` in the **capture phase**; on `Escape`, call `preventDefault()` + `stopPropagation()` so the event never reaches MUI's bubble-phase handler, then re-invoke the library's fullscreen toggle to exit fullscreen cleanly.
- **Critical detail — all 5 execute args must be cached**: the library's `commands.fullscreen.execute` is conditional:
  ```js
  execute: (state, api, dispatch, executeCommandState, shortcuts) => {
    api.textArea.focus();
    if (shortcuts && dispatch && executeCommandState) {
      dispatch({ fullscreen: !executeCommandState.fullscreen });
    }
  };
  ```
  Re-invoking with only `state`/`api` silently no-ops, leaving the user stuck in fullscreen. Our wrapper MUST cache **all five arguments** in a `useRef` on every invocation, then replay all five when exiting via Escape. The full typed shape:
  ```ts
  executeContextRef = useRef<{
    state: ExecuteState;
    api: TextAreaTextApi;
    dispatch: React.Dispatch<ContextStore> | undefined;
    executeCommandState: ExecuteCommandState | undefined;
    shortcuts: string[] | undefined;
  } | null>(null);
  ```
  Clean up the Escape listener on `isFullscreen === false` and on unmount.
- **Alternatives**:
  - _Set `disableEscapeKeyDown` on the modal_: rejected — blunt; would block Escape even in normal edit mode, changing modal UX across the board.
  - _Querying the fullscreen button in the DOM and synthetically clicking it to exit_: rejected — brittle DOM coupling, fragile to library markup changes.
  - _Use the `fullscreen` prop on MDEditor as a force-exit signal_: the prop has **one-way sync** semantics (prop → internal state, never the reverse). It would work as an exit channel, but introduces dual sources of truth — the prop and the internal state drift whenever the user toggles via the toolbar button, and resynchronization becomes a "set twice to force a diff" dance. Rejected for clarity.
  - _MutationObserver on the `.w-md-editor-fullscreen` class_: decouples detection from the execute path but introduces its own exit mechanism question (need prop change or synthetic click to get out). More moving parts than the execute wrapper. Rejected.
- **Orchestrator wiring note**: replacing `commands.fullscreen` in the command array with our wrapper means the library's own orchestrator resolves the `ctrl+0` shortcut to OUR wrapped command and calls OUR execute with all 5 args. So the wrapper works for both toolbar clicks and the keyboard shortcut — no separate shortcut handling needed.
- **Residual risk**: if the library ever exits fullscreen unilaterally (e.g., on unmount or internal reset), our `isFullscreen` flag desyncs until the next user toggle. Acceptable — the effect simply stays active one cycle longer, and the next wrapper call re-syncs.
- **Why**: captures the exact event that breaks the experience, at the exact phase needed to preempt MUI, without leaking state or wiring into `ExplanationModal`. Logic lives where the component lives.

## Risks / Trade-offs

- **Scroll sync may be proportional-only, not line-aligned** → Accepted. Our preview renders via `react-markdown` (different HTML shape than the library's built-in `react-markdown-preview`), so element heights differ. Proportional sync still tracks roughly; line-level alignment was never a goal. No fallback planned — address in a follow-up change only if QA flags it as disorienting.
- **Toolbar surfaces commands we may not want** (image upload button leads nowhere without an uploader, `issue`/`help` point to external GitHub) → Accepted by user for this change. Follow-up filtering change will trim once consumers weigh in. Mitigation: none needed now.
- **Fullscreen Escape hijack is load-bearing** → Decision 8 leans on capture-phase listener ordering. If a future MUI version moves its Escape handler to the capture phase too, both handlers would fire and the first-registered wins. Mitigation today: the listener is installed only while `isFullscreen` is true, and we call `stopImmediatePropagation()` via `stopPropagation()` at capture phase, which is sufficient for bubble-phase listeners. Revisit only if MUI's Dialog internals change.
- **`ExplanationContent` re-renders on every keystroke** in live mode → the library debounces preview updates internally (a few ms), and remark/rehype/katex pipelines handle explanation-sized content without friction. Same risk class as the tabbed change's always-mounted preview; no worse.
- **Spanish label wording is a bikeshed surface** → Keep labels as concise nouns (`Negrita`, `Cursiva`, `Encabezado 1`, `Lista`, `Enlace`, `Código`, etc.) matching the tone of the rest of the admin UI. Ship; iterate on reviewer feedback rather than pre-optimizing.
- **`components.preview` is an evolving part of the library's API** → pinned-exact dependency (already required by a base spec requirement) prevents silent drift on a minor bump.

## Migration Plan

1. Delete the tabbed-change directory (`openspec/changes/markdown-editor-tabbed/`) in the same commit as the code revert. No spec archive to roll back.
2. Rewrite `MarkdownEditor.tsx`: drop tab state/MUI `Tabs`/icon imports/placeholder-conditional rendering; wire the `isFullscreen` state + wrapped `commands.fullscreen` + capture-phase Escape listener from Decision 8; render a single `<MDEditor preview="live" components={{ preview }} commands={...} textareaProps={{ placeholder }} height={height} minHeight={minHeight} />` inside the existing themed `<Box data-color-mode="light" sx={editorContainerSx}>`.
3. Rewrite `constants.ts`: remove `MARKDOWN_EDITOR_TAB`, `MARKDOWN_EDITOR_TAB_LABEL`, and `MarkdownEditorTab`; add `MARKDOWN_EDITOR_TOOLBAR_ES_LABELS` map + a helper that returns the fully localized `ICommand[]`; drop the deprecated `commands.title` from the list; bump `DEFAULT_MARKDOWN_EDITOR_HEIGHT` to `520`.
4. Manual QA on both maintainer screens that open `ExplanationModal` in editable mode: type into the editor, confirm the preview updates, confirm vertical scroll stays roughly in sync, confirm every toolbar button shows a Spanish tooltip, confirm empty value shows the `ExplanationContent` empty state in the preview pane, toggle fullscreen and verify Escape exits fullscreen without closing the modal (and that Escape outside fullscreen still closes the modal).
5. Run `pnpm format && pnpm lint && pnpm type-check`. Commit.

**Rollback**: revert the commits. No data migration, no config change, no dependency move — the library version is unchanged.

## Open Questions

- Which exact Spanish strings for each toolbar command? A draft will be proposed in the code review; reviewer feedback determines final wording. (This is a string-table detail, not an architectural decision — not worth blocking the proposal.)
- Do we want to keep `help` and `issue` long-term? Out of scope for this change; covered by the follow-up filtering work. (`fullscreen` is load-bearing — kept with the Escape fix from Decision 8.)
