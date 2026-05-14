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

`MessageBubble` at `apps/web/src/components/Chatbot/MessageBubble.tsx` SHALL render a collapsible panel beneath the assistant bubble when `message.sourcesCited` is non-empty. Uses MUI `Collapse`, collapsed by default. Entries SHALL be deduplicated by `cite_url` before render — multiple chunks under the same source collapse to a single panel row. Header: `"Fuentes consultadas (<n>)"` where `<n>` is the count of unique `cite_url`s after dedup. Each row renders only `cite_label` as an anchor opening `cite_url` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`); the chunk `snippet` SHALL NOT be rendered (V1 corpus snippets are mid-chunk PDF excerpts that do not carry user-facing value and visually clutter the panel — backend persistence of `snippet` is unaffected). Theme tokens only — no hardcoded colors. User messages SHALL NOT render this panel.

#### Scenario: Panel is rendered when sourcesCited has at least one entry

- **WHEN** an assistant message has `sourcesCited` containing one or more entries
- **THEN** the rendered DOM SHALL contain a `Collapse`-driven panel beneath the bubble, header `"Fuentes consultadas (<n>)"` where `<n>` is the count of unique `cite_url`s in `sourcesCited` (after dedup), collapsed by default

#### Scenario: Panel dedupes entries by cite_url

- **WHEN** an assistant message has `sourcesCited` containing N entries that collapse to K unique `cite_url`s (K < N, e.g., 8 chunks from a single source → K = 1)
- **THEN** the rendered panel SHALL contain exactly K rows — one per unique `cite_url` — and the header SHALL read `"Fuentes consultadas (K)"`; no duplicate rows for the same URL SHALL appear. Backend persistence (`sources_cited` JSONB) SHALL remain unaffected — dedup is render-only

#### Scenario: Panel is not rendered when sourcesCited is undefined

- **WHEN** an assistant message has `sourcesCited` undefined
- **THEN** the rendered DOM SHALL NOT contain any "Fuentes consultadas" panel

#### Scenario: Panel is not rendered when sourcesCited is empty

- **WHEN** an assistant message has `sourcesCited = []` (defensive: should not occur per the API contract, but tolerated)
- **THEN** the rendered DOM SHALL NOT contain any "Fuentes consultadas" panel

#### Scenario: Each row links cite_label to cite_url in a new tab

- **WHEN** the panel is expanded and contains an entry with `cite_label = "GHG Protocol §2.3"` and `cite_url = "https://ghgprotocol.org/corporate-standard"`
- **THEN** the rendered row SHALL contain an anchor whose visible text is `"GHG Protocol §2.3"`, `href = "https://ghgprotocol.org/corporate-standard"`, `target = "_blank"`, `rel = "noopener noreferrer"`

#### Scenario: Snippet is not rendered in the panel

- **WHEN** the panel is expanded and contains an entry with a non-empty `snippet`
- **THEN** the rendered row SHALL NOT contain the `snippet` text — only `cite_label` (as anchor) SHALL appear. The `snippet` field SHALL remain present on `message.sourcesCited` (the API contract is unchanged), but the widget SHALL NOT surface it in the DOM

### Requirement: Widget renders a persistent foot-of-chat disclaimer

The widget SHALL render a single-line, visually subtle disclaimer pinned beneath the input area, visible whenever the chat panel is open (not gated to first-open). The text SHALL be exactly `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` (Spanish, byte-for-byte; the wording is documented as load-bearing because tests assert the substring). The disclaimer SHALL render in a smaller font size and lower-emphasis color (e.g., `theme.palette.text.secondary`) so it is informational, not visually competing with the input. It SHALL be a static element — no interaction, no dismissal, no animation.

This is a thin, persistent reminder that the chatbot is AI-generated and that citations are the verifiable source of truth. It is NOT a first-open modal (those remain deferred per the foundation deferral that this requirement narrows). It is NOT positioned to imply any single message is unreliable; it scopes the warning to the entire chat surface.

#### Scenario: Disclaimer present when widget is open

- **WHEN** the chatbot widget is open in any of its canonical states (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`)
- **THEN** the rendered DOM SHALL contain an element with the exact text `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` positioned beneath the input area

#### Scenario: Disclaimer is non-interactive

- **WHEN** the disclaimer element is inspected
- **THEN** it SHALL NOT carry any `onClick` handler, `role="button"` attribute, or visible dismiss control; it SHALL be a static text node only

#### Scenario: Disclaimer wording is the canonical literal

- **WHEN** any test or component snapshot inspects the disclaimer text
- **THEN** it SHALL match the literal `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` exactly — no truncation, no paraphrase, no emoji

### Requirement: "Nueva conversación" affordance clears local widget state only — never deletes the persisted conversation

The "Nueva conversación" control (rendered as an `AddIcon` button in the chatbot widget header) SHALL ONLY clear local React state. Specifically, on click it SHALL:

1. Reset the widget's message list to empty.
2. Generate a fresh `conversation_id` (e.g., via `crypto.randomUUID()`) so that the next outgoing `sendMessage` starts a new conversation thread for backend persistence.

The click handler SHALL NOT issue any HTTP request. The persisted `chatbot_chat_conversation` and `chatbot_chat_message` rows in the database SHALL remain untouched after the click. The icon's visible/aria label SHALL be `"Nueva conversación"` — the wording communicates "start a fresh thread", not "delete the database".

