## MODIFIED Requirements

### Requirement: Side-by-side editor and preview layout

The `MarkdownEditor` component SHALL render its editor pane and its preview pane in a single-row side-by-side layout at all times, sourced from `@uiw/react-md-editor`'s native `preview="live"` mode. The component MUST NOT hand-roll a custom flex-row split and MUST NOT expose a tabbed layout. Each pane MUST occupy equal horizontal space as determined by the library, MUST share a fixed height (default 520px, overridable via a `height` prop), and MUST scroll independently when content exceeds the pane height.

#### Scenario: Both panes visible simultaneously

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the editor pane is visible on one side and the preview pane is visible on the other side in the same row at all viewport widths, with no tab switcher gating visibility

#### Scenario: Split is driven by the library

- **WHEN** `MarkdownEditor` mounts
- **THEN** the underlying `MDEditor` is instantiated with `preview="live"` and no custom absolute/flex layout wraps the two panes separately

#### Scenario: Panes scroll independently

- **WHEN** the markdown content exceeds the configured pane height
- **THEN** each pane owns its own vertical scrollbar, provided by the library

#### Scenario: Default height

- **WHEN** `MarkdownEditor` is rendered without a `height` prop
- **THEN** both panes share the default height of 520px

### Requirement: Preview renderer is ExplanationContent

The preview pane SHALL always render markdown using `ExplanationContent`, guaranteeing byte-for-byte parity with the end-user explanation viewer. The component MUST supply this through `@uiw/react-md-editor`'s `components.preview` override. No consumer-facing prop MAY change or disable this renderer.

#### Scenario: Preview matches end-user viewer

- **WHEN** `MarkdownEditor` renders any non-empty value
- **THEN** the preview pane renders that value through the same `ExplanationContent` component used by the end-user `ExplanationContext` dialog, with identical plugin set (`remark-gfm`, `remark-math`, `rehype-katex`) and Tailwind `prose` styling

#### Scenario: Empty-value preview shows the shared empty state

- **WHEN** `MarkdownEditor` is rendered with `value === ""`
- **THEN** the preview pane displays the `ExplanationContent` empty state (InfoOutlined icon and the Spanish "no hay explicación" message)

#### Scenario: Preview content is supplied via components.preview

- **WHEN** `MarkdownEditor` mounts
- **THEN** the `MDEditor` receives a `components.preview` callback whose return value is an `<ExplanationContent>` element for the current source

### Requirement: Toolbar exposes every library command, localized to Spanish

The editor toolbar SHALL expose every built-in command exported from `@uiw/react-md-editor` (including but not limited to bold, italic, title, heading1–heading6, unordered/ordered/checked list, link, inline code, code block, quote, image, table, preview-mode toggles, fullscreen, help, issue). Each rendered command button's `aria-label` and `title` MUST be Spanish text sourced from a single localization map. No English tooltips MAY reach the rendered admin UI.

#### Scenario: Every built-in command is present

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the toolbar contains a button for every command exposed by the library's `commands` export that is intended to appear in the main toolbar (excluding internal dividers, which remain as dividers)

#### Scenario: Tooltips and aria-labels are Spanish

- **WHEN** a user hovers or focuses any toolbar command button
- **THEN** the button's `title` attribute and its `aria-label` are Spanish strings from the project's command-label map, not the library's default English values

#### Scenario: No image command exclusion

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the image command is present in the toolbar (prior exclusion requirement no longer applies; filtering is a separate future concern)

## REMOVED Requirements

### Requirement: Preview renderer defaults to ExplanationContent and is overridable

**Reason**: The `renderPreview` prop has zero callers and the new implementation fixes the preview to `ExplanationContent` through `@uiw/react-md-editor`'s `components.preview` seam. The "default + overridable" shape added surface for a future use case that has not materialized.

**Migration**: Consumers that need a different preview in an admin surface should build a dedicated component around `MDEditor` rather than extending `MarkdownEditor` with a renderer prop. No existing consumer passes `renderPreview`, so no migration is required for shipped code.
