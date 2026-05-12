## ADDED Requirements

### Requirement: Chatbot widget render and UX behavior is covered by automated component tests

The widget render contracts and UX affordances defined in the `chatbot-widget` capability SHALL be exercised by automated component tests using Vitest + React Testing Library + jsdom under `apps/web/test/features/chatbot/`. Five tests are required, one-for-one with `chatbot-rag-mvp/tasks.md` tasks 10.22, 10.23, 10.28, 10.34, and 10.38:

1. **Citations panel renders when `sourcesCited` is non-empty** — `<MessageBubble>` with an assistant message carrying `sourcesCited.length === 2` SHALL produce a `Collapse`-driven panel headed `"Fuentes consultadas (2)"` and each row SHALL be an anchor with `target="_blank"` and `rel="noopener noreferrer"`.
2. **Citations panel hidden when `sourcesCited` absent or empty** — `<MessageBubble>` SHALL NOT render the panel when `sourcesCited` is `undefined` AND SHALL NOT render the panel when `sourcesCited` is the empty array `[]`.
3. **Trash-icon click clears local state only** — clicking the trash icon SHALL empty the rendered message list, fire zero HTTP requests (verified via `fetch` / `apiClient` spy), generate a fresh `conversation_id` distinct from the prior one, and the icon's `aria-label` SHALL be `"Limpiar conversación"` (not `"Eliminar..."`). Foundation regression guard for `chatbot-rag-mvp` Task 9.5.
4. **Foot-of-chat disclaimer present in every state** — the literal `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` SHALL be rendered byte-for-byte in every canonical widget state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`); the element SHALL have no `onClick`, no `role="button"`, and no visible dismiss control. Foundation regression guard for `chatbot-rag-mvp` Task 9.6.
5. **"Eliminar mi historial" link triggers D11 confirmation + DELETE flow** — five sub-cases covering: link visibility, modal copy (title / body / confirm / cancel labels byte-for-byte), Cancel closes-no-HTTP, Confirm with HTTP 204 fires one `DELETE /api/chatbot/conversations/me` and clears state + rotates `conversation_id` + surfaces confirmation toast, Confirm with HTTP 5xx surfaces error literal + preserves state + does NOT rotate `conversation_id`. Compliance regression guard for D11.

The widget's behavior contract itself is unchanged from `chatbot-rag-mvp/specs/chatbot-widget/spec.md` — this requirement adds the automated verification layer that was deferred from `chatbot-rag-mvp` because the web workspace had no Vitest infrastructure at the time of that change's merge.

#### Scenario: Tests run as part of the CI test matrix

- **WHEN** a CI build runs `pnpm test:web`
- **THEN** all five chatbot widget component tests SHALL execute and SHALL pass before merge to `main`

#### Scenario: Test files mirror the apps/api test layout convention

- **WHEN** a developer inspects the web test directory
- **THEN** the structure SHALL be `apps/web/test/features/chatbot/<scenario>/*.test.tsx`, mirroring the `apps/api/test/features/<feature>/<action>/` convention established by foundation

#### Scenario: Test assertions match the chatbot-rag-mvp task specifications byte-for-byte

- **WHEN** any of the five tests is inspected against `chatbot-rag-mvp/tasks.md` tasks 10.22, 10.23, 10.28, 10.34, 10.38
- **THEN** every assertion in the test SHALL trace to a corresponding clause in the task specification; literals (`"Fuentes consultadas (N)"`, the disclaimer string, the modal copy, the aria-label) SHALL be asserted byte-for-byte
