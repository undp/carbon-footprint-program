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

#### Scenario: Widget renders snippets as-received without additional truncation

- **WHEN** the widget receives a `done` event whose `sources[i].snippet` is up to 240 characters (the maximum enforced by the streaming handler per `chatbot-message-streaming` spec)
- **THEN** the widget SHALL render the full snippet text verbatim — without re-truncating, adding ellipsis, or otherwise modifying its length. Truncation is the streaming handler's responsibility at persistence time; the widget is a pass-through for whatever the API delivered. This avoids double-truncation drift if the server-side cap ever changes

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

### Requirement: Trash icon clears local widget state only — never deletes the persisted conversation

The trash-icon (clear-chat) control in the chatbot widget SHALL ONLY clear local React state. Specifically, on click it SHALL:

1. Reset the widget's message list to empty.
2. Generate a fresh `conversation_id` (e.g., via `crypto.randomUUID()`) so that the next outgoing `sendMessage` starts a new conversation thread for backend persistence.

The trash-icon click handler SHALL NOT issue any HTTP request. The persisted `chatbot_chat_conversation` and `chatbot_chat_message` rows in the database SHALL remain untouched after the click. The icon's visible/aria label SHALL be `"Limpiar conversación"` (clear) — NOT `"Eliminar conversación"` (delete) — because the wording must match the actual behavior. (The widget DOES expose a SEPARATE "Eliminar mi historial" affordance in the foot of the panel that calls the foundation `DELETE /api/chatbot/conversations/me` endpoint with confirmation; that endpoint comes from the foundation `chatbot-conversation-deletion` capability, not this change. See the dedicated requirement below for the D11 affordance contract.)

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

## MODIFIED Requirements

### Requirement: Widget invokes `DELETE /api/chatbot/conversations/me` via a dedicated "Eliminar mi historial" affordance, separate from the trash icon

The widget SHALL split the foundation-defined "user-visible affordance to delete chat history" into TWO distinct affordances with different semantics:

1. **Trash icon (top of widget panel)**: clears LOCAL React state only — resets message list, generates fresh `conversation_id`, NEVER calls a backend endpoint, NEVER mutates persisted rows. Aria-label: `"Limpiar conversación"`. Fully specified in the `Trash icon clears local widget state only — never deletes the persisted conversation` requirement above.

2. **"Eliminar mi historial" link (foot of widget panel)**: invokes the foundation `DELETE /api/chatbot/conversations/me` endpoint to permanently remove the caller's conversation history from the database. The link SHALL be visually discrete (`<button>` styled as a text link with `theme.palette.text.secondary` color and `variant="caption"` typography), positioned in the foot of the widget panel adjacent to the persistent disclaimer (NOT in the message list, NOT in the input row). On click, the widget SHALL show a confirmation dialog with:
   - Title: `"¿Eliminar tu historial de conversaciones?"`
   - Body: `"Esta acción es permanente. Se eliminarán todas las conversaciones asociadas a tu sesión y no podremos recuperarlas. ¿Quieres continuar?"`
   - Confirm button label: `"Eliminar permanentemente"` (destructive variant — `color="error"` on MUI)
   - Cancel button label: `"Cancelar"`

   On confirmation: the widget SHALL `fetch(...)` the `DELETE` endpoint with `credentials: "include"` (matching the foundation widget HTTP convention). On HTTP 204: clear local message list, generate fresh `conversation_id`, transition the widget to the `empty` state, and surface a brief toast/inline confirmation `"Tu historial fue eliminado"`. On HTTP 5xx or network error: keep local state intact, close the dialog, and surface an error message `"No pudimos eliminar tu historial. Intenta nuevamente más tarde."` — the widget SHALL NOT retry automatically.

   The link SHALL be visible in every canonical widget state EXCEPT `empty` (no point offering deletion when there is no persisted history). When the local view is `empty` but persisted rows exist for the caller's `session_id`/`user_id` (e.g., after a trash-icon click), the link MAY be shown — the widget does not have visibility into persisted state, so the simplest rule is: hide only when the widget has never persisted a conversation in the current session AND the message list is empty.