The widget in V1 SHALL NOT expose any user-facing affordance for deleting persisted conversation history. The foundation-defined `DELETE /api/chatbot/conversations/me` endpoint exists and is operable by support staff for D11 right-to-be-forgotten requests, but the user-facing UI affordance is intentionally deferred to a future change (see `chatbot-educate-mode-full`). V1 is intentionally not a full-compliance-UI-complete release; the regulatory obligation is met via support intake plus endpoint invocation, with the UI affordance planned for V2/V3.

This is a PM-owned decision: conversations are auditable and may need server-side review after the user starts a new conversation; client-triggered hard delete is out of V1 scope. Decision recorded in `design.md` Decision 25.

#### Scenario: "Nueva conversación" click clears the rendered message list

- **WHEN** the user clicks the widget's "Nueva conversación" button while the message list contains ≥1 message
- **THEN** immediately after the click handler returns, the rendered DOM SHALL contain zero rendered chat-message bubbles

#### Scenario: "Nueva conversación" click does NOT issue any HTTP request

- **WHEN** the user clicks the widget's "Nueva conversación" button while the message list contains ≥1 message
- **AND** an `apiClient` / `fetch` spy observes outgoing HTTP traffic during and immediately after the click
- **THEN** no request SHALL be observed — in particular, no `DELETE` request to any `/chat/conversations*`, `/chat/messages*`, or other backend path

#### Scenario: Next message after clear uses a fresh conversation_id

- **WHEN** the user clicks the "Nueva conversación" button, then sends a new message
- **THEN** the outgoing `sendMessage` request SHALL carry a `conversation_id` distinct from any `conversation_id` used by messages sent before the click

#### Scenario: Persisted rows survive the clear action

- **WHEN** the user clicks the "Nueva conversación" button while a conversation persisted as N `chatbot_chat_message` rows in the database
- **THEN** after the click, those N rows SHALL remain unmodified (same content, same `tokens_used`, same `sources_cited`, same `created_at`); no row SHALL be deleted, soft-deleted, or otherwise mutated

#### Scenario: Affordance label communicates new conversation, not delete

- **WHEN** the "Nueva conversación" button's tooltip / aria-label is inspected
- **THEN** the label SHALL be `"Nueva conversación"` and SHALL NOT be `"Eliminar conversación"` or `"Limpiar conversación"` (or any synonym implying server-side deletion or implying the widget is a destructive control)

## MODIFIED Requirements

### Requirement: Widget renders assistant messages as Markdown

The widget SHALL render assistant content as Markdown via `react-markdown` (`remark-math`, `remark-gfm`, `rehype-katex`). User messages SHALL render as plain text. Inline citation markers of the form `[label](url)` produced under the system-prompt citation rule SHALL NOT render in the assistant message body — the widget SHALL override ReactMarkdown's `a` component to return `null`, eliminating both the link and its label from the rendered DOM. The Markdown source text in `message.content` SHALL be preserved untouched; the decision lives entirely at render time so re-introducing inline citations in V2/V3 (when the corpus diversifies beyond a single source) requires only a renderer change, not a content-pipeline change. The collapsible "Fuentes consultadas" panel is the sole verification affordance.

#### Scenario: Assistant message renders Markdown features

- **WHEN** the assistant message content includes Markdown features supported by `ExplanationContent` (bold, lists, code blocks, math via KaTeX, GFM tables)
- **THEN** the widget SHALL render those features visually, equivalent to the existing `ExplanationContent` rendering

#### Scenario: Inline citation markers do not render in the assistant message body

- **WHEN** the assistant content contains `[GHG Protocol §2.3](https://ghgprotocol.org/corporate-standard)` in the streamed Markdown
- **THEN** the rendered message bubble SHALL NOT contain an `<a>` element whose `href = "https://ghgprotocol.org/corporate-standard"`, and SHALL NOT contain the visible text `"GHG Protocol §2.3"` for that citation marker — both the link and its label SHALL be absent from the DOM. `message.content` SHALL be preserved verbatim; the suppression is render-only via the ReactMarkdown `components.a` override

#### Scenario: User message rendered as plain text

- **WHEN** a user message contains characters that look like Markdown syntax (e.g., `**`, `#`)
- **THEN** the widget SHALL render those characters literally, not as formatting

## REMOVED Requirements

### Requirement: Widget visual review and disclaimer are explicitly out of scope

This requirement is REMOVED and replaced by a narrower deferral. The original foundation requirement deferred ALL of: first-open disclaimer, polished visual design, mobile-responsive layout, ARIA streaming announcements, and discoverability. This change narrows the deferral by **shipping a persistent foot-of-chat disclaimer** (see `Widget renders a persistent foot-of-chat disclaimer` requirement above). All other deferred items (first-open modal disclaimer, visual polish, mobile responsiveness, ARIA announcements, discoverability) remain explicitly out of scope and continue to be deferred to a separate design review.

The persistent disclaimer is a different artifact from the foundation-deferred "first-open disclaimer": foundation deferred a one-time modal/banner shown on first open; this change ships a static, always-visible single line beneath the input. The two are not equivalent and shipping one does not satisfy the other; the foundation-style first-open disclaimer remains deferred.
