## MODIFIED Requirements

### Requirement: Widget renders a persistent foot-of-chat disclaimer

The widget SHALL render a visually subtle disclaimer pinned beneath the input area, visible whenever the chat panel is open (not gated to first-open). The text SHALL be exactly `"Respuestas generadas por IA. Pueden contener errores; verifica contra las fuentes citadas."` (Spanish, byte-for-byte; the wording is load-bearing because tests assert it). The literal SHALL be a named constant in `apps/web/src/config/constants.ts` rather than inline in the component, matching how every other per-deployment string is held. The disclaimer SHALL render in a smaller font size and lower-emphasis color (e.g., `theme.palette.text.secondary`) so it is informational, not visually competing with the input. It SHALL be a static element — no interaction, no dismissal, no animation.

This is a thin, persistent reminder that the chatbot is AI-generated and that citations are the verifiable source of truth. It is NOT a first-open modal (those remain deferred). It is NOT positioned to imply any single message is unreliable; it scopes the warning to the entire chat surface.

#### Scenario: Disclaimer present when widget is open

- **WHEN** the chatbot widget is open in any of its canonical states (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`)
- **THEN** the rendered DOM SHALL contain an element with the exact text `"Respuestas generadas por IA. Pueden contener errores; verifica contra las fuentes citadas."` positioned beneath the input area

#### Scenario: Disclaimer is non-interactive

- **WHEN** the disclaimer element is inspected
- **THEN** it SHALL NOT carry any `onClick` handler, `role="button"` attribute, or visible dismiss control; it SHALL be a static text node only

#### Scenario: Disclaimer wording is the canonical literal

- **WHEN** any test or component snapshot inspects the disclaimer text
- **THEN** it SHALL match the literal `"Respuestas generadas por IA. Pueden contener errores; verifica contra las fuentes citadas."` exactly — no truncation, no paraphrase, no emoji

## ADDED Requirements

### Requirement: Widget renders a persistent privacy notice beside the disclaimer

The widget SHALL render a second notice in the same foot-of-chat area, with the exact text `"Guardamos tus conversaciones para responder y retomarlas. No compartas datos personales."` held as a named constant in `apps/web/src/config/constants.ts`. It SHALL share the disclaimer's typography and non-interactive, undismissable nature, and SHALL be visible in every widget state.

The notice SHALL NOT state a retention window while nothing deletes expired conversations. `expires_at` is written at row creation and every read filters on it, so an expired conversation stops being reachable, but the row survives in the database and in any dump of it. A sentence such as "las conversaciones se guardan hasta 30 días" therefore reads as a deletion promise the system does not keep — and of the two possible errors, the one that errs against the reader is the one worth avoiding. Physical deletion is the `chatbot-conversation-purge` change; a duration may be restored to this line once that change has landed, and not before.

What remains is the load-bearing half regardless. A retention figure is a disclosure; "no compartas datos personales" is the control, because the cheapest personal data to delete is the kind that was never typed.

#### Scenario: Privacy notice present in every widget state

- **WHEN** the chatbot widget is open in any of its canonical states
- **THEN** the rendered DOM SHALL contain an element with the exact text `"Guardamos tus conversaciones para responder y retomarlas. No compartas datos personales."`

#### Scenario: Notice claims no retention window

- **WHEN** the foot-of-chat area is inspected
- **THEN** it SHALL contain no retention duration in any form, so that no deletion is promised while none occurs

#### Scenario: Privacy notice is non-interactive

- **WHEN** the privacy notice is inspected
- **THEN** it SHALL NOT carry any `onClick` handler, `role="button"` attribute, or visible dismiss control

#### Scenario: Notice does not depend on session state

- **WHEN** the widget renders for an anonymous caller and for an authenticated one
- **THEN** both SHALL see the same text, and the widget SHALL NOT await or read authentication state in order to render it

### Requirement: Widget continues to expose no delete-history affordance

The widget SHALL NOT expose a user-facing control for deleting persisted conversation history. `DELETE /api/chatbot/conversations/me` SHALL remain unwired from the UI, and the comment in `ChatbotWidget.tsx` explaining why SHALL remain accurate and SHALL NOT be removed.

This restates rather than changes the position taken in `chatbot-rag-mvp` design decision 25, and is recorded here because this change examined that decision and upheld it. The argument that had been raised against it — that support cannot honour an erasure request from an anonymous caller, because the delete endpoint acts on the identity of whoever calls it and an anonymous identity lives only in that person's browser — is real, and is narrowed — not closed — by shortening anonymous retention to 7 days, rather than by adding a control the product has deliberately deferred to a later version. The narrowing is partial while nothing deletes expired rows: a shorter window shortens how long a conversation is visible, not how long it is stored.

#### Scenario: No delete control is rendered

- **WHEN** the chatbot widget header is inspected in any state
- **THEN** it SHALL contain controls for stopping a turn, starting a new conversation, and minimizing, and SHALL NOT contain a control whose accessible name denotes deletion

#### Scenario: The non-wiring is explained in place

- **WHEN** `ChatbotWidget.tsx` is read
- **THEN** it SHALL carry a comment stating that `deleteHistory` is intentionally unwired and why
