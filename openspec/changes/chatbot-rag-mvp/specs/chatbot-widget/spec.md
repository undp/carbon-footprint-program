## ADDED Requirements

### Requirement: ChatbotMessage shape carries optional sourcesCited

`ChatbotMessage` in `apps/web/src/components/Chatbot/types.ts` SHALL gain optional `sourcesCited?: SourceCitation[]` where `SourceCitation = { source_id: string; chunk_id: string; cite_label: string; cite_url: string; snippet: string }`. `source_id`/`chunk_id` are strings (API serializes BigInt as strings in `done`). May be imported from `@repo/types`. Only assistant messages SHALL carry it.

#### Scenario: Type extension is present in the widget types module

- **WHEN** `apps/web/src/components/Chatbot/types.ts` is inspected
- **THEN** `ChatbotMessage` SHALL include optional `sourcesCited?: SourceCitation[]`, and `SourceCitation` SHALL be defined (or imported from `@repo/types`) with the documented five-field shape

#### Scenario: User messages do not carry sourcesCited

- **WHEN** a user message is appended to widget state by `useChatStream`
- **THEN** the resulting `ChatbotMessage` SHALL have `role = "user"` and SHALL NOT have `sourcesCited` set

### Requirement: useChatStream parses sources from the done event payload

`useChatStream` SHALL parse the `done` SSE event's `data:` JSON and extract optional `sources`. When present and non-empty, assigns to the in-flight assistant message's `sourcesCited` via the same state-mutation path that updates content. When absent or empty, leaves `sourcesCited` unset. Malformed `sources` payloads log a `warn` to the browser console and are treated as absent.

#### Scenario: sources field assigned to in-flight assistant message

- **WHEN** the `done` SSE event carries `data: {"inputTokens":12,"outputTokens":34,"sources":[{"source_id":"1","chunk_id":"7","cite_label":"GHG §2.3","cite_url":"https://ghgprotocol.org/...","snippet":"Las emisiones de alcance 1..."}]}`
- **THEN** the in-flight assistant message SHALL have `sourcesCited` set to a one-element array matching the parsed entry

#### Scenario: Absent sources field leaves sourcesCited unset

- **WHEN** the `done` event carries `data: {"inputTokens":12,"outputTokens":34}` (no `sources`)
- **THEN** the in-flight assistant message SHALL NOT have `sourcesCited` set (undefined)

#### Scenario: Empty sources array leaves sourcesCited unset

- **WHEN** the `done` event carries `data: {"inputTokens":12,"outputTokens":34,"sources":[]}` (defensive)
- **THEN** the in-flight assistant message SHALL NOT have `sourcesCited` set; the empty-array case SHALL be handled equivalently to the absent-field case

#### Scenario: Malformed sources payload does not break the turn

- **WHEN** the `done` event carries a `sources` field that fails JSON parsing or schema validation (e.g., `sources: "broken"` or an array of non-object entries)
- **THEN** the hook SHALL log a `warn` to the browser console naming the malformed field, the assistant message SHALL render normally with no `sourcesCited`, and the widget state SHALL transition through `streaming → empty` (or whichever state the foundation contract dictates) as if `done` had been well-formed without `sources`

### Requirement: MessageBubble renders a collapsible "Fuentes consultadas" panel when sourcesCited is non-empty

