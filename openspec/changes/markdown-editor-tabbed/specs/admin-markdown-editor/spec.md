## MODIFIED Requirements

### Requirement: Tabbed editor and preview layout

The `MarkdownEditor` component SHALL render its editor pane and its preview pane inside a tabbed container with exactly two tabs: an edit tab and a preview tab. Exactly one pane MUST be visible at any time. The active pane MUST occupy the full horizontal width of the component's container, and MUST scroll independently inside its panel when content exceeds the configured panel height.

Tab values and Spanish labels MUST be sourced from the named constants `MARKDOWN_EDITOR_TAB` and `MARKDOWN_EDITOR_TAB_LABEL` in `apps/web/src/components/markdown/constants.ts` — no inline string literals for either value or label.

Both panels MUST remain mounted in the DOM at all times; the inactive panel MUST be hidden via CSS (`display: "none"`) rather than unmounted, so the editor's caret position, text selection, and internal scroll offset survive tab switches.

The default active tab on mount MUST be the edit tab. Tab state MUST be internal to the component — consumers MUST NOT be able to pass a controlled `activeTab` prop.

The tab bar MUST visually mirror the pattern used by `InventoryTabs`: a 2px `theme.palette.primary.main` indicator, `minHeight: 46` on both the Tabs container and each Tab, `textTransform: "none"`, icon-plus-label content with `iconPosition="start"`, and a subtle bottom-border divider under the tab bar. The edit tab MUST display an `EditOutlined` icon and the preview tab MUST display a `VisibilityOutlined` icon, both from `@mui/icons-material`.

The `height` and `minHeight` props SHALL size the panel content region below the tab bar; the tab bar itself adds its own vertical space above the panel.

#### Scenario: Only the active pane is visible

- **WHEN** `MarkdownEditor` is rendered and the edit tab is active
- **THEN** the editor pane is visible at full container width and the preview pane is present in the DOM but hidden via `display: "none"`

- **WHEN** the user selects the preview tab
- **THEN** the preview pane becomes visible at full container width and the editor pane is present in the DOM but hidden via `display: "none"`

#### Scenario: Caret and scroll are preserved across tab switches

- **WHEN** a user types content, positions the caret inside the textarea, switches to the preview tab, then switches back to the edit tab
- **THEN** the caret position, text selection, and textarea scroll offset are identical to their pre-switch state (neither pane is unmounted)

#### Scenario: Default active tab is edit

- **WHEN** `MarkdownEditor` mounts
- **THEN** the edit tab is selected and the edit pane is the visible one

#### Scenario: Tab state is internal only

- **WHEN** a consumer inspects the component's prop signature
- **THEN** there is no `activeTab` or equivalent prop to control the selected tab from outside

#### Scenario: Default height applies to the panel, tab bar sits above

- **WHEN** `MarkdownEditor` is rendered without a `height` prop
- **THEN** the active panel uses the shared default height (480px), and the tab bar renders above it with its own vertical footprint

#### Scenario: Tab values and labels come from constants

- **WHEN** inspecting the component source
- **THEN** tab values (`"edit"`, `"preview"`) and Spanish labels (`"Edición"`, `"Vista previa"`) are imported from `apps/web/src/components/markdown/constants.ts` rather than inlined as string literals

### Requirement: Preview renderer is ExplanationContent

The preview pane SHALL always render the current editor value through `ExplanationContent`, guaranteeing byte-for-byte parity with the end-user explanation viewer (same plugins, same Tailwind `prose` styling, same empty state). The component MUST NOT expose any prop that allows consumers to override the preview renderer.

#### Scenario: Default preview matches end-user viewer

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the preview pane renders the current value through `ExplanationContent`, producing the same output as the end-user `ExplanationContext` dialog for the same markdown source

#### Scenario: Empty-value preview shows the shared empty state

- **WHEN** `MarkdownEditor` is rendered with `value === ""` and the preview tab is active
- **THEN** the preview pane displays the `ExplanationContent` empty state

#### Scenario: No preview override prop exists

- **WHEN** a consumer inspects `MarkdownEditorProps`
- **THEN** there is no `renderPreview` prop or equivalent extension point; the preview renderer is fixed to `ExplanationContent`

### Requirement: ExplanationModal edit mode uses the lazy-loaded MarkdownEditor

`apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` SHALL render its editable body using the `MarkdownEditor` component, imported via `React.lazy` and wrapped in a `Suspense` fallback. The modal MUST preserve its existing null/empty handling: `value ?? ""` on open, and the empty string MUST be mapped back to `null` on save.

#### Scenario: Editable modal renders the tabbed editor

- **WHEN** an admin opens `ExplanationModal` with `readOnly={false}`
- **THEN** the modal body shows the lazy-loaded `MarkdownEditor` with the tab bar on top and the edit tab active by default

#### Scenario: Editor bundle is not loaded until the modal opens

- **WHEN** a maintainer screen mounts but no admin has opened `ExplanationModal`
- **THEN** the `@uiw/react-md-editor` chunk is absent from the initial admin bundle and only fetched on first modal open

#### Scenario: Empty value saves as null

- **WHEN** an admin clears the editor and clicks save
- **THEN** the `onSave` callback is invoked with `null`, matching the prior behavior

#### Scenario: Suspense fallback during lazy load

- **WHEN** the editor chunk is still loading after the modal opens
- **THEN** a loading indicator is shown inside the modal body until the editor is ready

## REMOVED Requirements

### Requirement: Side-by-side editor and preview layout

**Reason**: Side-by-side layout caused (1) scroll desynchronization between panes as soon as the user scrolled past the initial viewport, defeating the preview's purpose, and (2) a width mismatch where admins verified layout at ~570px while end users consumed the same content at ~1100px+, hiding real formatting bugs. Replaced by the tabbed layout (see MODIFIED "Tabbed editor and preview layout").

**Migration**: The layout change is internal to `MarkdownEditor`. The only caller (`ExplanationModal`) passes `value` and `onChange` only; no caller-side changes are required.

### Requirement: Preview renderer defaults to ExplanationContent and is overridable

**Reason**: The `renderPreview?: (value: string) => ReactNode` extension point was added speculatively to support a "future non-category/subcategory admin flow" that has not materialized. Zero external callers pass it. The repo convention is to avoid speculative surface area (YAGNI) and add extension points when a concrete second consumer emerges. Replaced by the fixed-renderer requirement (see MODIFIED "Preview renderer is ExplanationContent").

**Migration**: No callers pass `renderPreview`, so removing it is a no-op at every call site. If a future consumer needs a non-`ExplanationContent` preview, reintroduce a hook (or extract a generic primitive) against that concrete use case.