This split closes the trash-icon dissonance (users no longer guess whether trash deletes the database) and satisfies D11's right-to-be-forgotten with a concrete UI affordance — a compliance trust signal for UNDP and country deployments under Ley 21.719 / LGPD / GDPR. The foundation requirement "Widget invokes DELETE on user request" is thus **fulfilled** by this change, just routed through a different, clearly-labeled control.

#### Scenario: "Eliminar mi historial" link is present in the foot of the widget panel

- **WHEN** the widget is open and the message list contains at least one message (or the widget has previously sent a message in the current session)
- **THEN** the rendered DOM SHALL contain a button styled as a text link with the visible text `"Eliminar mi historial"` positioned in the foot of the widget panel; the button SHALL be visually distinct from the trash icon (different position, different size, different visual weight)

#### Scenario: Click opens a confirmation dialog with the documented copy

- **WHEN** the user clicks the "Eliminar mi historial" link
- **THEN** a confirmation dialog SHALL appear with title `"¿Eliminar tu historial de conversaciones?"`, body `"Esta acción es permanente. Se eliminarán todas las conversaciones asociadas a tu sesión y no podremos recuperarlas. ¿Quieres continuar?"`, confirm label `"Eliminar permanentemente"`, cancel label `"Cancelar"`. No HTTP request SHALL be issued at this stage

#### Scenario: Cancel closes the dialog without side effects

- **WHEN** the user clicks "Cancelar" in the confirmation dialog
- **THEN** the dialog SHALL close, no HTTP request SHALL fire, the widget state and message list SHALL remain unchanged

#### Scenario: Confirm fires DELETE and clears state on 204

- **WHEN** the user clicks "Eliminar permanentemente" and the API returns HTTP 204
- **THEN** the widget SHALL clear the local message list, generate a fresh `conversation_id`, transition to the `empty` state, and display a brief confirmation `"Tu historial fue eliminado"`. The outgoing request SHALL be `DELETE /api/chatbot/conversations/me` with `credentials: "include"` and no body

#### Scenario: HTTP 5xx surfaces an error and preserves local state

- **WHEN** the user confirms deletion and the API returns HTTP 500 (or the network call fails)
- **THEN** the dialog SHALL close, the local message list SHALL remain intact, and an error message `"No pudimos eliminar tu historial. Intenta nuevamente más tarde."` SHALL be displayed; the widget SHALL NOT retry automatically and SHALL NOT generate a fresh `conversation_id`

#### Scenario: Trash icon and "Eliminar mi historial" link are visually and semantically distinct

- **WHEN** the widget is rendered with both affordances visible
- **THEN** the trash icon SHALL be a button at the top of the widget panel with aria-label `"Limpiar conversación"` and the "Eliminar mi historial" SHALL be a button styled as a text link at the foot of the widget panel with that visible text. The two SHALL NOT share styling (size, color, position) — the visual distinction is required to prevent users from conflating clear-local with delete-persistent

## REMOVED Requirements

### Requirement: Widget visual review and disclaimer are explicitly out of scope

This requirement is REMOVED and replaced by a narrower deferral. The original foundation requirement deferred ALL of: first-open disclaimer, polished visual design, mobile-responsive layout, ARIA streaming announcements, and discoverability. This change narrows the deferral by **shipping a persistent foot-of-chat disclaimer** (see `Widget renders a persistent foot-of-chat disclaimer` requirement above). All other deferred items (first-open modal disclaimer, visual polish, mobile responsiveness, ARIA announcements, discoverability) remain explicitly out of scope and continue to be deferred to a separate design review.

The persistent disclaimer is a different artifact from the foundation-deferred "first-open disclaimer": foundation deferred a one-time modal/banner shown on first open; this change ships a static, always-visible single line beneath the input. The two are not equivalent and shipping one does not satisfy the other; the foundation-style first-open disclaimer remains deferred.
