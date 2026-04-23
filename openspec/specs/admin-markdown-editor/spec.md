# admin-markdown-editor Specification

## Purpose

TBD - created by archiving change markdown-editor-side-by-side. Update Purpose after archive.

## Requirements

### Requirement: Reusable admin MarkdownEditor component

The web app SHALL provide a reusable `MarkdownEditor` component at `apps/web/src/components/markdown/MarkdownEditor.tsx` that offers a side-by-side markdown editing experience for admin screens. The component MUST be a controlled primitive driven by `value: string` and `onChange: (next: string) => void` props, MUST NOT couple itself to any specific entity or data layer, and MUST be consumable from any admin route without modification.

#### Scenario: Controlled value contract

- **WHEN** a consumer renders `<MarkdownEditor value={v} onChange={fn} />` with a string `v`
- **THEN** the editor pane displays `v` as its initial content, and every user keystroke invokes `fn(next)` with the updated markdown source

#### Scenario: Component is reusable outside category/subcategory

- **WHEN** a future admin screen unrelated to categories or subcategories imports `MarkdownEditor` from `@/components/markdown`
- **THEN** the component renders and functions correctly with no category-specific or subcategory-specific coupling

### Requirement: Side-by-side editor and preview layout

The `MarkdownEditor` component SHALL render its editor pane and its preview pane in a single-row side-by-side layout at all times. Each pane MUST occupy equal horizontal space, MUST share a fixed height (default 480px, overridable via a `height` prop), and MUST scroll independently when content exceeds the pane height.

#### Scenario: Both panes visible simultaneously

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the editor pane is visible on the left and the preview pane is visible on the right in the same row, regardless of viewport width

#### Scenario: Panes scroll independently

- **WHEN** the markdown content exceeds the configured pane height
- **THEN** scrolling inside the editor pane does not scroll the preview pane, and scrolling inside the preview pane does not scroll the editor pane

#### Scenario: Default height

- **WHEN** `MarkdownEditor` is rendered without a `height` prop
- **THEN** both panes use the shared default height of 480px

### Requirement: Preview renderer defaults to ExplanationContent and is overridable

The preview pane SHALL render markdown using `ExplanationContent` by default, guaranteeing byte-for-byte parity with the end-user explanation viewer. Consumers MUST be able to override the preview via an optional `renderPreview?: (value: string) => ReactNode` prop.

#### Scenario: Default preview matches end-user viewer

- **WHEN** `MarkdownEditor` is rendered without a `renderPreview` prop
- **THEN** the preview pane renders the current value through the same `ExplanationContent` component used by the end-user `ExplanationContext` dialog, with identical plugin set (remark-gfm, remark-math, rehype-katex) and Tailwind `prose` styling

#### Scenario: Empty-value preview shows the shared empty state

- **WHEN** `MarkdownEditor` is rendered with `value === ""` and no custom `renderPreview`
- **THEN** the preview pane displays the `ExplanationContent` empty state (InfoOutlined icon and the Spanish "no hay explicación" message)

#### Scenario: Custom preview renderer

- **WHEN** a consumer passes a `renderPreview` function
- **THEN** the preview pane renders the node returned by `renderPreview(value)` instead of the default `ExplanationContent` output

### Requirement: Toolbar excludes image command, keeps formatting essentials

The editor toolbar SHALL provide commands for bold, italic, headings, unordered/ordered lists, link, inline code and code block, and blockquote. The toolbar MUST NOT include an image command.

#### Scenario: Image command is not rendered

- **WHEN** `MarkdownEditor` is rendered
- **THEN** no image-upload or image-insert button is present in the toolbar

#### Scenario: Formatting commands are present

- **WHEN** `MarkdownEditor` is rendered
- **THEN** the toolbar exposes at minimum bold, italic, heading, list, link, code, and quote commands

### Requirement: Light theme is enforced

The `MarkdownEditor` component SHALL force a light color mode regardless of any ambient theme, by applying `data-color-mode="light"` on its wrapper and aligning toolbar/background colors with the MUI light palette via theme tokens (`theme.palette.background.paper`, `theme.palette.text.primary`, `theme.palette.divider`). No hex or rgb literals MAY be used for these overrides.