`MessageBubble` at `apps/web/src/components/Chatbot/MessageBubble.tsx` SHALL render a collapsible panel beneath the assistant bubble when `message.sourcesCited` is non-empty. Uses MUI `Collapse`, collapsed by default. Header: `"Fuentes consultadas (<n>)"`. Each row: `cite_label` as anchor opening `cite_url` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`), `snippet` below in smaller font. Theme tokens only — no hardcoded colors. User messages SHALL NOT render this panel.

#### Scenario: Panel is rendered when sourcesCited has at least one entry

- **WHEN** an assistant message has `sourcesCited` containing one or more entries
- **THEN** the rendered DOM SHALL contain a `Collapse`-driven panel beneath the bubble, header `"Fuentes consultadas (<n>)"` where `<n>` is the count, collapsed by default

#### Scenario: Panel is not rendered when sourcesCited is undefined

- **WHEN** an assistant message has `sourcesCited` undefined
- **THEN** the rendered DOM SHALL NOT contain any "Fuentes consultadas" panel

#### Scenario: Panel is not rendered when sourcesCited is empty

- **WHEN** an assistant message has `sourcesCited = []` (defensive: should not occur per the API contract, but tolerated)
- **THEN** the rendered DOM SHALL NOT contain any "Fuentes consultadas" panel

#### Scenario: Each row links cite_label to cite_url in a new tab

- **WHEN** the panel is expanded and contains an entry with `cite_label = "GHG Protocol §2.3"` and `cite_url = "https://ghgprotocol.org/corporate-standard"`
- **THEN** the rendered row SHALL contain an anchor whose visible text is `"GHG Protocol §2.3"`, `href = "https://ghgprotocol.org/corporate-standard"`, `target = "_blank"`, `rel = "noopener noreferrer"`

#### Scenario: Snippet is rendered beneath the link

- **WHEN** the panel is expanded and contains an entry with a non-empty `snippet`
- **THEN** the rendered row SHALL contain the `snippet` text below the link

### Requirement: Trash icon clears local widget state only — never deletes the persisted conversation

The trash-icon (clear-chat) control in the chatbot widget SHALL ONLY clear local React state. Specifically, on click it SHALL:

1. Reset the widget's message list to empty.
2. Generate a fresh `conversation_id` (e.g., via `crypto.randomUUID()`) so that the next outgoing `sendMessage` starts a new conversation thread for backend persistence.

The handler SHALL NOT issue any HTTP request — there is NO `DELETE /chat/conversations/...` (or equivalent) endpoint in V1, and none is added by this change. The persisted `chatbot_chat_conversation` and `chatbot_chat_message` rows in the database SHALL remain untouched after the click. The icon's visible/aria label SHALL be `"Limpiar conversación"` (clear) — NOT `"Eliminar conversación"` (delete) — because the wording must match the actual behavior.

This is a PM-owned decision: conversations are auditable and may need server-side review after the user clears the UI; client-triggered hard delete is out of V1 scope and belongs to the V4 admin-UI scope. Decision recorded in `design.md` Decision 25.

#### Scenario: Trash icon click clears the rendered message list

- **WHEN** the user clicks the widget's trash icon while the message list contains ≥1 message
- **THEN** immediately after the click handler returns, the rendered DOM SHALL contain zero rendered chat-message bubbles

#### Scenario: Trash icon click does NOT issue any HTTP request

- **WHEN** the user clicks the widget's trash icon while the message list contains ≥1 message
- **AND** an `apiClient` / `fetch` spy observes outgoing HTTP traffic during and immediately after the click
- **THEN** no request SHALL be observed — in particular, no `DELETE` request to any `/chat/conversations*`, `/chat/messages*`, or other backend path

#### Scenario: Next message after clear uses a fresh conversation_id

- **WHEN** the user clicks the trash icon, then sends a new message
- **THEN** the outgoing `sendMessage` request SHALL carry a `conversation_id` distinct from any `conversation_id` used by messages sent before the click

#### Scenario: Persisted rows survive the clear action

- **WHEN** the user clicks the trash icon while a conversation persisted as N `chatbot_chat_message` rows in the database
- **THEN** after the click, those N rows SHALL remain unmodified (same content, same `tokens_used`, same `sources_cited`, same `created_at`); no row SHALL be deleted, soft-deleted, or otherwise mutated

#### Scenario: Icon label communicates clear, not delete

- **WHEN** the trash icon's tooltip / aria-label is inspected
- **THEN** the label SHALL be `"Limpiar conversación"` and SHALL NOT be `"Eliminar conversación"` (or any synonym implying server-side deletion)

## MODIFIED Requirements

### Requirement: Widget renders assistant messages as Markdown

The widget SHALL render assistant content as Markdown via `react-markdown` (`remark-math`, `remark-gfm`, `rehype-katex`). User messages SHALL render as plain text. Inline `[label](url)` produced under the citation rule SHALL render as anchors with `target="_blank"` + `rel="noopener noreferrer"` via the markdown component config. The collapsible panel is the secondary surface; inline citation markers are the primary verification affordance.

#### Scenario: Assistant message renders Markdown features

- **WHEN** the assistant message content includes Markdown features supported by `ExplanationContent` (bold, lists, code blocks, math via KaTeX, GFM tables)
- **THEN** the widget SHALL render those features visually, equivalent to the existing `ExplanationContent` rendering

#### Scenario: Inline citation links render as anchors targeting a new tab

- **WHEN** the assistant content contains `[GHG Protocol §2.3](https://ghgprotocol.org/corporate-standard)`
- **THEN** the rendered DOM SHALL contain an `<a>` element whose visible text is `"GHG Protocol §2.3"`, `href = "https://ghgprotocol.org/corporate-standard"`, `target = "_blank"`, `rel = "noopener noreferrer"`

#### Scenario: User message rendered as plain text

- **WHEN** a user message contains characters that look like Markdown syntax (e.g., `**`, `#`)
- **THEN** the widget SHALL render those characters literally, not as formatting
