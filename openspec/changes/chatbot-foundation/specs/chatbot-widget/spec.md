## ADDED Requirements

> The widget consumes the SSE contract defined in `chatbot-message-streaming` and the deletion endpoint defined in `chatbot-conversation-deletion`. Server-side identity, cookie semantics, and conversation lifecycle live in `chatbot-conversation-persistence` — the widget interacts with cookies only as a passive HTTP client (browser handles `Set-Cookie` automatically). This spec covers the React component, the streaming hook, the canonical UI states, the reconnection model, and where the widget mounts.

### Requirement: Widget is mounted at the web app's root layout

The system SHALL render `<ChatbotWidget />` inside the root layout at `apps/web/src/routes/__root.tsx`, so the widget is reachable from both the public landing route (`/`) and authenticated routes (`/app/**`, `/admin/**`). The component SHALL live under `apps/web/src/components/Chatbot/ChatbotWidget.tsx`. This is a minimum-viable placement; the final placement is subject to a separate design review and MAY change in a future change.

#### Scenario: Widget reachable on the public landing route

- **WHEN** an unauthenticated visitor navigates to `/`
- **THEN** the `<ChatbotWidget />` component SHALL be present in the rendered DOM

#### Scenario: Widget reachable on an authenticated app route

- **WHEN** an authenticated user navigates to a route under `/app/**`
- **THEN** the `<ChatbotWidget />` component SHALL be present in the rendered DOM

### Requirement: Widget streams assistant responses via raw `fetch` plus `ReadableStream`

The widget SHALL consume `POST /api/chatbot/message` using the browser's native `fetch` API, reading the response body as a `ReadableStream` and parsing SSE events (`data:` lines, `event:` lines, blank-line terminators) inline. It SHALL NOT route this request through the shared `apiClient` (`apps/web/src/api/http/client.ts` based on `ky`), because `ky` does not surface the response body as a `ReadableStream`. The widget SHALL include `credentials: "include"` on the fetch so the browser sends and accepts the `chatbot_session_id` cookie.

#### Scenario: Streaming request bypasses the shared ky client

- **WHEN** the widget initiates a chat turn
- **THEN** the request SHALL be issued via `fetch(...)` directly, with `credentials: "include"`, and SHALL NOT go through `apiClient`

#### Scenario: Tokens render incrementally as they arrive

- **WHEN** the SSE response yields multiple `data:` events for one assistant turn
- **THEN** the widget SHALL append each chunk to the visible assistant message before the next chunk arrives, so the user observes incremental text rendering

### Requirement: Widget exposes the canonical UI states

The widget SHALL render exactly one of the following six canonical states at any time:

- **empty** — no conversation visible
- **loading** — request initiated but no chunk yet received
- **streaming** — at least one chunk received, stream not yet terminated
- **error** — a failed turn: a transport failure, a non-OK HTTP response (4xx/5xx), or a terminal SSE `error` event; the input stays enabled so the user can resend
- **truncated** — stream was interrupted mid-turn; the partial content is visible and labeled as incomplete
- **degraded** — two consecutive failed turns (transport-level or HTTP 5xx); the widget shows an escalated "assistant unavailable, try again later" message but keeps the input enabled for a manual retry (no polling, no automatic retries)

The widget's root element SHALL carry `data-testid="chatbot-widget"` plus a `data-state="<state>"` attribute whose value is one of the six canonical state names above. Tests SHALL reach the widget via the `data-testid` selector and assert the entered state via `data-state`.

Final visual treatment, copy, and animation are NOT defined here — that is the design review's scope. This requirement covers presence, naming, and observability only.

#### Scenario: Each state is reachable

- **WHEN** the widget transitions through a normal turn (idle → request → first chunk → completion → idle)
- **THEN** the widget SHALL pass through `empty`, `loading`, `streaming`, and back to a state where the prior turn is visible, in that order, and each state SHALL be observable on the root element via `data-state` reachable through `data-testid="chatbot-widget"`

#### Scenario: Truncated state surfaces partial content

- **WHEN** the SSE stream is interrupted after at least one chunk has been received
- **THEN** the widget SHALL display the partial assistant content, mark the message as truncated in the UI, and the root element's `data-state` SHALL equal `truncated`

#### Scenario: Error and degraded states observable via the same handle

- **WHEN** the widget enters the `error` or `degraded` state
- **THEN** the root element's `data-state` attribute SHALL reflect the entered state and SHALL be reachable through the same `data-testid="chatbot-widget"` selector as the other canonical states

### Requirement: Widget surfaces server-side error responses with state-appropriate messaging