#### Scenario: Wrapper enforces light mode

- **WHEN** `MarkdownEditor` renders inside any parent, including future dark-mode experiments
- **THEN** the editor wrapper carries `data-color-mode="light"` and its colors reference `theme.palette.*` tokens rather than hardcoded values

### Requirement: Lazy-loadable default export

`MarkdownEditor` SHALL be exported such that consumers can lazy-import it via `React.lazy(() => import("@/components/markdown/MarkdownEditor"))`. A named re-export MUST also be available from `@/components/markdown` for consumers that do not need lazy loading.

#### Scenario: Default export supports React.lazy

- **WHEN** a consumer calls `React.lazy(() => import("@/components/markdown/MarkdownEditor"))`
- **THEN** the lazy component resolves to the `MarkdownEditor` implementation with no additional boilerplate

#### Scenario: Named re-export from barrel

- **WHEN** a consumer imports `{ MarkdownEditor }` from `@/components/markdown`
- **THEN** the component resolves without requiring lazy loading

### Requirement: ExplanationModal edit mode uses the lazy-loaded MarkdownEditor

`apps/web/src/screens/Maintainer/components/ExplanationModal.tsx` SHALL render its editable body using the new `MarkdownEditor` component, imported via `React.lazy` and wrapped in a `Suspense` fallback. The plain `TextField` previously used for editing MUST be removed. The modal MUST preserve its existing null/empty handling: `value ?? ""` on open, and the empty string MUST be mapped back to `null` on save.

#### Scenario: Editable modal renders the side-by-side editor

- **WHEN** an admin opens `ExplanationModal` with `readOnly={false}`
- **THEN** the modal body shows the lazy-loaded `MarkdownEditor` with both editor and preview panes visible side-by-side

#### Scenario: Editor bundle is not loaded until the modal opens

- **WHEN** a maintainer screen mounts but no admin has opened `ExplanationModal`
- **THEN** the `@uiw/react-md-editor` chunk is absent from the initial admin bundle and only fetched on first modal open

#### Scenario: Empty value saves as null

- **WHEN** an admin clears the editor and clicks save
- **THEN** the `onSave` callback is invoked with `null`, matching the prior behavior of the plain `TextField`-based modal

#### Scenario: Suspense fallback during lazy load

- **WHEN** the editor chunk is still loading after the modal opens
- **THEN** a loading indicator is shown inside the modal body until the editor is ready

### Requirement: ExplanationModal read-only mode renders rendered markdown

When `ExplanationModal` receives `readOnly={true}`, its body SHALL render the markdown via `ExplanationContent`, matching the end-user explanation viewer. The disabled raw-source `TextField` previously used in the read-only branch MUST be removed.

#### Scenario: Read-only view shows rendered output

- **WHEN** a maintainer opens `ExplanationModal` with `readOnly={true}` for a value containing GFM tables, headings, or math blocks
- **THEN** the modal body displays the fully rendered markdown, not the raw source

#### Scenario: Read-only view matches end-user viewer

- **WHEN** the same markdown content is viewed through the end-user `ExplanationContext` dialog and through the admin `ExplanationModal` in read-only mode
- **THEN** both render identically (same component, same plugins, same prose styling)

#### Scenario: Read-only action buttons unchanged

- **WHEN** the modal is read-only
- **THEN** only the "Cerrar" button is shown; the "Guardar cambios" button is not rendered

### Requirement: Exact-pinned @uiw/react-md-editor dependency

The `apps/web/package.json` file SHALL declare `@uiw/react-md-editor` with an exact version (no `^` or `~` prefix). The pinned version MUST be compatible with the repo's React version (currently 19.2).

#### Scenario: Dependency is pinned

- **WHEN** `apps/web/package.json` is inspected
- **THEN** the `@uiw/react-md-editor` version string contains no range prefix

#### Scenario: React peer compatibility verified

- **WHEN** `pnpm install` runs at the repo root
- **THEN** no peer-dependency warning or error is emitted for `@uiw/react-md-editor` against the installed React version
