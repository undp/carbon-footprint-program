## ADDED Requirements

### Requirement: Chatbot widget render and UX behavior is covered by automated component tests

The widget render contracts and UX affordances defined in the `chatbot-widget` capability SHALL be exercised by automated component tests using Vitest + React Testing Library + jsdom, co-located with the components under `apps/web/src/components/Chatbot/`. Four tests are required, one-for-one with `chatbot-rag-mvp/tasks.md` tasks 10.22, 10.23, 10.28, and 10.34:

1. **Citations panel renders when `sourcesCited` is non-empty** — `<MessageBubble>` with an assistant message carrying `sourcesCited.length === 2` SHALL produce a `Collapse`-driven panel headed `"Fuentes consultadas (2)"` and each row SHALL be an anchor with `target="_blank"` and `rel="noopener noreferrer"`.
2. **Citations panel hidden when `sourcesCited` absent or empty** — `<MessageBubble>` SHALL NOT render the panel when `sourcesCited` is `undefined` AND SHALL NOT render the panel when `sourcesCited` is the empty array `[]`.
3. **"Nueva conversación" resets the thread client-side** — clicking the widget's "Nueva conversación" control (`AddIcon` in the widget header) SHALL empty the rendered message list, SHALL fire zero HTTP requests (verified via a `fetch` spy), and the control's accessible name SHALL be `"Nueva conversación"` (not `"Limpiar conversación"` or `"Eliminar…"`).

   The reset is deliberately non-destructive: prior turns remain persisted server-side and no `DELETE` is issued. The client does **not** mint a conversation id — the server owns it and pins it with the signed `chatbot_conversation_id` cookie, which the reset drops so a later reload does not rehydrate the abandoned thread. Reset behavior therefore splits across two layers, and both SHALL be covered: the widget test asserts the control's wiring and that no request is made, while `useChatStream`'s own test asserts the state effects (messages emptied, state returned to `empty`, per-turn refs cleared).

   Foundation regression guard for `chatbot-rag-mvp` Task 9.5.

4. **Foot-of-chat disclaimer present in every state** — the literal `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` SHALL be rendered byte-for-byte in every canonical widget state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`); the element SHALL have no `onClick`, no `role="button"`, and no visible dismiss control. Foundation regression guard for `chatbot-rag-mvp` Task 9.6.

The fifth test originally planned for this change — the "Eliminar mi historial" confirmation + `DELETE` flow — is intentionally OUT of scope, because `chatbot-rag-mvp` leaves history deletion out of the widget entirely. `deleteHistory` remains available on `useChatStream` for data-deletion requests but has no UI entry point, so there is no affordance to exercise. The test ships with the affordance in a later change. Right-to-be-forgotten regression is covered at the API layer by foundation's `chatbot-conversation-deletion` integration tests for `DELETE /api/chatbot/conversations/me`.

The widget's behavior contract itself is unchanged from `chatbot-rag-mvp/specs/chatbot-widget/spec.md` — this requirement adds the automated verification layer that was deferred from `chatbot-rag-mvp` because the web workspace had no Vitest infrastructure at the time of that change's merge. That infrastructure now exists on `main`, so this requirement covers the tests only.

#### Scenario: Tests run as part of the CI test matrix

- **WHEN** a CI build runs `pnpm test:web`
- **THEN** all four chatbot widget component tests SHALL execute and SHALL pass before merge to `main`

#### Scenario: Test files follow the web co-location convention

- **WHEN** a developer inspects the chatbot widget tests
- **THEN** they SHALL sit beside the component they exercise as `apps/web/src/components/Chatbot/<Component>.test.tsx`, following the convention established for `apps/web` — NOT the mirrored `apps/api/test/features/<feature>/<action>/` layout, which applies to the API workspace only

#### Scenario: Test assertions match the chatbot-rag-mvp task specifications byte-for-byte

- **WHEN** any of the four tests is inspected against `chatbot-rag-mvp/tasks.md` tasks 10.22, 10.23, 10.28, 10.34
- **THEN** every assertion in the test SHALL trace to a corresponding clause in the task specification; literals (`"Fuentes consultadas (N)"`, the disclaimer string, the accessible name) SHALL be asserted byte-for-byte