When `POST /api/chatbot/message` responds with a non-streaming HTTP error (4xx or 5xx, where the response head is an error status rather than a `text/event-stream` 200), the widget SHALL transition to the `error` state and display a user-facing Spanish message whose tone matches the underlying cause. The widget SHALL distinguish at least the two error codes explicitly defined in `chatbot-message-streaming`: `REQUEST_TOO_LARGE` (413) and `EXTERNAL_SERVICE_ERROR` (503). Any other 4xx or 5xx SHALL surface a generic error message.

#### Scenario: HTTP 413 surfaces an input-too-large message

- **WHEN** the API responds with HTTP 413 and body `{ code: "REQUEST_TOO_LARGE", ... }`
- **THEN** the widget SHALL transition to the `error` state and display a user-facing Spanish message indicating that the input was too large (e.g., "Tu mensaje es demasiado largo")

#### Scenario: HTTP 503 surfaces the message returned by the API

- **WHEN** the API responds with HTTP 503 and body `{ code: "EXTERNAL_SERVICE_ERROR", message: <string> }`
- **THEN** the widget SHALL transition to the `error` state and display the `message` field from the response body as the user-facing text, rather than hardcoding a parallel string. The API populates `message` from the `CHATBOT_GENERIC_ERROR_MESSAGE` constant defined in `chatbot-message-streaming`, so the user-facing copy stays in sync with the server-side source of truth without the widget needing to know the literal Spanish phrase

#### Scenario: Other 4xx/5xx surface a generic error message

- **WHEN** the API responds with any 4xx or 5xx status not specifically handled above (e.g., 400 from a malformed body, an unexpected 500)
- **THEN** the widget SHALL transition to the `error` state and display a generic Spanish error message

### Requirement: Failure handling — no auto-retry; consecutive failures escalate `error` → `degraded`

`POST /api/chatbot/message` is non-idempotent (it appends a turn and triggers an LLM run), so the widget SHALL NOT auto-retry a turn — a `fetch` rejection does not prove the request never reached the server, and a retry could double-submit. Each turn is a single attempt, guarded by a per-turn `AbortController` (an idle timeout, an overall wall-clock timeout, a user-facing **Stop** control, and abort-on-unmount).

Failures escalate via a consecutive-failure counter:

- A single failed turn — a transport-level failure, a non-OK HTTP response, or a terminal SSE `error` event — SHALL transition the widget to `error`. `error` is recoverable: the input stays enabled so the user can resend.
- Two **consecutive** failures that are transport-level **or** HTTP `5xx` SHALL transition the widget to `degraded` — an honest "assistant unavailable, try again later" escalation. `degraded` also keeps the input enabled (retry in place, non-destructive), and the widget SHALL NOT poll or issue any automatic/background request.
- A `4xx` response (e.g. `413`) is a per-turn `error` and SHALL reset the counter (the backend answered, so it is reachable).
- A successful turn SHALL reset the counter.

A user cancel (Stop), unmount, or a client timeout that aborts a turn before any response is a deliberate cancel, not a failure, and SHALL NOT increment the counter. **Mid-turn disconnects** (transport drops after the stream began) SHALL transition the widget to `truncated` with no replay — never a retry.

#### Scenario: A single failed turn is recoverable `error`

- **WHEN** a turn fails once (transport failure, non-OK response, or terminal SSE `error` event)
- **THEN** the widget SHALL transition to `error`, keep the input enabled, and SHALL NOT auto-retry

#### Scenario: Two consecutive transport/5xx failures enter `degraded`

- **WHEN** two consecutive turns fail at the transport level or with HTTP `5xx`
- **THEN** the widget SHALL transition to `degraded`, show the escalated message, keep the input enabled, and issue no automatic or background requests

#### Scenario: A 4xx failure does not escalate

- **WHEN** a turn fails with a `4xx` response (e.g. `413`)
- **THEN** the widget SHALL transition to `error` and reset the consecutive-failure counter, so it does not count toward `degraded`

#### Scenario: Mid-turn disconnect truncates, never retries

- **WHEN** the SSE stream is interrupted after the response head was received and at least one chunk had a chance to be processed
- **THEN** the widget SHALL transition to `truncated` and SHALL NOT issue an automatic retry, regardless of how many bytes had been received

#### Scenario: Stop / unmount / timeout is a cancel, not a failure

- **WHEN** the user presses Stop, the widget unmounts, or a client timeout aborts the in-flight turn
- **THEN** the request SHALL be aborted and the cancel SHALL NOT increment the consecutive-failure counter

### Requirement: Widget sends `Last-Event-ID` when available but expects no replay

