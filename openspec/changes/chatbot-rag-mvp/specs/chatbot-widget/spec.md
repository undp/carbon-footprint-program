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
3. Drop the `chatbot_conversation_id` cookie client-side (via `document.cookie` with `Max-Age=0` on path `/api/chatbot`) so that a subsequent page reload does NOT rehydrate the prior thread via `GET /api/chatbot/conversations/me/current`. The cookie is set `httpOnly: false` precisely to enable this client-side drop without a server round-trip — see `design.md` Decision 28.

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

#### Scenario: "Nueva conversación" click drops chatbot_conversation_id cookie client-side

- **WHEN** the user clicks the widget's "Nueva conversación" button while the `chatbot_conversation_id` cookie is set to a signed value
- **THEN** immediately after the click handler returns, `document.cookie` SHALL no longer carry `chatbot_conversation_id` (the handler SHALL have written `chatbot_conversation_id=; path=/api/chatbot; max-age=0` or equivalent); a subsequent `GET /api/chatbot/conversations/me/current` issued from the same browser SHALL receive HTTP 204 (no cookie path)

### Requirement: Widget restores active conversation on mount via signed conversation cookie

On mount, `useChatStream` SHALL issue a single `GET /api/chatbot/conversations/me/current` with `credentials: "include"`. The server reads the signed `chatbot_conversation_id` cookie, enforces the TTL (`expires_at > NOW()`) and a strict identity match (authenticated callers match the row's `user_id`; anonymous callers match `session_id` AND `user_id IS NULL`), and returns:

- **HTTP 200** with `{ conversation, messages }` — the widget SHALL seed its `messages` state from `response.messages` in the order received (server returns ASC by `created_at`). Each message becomes a `ChatbotMessage` with `role` mapped from `ChatMessageRole` to the widget's `"user" | "assistant"` lowercase enum, `content` copied verbatim, and `sourcesCited` assigned only when the assistant message's `sourcesCited` array is non-empty (mirrors the live-stream contract — empty arrays remain absent on the widget shape).
- **HTTP 204** (cookie absent) — the widget SHALL start with an empty message list. No state mutation.
- **HTTP 404** (cookie present but row expired / identity mismatch / tampered cookie) — the widget SHALL start with an empty message list. The server's 404 response SHALL carry a `Set-Cookie: chatbot_conversation_id=; Max-Age=0` header that clears the stale cookie at the browser level, so subsequent reloads do not loop into the same 404.
- **Network failure / non-JSON body** — the widget SHALL treat the request as best-effort, leave the message list empty, and surface no error to the user (mount-time rehydration is a polish affordance, not a critical path).

The widget SHALL expose a `historyLoading` flag (true from mount until the rehydrate request settles via any outcome). The chat surface SHALL suppress the empty-state placeholder (`"¿En qué puedo ayudarte?"`) while `historyLoading` is true so a populated thread does not flash empty before the seed lands. Once `historyLoading` is false, the placeholder logic returns to the existing rule (`messages.length === 0`).

The rehydration SHALL fire exactly once per `useChatStream` mount. Sending a new message while the rehydrate is in flight SHALL NOT cause the seed to overwrite the new message — the in-flight load is cancelled on unmount and the seed only sets state when the response settles before unmount.

V1 explicitly does NOT support the anon → auth claim transition: a user who started a conversation anonymously and then authenticates receives 404 on the rehydrate (their cookie points to an anon row whose `user_id` is NULL, which does not match an authenticated request's identity filter). The widget falls back to an empty thread and the user starts a fresh conversation. Documented in `design.md` Decision 28 and tracked under `proposal.md` Deferred Debt.

#### Scenario: Cookie absent on mount starts empty

- **WHEN** the widget mounts and no `chatbot_conversation_id` cookie is present on `document.cookie`
- **AND** `useChatStream` issues `GET /api/chatbot/conversations/me/current`
- **THEN** the server SHALL respond HTTP 204 and the widget SHALL render with `messages.length === 0` and `historyLoading === false`

#### Scenario: Cookie present and conversation valid hydrates chronologically

- **WHEN** the widget mounts with a valid signed `chatbot_conversation_id` cookie matching a conversation whose `expires_at > NOW()` and whose identity matches the caller
- **AND** the conversation has N persisted USER / ASSISTANT messages
- **THEN** the server SHALL respond HTTP 200 with `messages` of length N ordered ASC by `created_at`, and the widget's rendered DOM SHALL contain N `MessageBubble` elements in that same order; an assistant message whose persisted `sources_cited` is non-empty SHALL render the "Fuentes consultadas (N)" panel

#### Scenario: Cookie present but conversation expired clears cookie and starts empty

- **WHEN** the widget mounts with a `chatbot_conversation_id` cookie whose conversation row has `expires_at < NOW()`
- **THEN** the server SHALL respond HTTP 404 with a `Set-Cookie: chatbot_conversation_id=; Max-Age=0` header; the widget SHALL render with `messages.length === 0`; on a subsequent reload the cookie SHALL be absent from the browser and the next `GET /current` SHALL receive 204

#### Scenario: Cookie points to another identity's conversation clears cookie and starts empty (IDOR guard)

- **WHEN** the widget mounts with a `chatbot_conversation_id` cookie whose conversation row belongs to a different `user_id` (or to a different `session_id`, or is anonymous while the caller is authenticated)
- **THEN** the server SHALL respond HTTP 404 with a `Set-Cookie: chatbot_conversation_id=; Max-Age=0` header (NOT 200 — the strict identity filter prevents the cross-identity leak); the widget SHALL render with `messages.length === 0`

#### Scenario: "Nueva conversación" then reload starts empty (cookie was dropped client-side)

- **WHEN** the user clicks "Nueva conversación" (which drops the cookie client-side) AND the page is reloaded BEFORE any subsequent `sendMessage` re-mints the cookie
- **THEN** the widget on the new mount SHALL issue `GET /current` with no `chatbot_conversation_id` cookie and SHALL render with `messages.length === 0` — the prior thread SHALL NOT reappear

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
