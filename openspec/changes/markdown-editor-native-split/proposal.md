## Why

The in-flight `markdown-editor-tabbed` change solved a real pain (missing scroll sync, width mismatch with end-user rendering in a split layout) by collapsing to tabs — at the cost of losing simultaneous edit/preview, which maintainers actually want while iterating on tables and math. `@uiw/react-md-editor` v4 ships both capabilities natively: `preview="live"` provides a proportional scroll-synced split pane, and `components.preview` lets us swap the built-in renderer for our own `ExplanationContent`. Adopting the native split delivers the original intent (side-by-side with live preview) while closing the scroll-sync gap that forced the tabbed detour, with less custom code than either prior approach.

## What Changes

- **BREAKING** supersede the in-flight `markdown-editor-tabbed` change. Its proposal/design/specs/tasks are abandoned; its code path (MUI `Tabs`, `MARKDOWN_EDITOR_TAB*` constants, tab state, `display:none` pane retention) is removed before it hardens into the archived baseline.
- Revert `MarkdownEditor` to a side-by-side layout, but delegate the split to `@uiw/react-md-editor`'s native `preview="live"` mode instead of a hand-rolled flex row.
- Override `MDEditor`'s `components.preview` to render our existing `ExplanationContent` component so the preview pane reaches byte-for-byte parity with the end-user explanation viewer (react-markdown + remark-gfm + remark-math + rehype-katex + Tailwind `prose`).
- Rely on the library's proportional scroll sync between editor and preview panes. No custom scroll handler and no fallback; the library owns the wrapper geometry and a ref-based alternative would rebuild what we just deleted.
- Expose **every toolbar command** surfaced by `@uiw/react-md-editor` (bold, italic, headings h1–h6, lists, link, code, code block, quote, image, table, checked list, code edit/live/preview toggles, fullscreen, help, issue, etc.) — with one exception: drop the deprecated `commands.title` in favor of the explicit `heading1..heading6` family. Filtering the remaining set is deferred to a follow-up change once consumers tell us which ones to hide.
- Make `commands.fullscreen` safe inside `ExplanationModal`'s MUI `Dialog` by wrapping its `execute` to track an `isFullscreen` flag and, while true, intercepting the `Escape` key in the capture phase so it exits fullscreen without bubbling up to the Dialog's close handler. Logic is self-contained in `MarkdownEditor` — consumers stay untouched.
- Localize every toolbar command to Spanish by overriding each `ICommand.buttonProps` (`aria-label`, `title`) — no hardcoded English strings on the admin surface.
- Bump the default pane height from `480px` to `520px`. The split halves horizontal width, so a small vertical increase keeps common content (tables, stacked paragraphs) readable without scroll.
- Remove `MARKDOWN_EDITOR_TAB`, `MARKDOWN_EDITOR_TAB_LABEL`, `MarkdownEditorTab`, and the MUI `Tabs`/`Tab` plumbing. Keep `DEFAULT_MARKDOWN_EDITOR_HEIGHT`, `DEFAULT_MARKDOWN_EDITOR_PLACEHOLDER`, and the toolbar-command array (repurposed to hold the full, localized set).
- Keep the light-mode forcing (`data-color-mode="light"`) and the MUI-theme → CSS-custom-properties bridge unchanged.
- Keep the `renderPreview` and `disabled` prop removals from the tabbed change — zero callers, still unjustified.
- No dependency change: `@uiw/react-md-editor@4.1.0` already installed = current npm latest.
- Mobile behavior is explicitly out of scope; no breakpoint fallback.

## Capabilities

### Modified Capabilities

- `admin-markdown-editor`: flip the layout requirement back to side-by-side but source the split from the library's native `preview="live"`; require library-driven proportional scroll sync between panes; replace the "toolbar excludes image / keeps a specific subset" requirement with "toolbar exposes every `@uiw/react-md-editor` built-in command, each localized to Spanish"; bump default height to `520px`; remove the `renderPreview` override prop entry point (fixed to `ExplanationContent`).

## Impact

- **Frontend (web)**:
  - Modified: `apps/web/src/components/markdown/MarkdownEditor.tsx` — replace tab state + MUI `Tabs` + twin panel divs with a single `<MDEditor preview="live" components={{ preview }} commands={...} />` tree; remove `renderPreview`/`disabled` props surface (already removed by the tabbed change); add `<ExplanationContent>` as the `components.preview` callback target.
  - Modified: `apps/web/src/components/markdown/constants.ts` — drop tab enum/labels; expand `MARKDOWN_EDITOR_TOOLBAR_COMMANDS` to cover every exported `commands.*` from the library; introduce a localization map (`MARKDOWN_EDITOR_TOOLBAR_ES_LABELS`) keyed by command name that supplies `{ "aria-label", title }` overrides applied via `ICommand.buttonProps`.
  - Unchanged: `apps/web/src/components/markdown/index.ts`, `apps/web/src/components/ExplanationContent.tsx`, `apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` (only `value`/`onChange` are passed).
- **OpenSpec**:
  - Supersede `openspec/changes/markdown-editor-tabbed/` — delete the change directory once this proposal is approved. Its requirements were never archived into base specs, so no archive rollback is needed.
- **Untouched**: API, Prisma schema, `packages/types`, `@repo/constants`, `@repo/utils`, all end-user surfaces, and every consumer of `MarkdownEditor` (only `ExplanationModal`).
- **Tests**: no automated tests — matches prior changes' rationale (thin third-party-library wrapper, no visual-regression infra). Manual QA covers both maintainer screens that surface `ExplanationModal` in editable mode.
- **Risks**:
  - Scroll sync is the load-bearing UX claim. The library wires proportional scroll on wrapper divs whose `scrollHeight` depends on rendered content. Because `ExplanationContent` emits different HTML than the library's default preview, pane heights will differ, but proportional mapping should still feel natural. The library owns the wrapper geometry — no fallback planned.
  - Exposing every toolbar command (image, fullscreen, help, issue) surfaces affordances we may not want long-term. Accepted — user wants the maximal surface now, filtering decided later.
  - Fullscreen-inside-Dialog interaction: the library's fullscreen uses `position:fixed; z-index:9999`, which correctly escapes MUI's `Dialog` (z-index 1300) and keeps backdrop clicks out of reach. The only real collision is `Escape` — MUI Dialog's document-level handler would close the modal and discard the draft. Mitigated by a capture-phase keydown listener installed by `MarkdownEditor` while `isFullscreen` is true; it calls `preventDefault()` + `stopPropagation()` and re-invokes the library's fullscreen toggle to exit.
  - Spanish localization is a static string map — trivial, but worth a review pass so wording matches the rest of the admin surface (`Negrita`, `Cursiva`, `Encabezado`, etc., not literal dictionary translations).