The widget tracks the `id:` of the last SSE event observed during a turn and SHALL include it as a `Last-Event-ID` HTTP header on a request when one is available (omitting the header otherwise). The widget SHALL NOT assume the server replays prior events — `chatbot-message-streaming` defines that the server treats every request as fresh. This is forward-compatible plumbing for V1+ if a server-side replay buffer is later added.

In foundation this header is effectively never sent: the tracked ID is reset at the start of each turn and only populated while a stream is being consumed, and there is no retry within a turn — so a fresh turn's single request carries no prior ID. The requirement preserves the contract for V1+; its practical exercise in foundation is near-zero.

#### Scenario: Last-Event-ID included when a prior event ID is available

- **WHEN** the widget issues a request and a prior SSE event with an `id:` field is available in scope
- **THEN** the request SHALL include a `Last-Event-ID` header carrying that ID; otherwise the header SHALL be omitted

#### Scenario: Widget does not assume replay

- **WHEN** the widget reconnects with `Last-Event-ID`
- **THEN** the widget SHALL render whatever the server sends as a fresh response, and SHALL NOT skip or deduplicate against any tokens received in the prior failed attempt

### Requirement: Widget invokes `DELETE /api/chatbot/conversations/me` on user request

The widget SHALL expose a user-visible affordance (button or menu item) to delete the current chat history. Activating it SHALL call `DELETE /api/chatbot/conversations/me` with `credentials: "include"`. On a 204 response, the widget SHALL clear its in-memory conversation state and return to the `empty` state. The widget SHALL accept that the browser MAY remove the `chatbot_session_id` cookie as a result of the response's `Set-Cookie` header and SHALL NOT depend on its persistence.

#### Scenario: Successful deletion clears widget state

- **WHEN** the user activates the deletion affordance and the API returns HTTP 204
- **THEN** the widget SHALL clear its conversation state from memory and SHALL transition to the `empty` state

#### Scenario: Deletion failure surfaces an error

- **WHEN** the deletion request fails (HTTP 5xx or network error)
- **THEN** the widget SHALL preserve its current conversation state, display an error to the user, and remain in its current state

### Requirement: Widget renders assistant messages as Markdown

The widget SHALL render assistant message content as Markdown, reusing the existing `react-markdown` setup already configured in the web app (`remark-math`, `remark-gfm`, `rehype-katex`). User messages SHALL be rendered as plain text with no Markdown processing.

#### Scenario: Assistant message renders Markdown features

- **WHEN** the assistant message content includes Markdown features supported by the existing `ExplanationContent` component (bold, lists, code blocks, math via KaTeX, GFM tables)
- **THEN** the widget SHALL render those features visually, equivalent to the existing `ExplanationContent` rendering

#### Scenario: User message rendered as plain text

- **WHEN** a user message contains characters that look like Markdown syntax (e.g., `**`, `#`)
- **THEN** the widget SHALL render those characters literally, not as formatting

### Requirement: Widget UI strings are in Spanish

All user-facing strings rendered by the widget — placeholders, button labels, error messages, state copy — SHALL be in Spanish, consistent with the rest of the web app (which has no i18n library installed and ships hardcoded Spanish, matching the Spanish-with-i18n-ready-architecture decision; see `design.md` §Background Context, D9). Strings MAY live inline in the component for foundation; centralization for future i18n is out of scope.

#### Scenario: All visible strings are Spanish

- **WHEN** the widget is rendered in any of its canonical states
- **THEN** every user-visible string SHALL be in Spanish

### Requirement: Widget visual review and disclaimer are explicitly out of scope

The widget shipped by this change SHALL NOT include a first-open disclaimer, polished visual design, mobile-responsive layout, ARIA streaming announcements, or any discoverability mechanism beyond default global mounting. These are explicitly listed in the change's `proposal.md` under "Deferred Debt" and are deferred to a separate design review before V1 polish. The minimum-viable widget shipped here SHALL be sufficient for the foundation acceptance criterion (a developer can open it locally, send a message, and observe a streamed mock response persisted to the database).

#### Scenario: Foundation widget has no first-open disclaimer

- **WHEN** the widget is opened for the first time in a fresh browser
- **THEN** no disclaimer modal, banner, or text overlay SHALL appear

#### Scenario: Foundation acceptance criterion is met

- **WHEN** a developer runs `pnpm dev` locally with `LLM_PROVIDER=mock`, opens the widget, and sends a message
- **THEN** the widget SHALL render the mock response incrementally, and a corresponding pair of `chatbot_chat_message` rows (USER + ASSISTANT) SHALL be persisted under a `chatbot_chat_conversation` row scoped to the caller identity
