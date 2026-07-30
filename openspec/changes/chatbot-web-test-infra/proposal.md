## Why

Four web tests in `chatbot-rag-mvp/tasks.md` block 10 (10.22, 10.23, 10.28, 10.34) cover render and UX behavior of the chatbot widget: the citations panel rendering on `sourcesCited` non-empty/empty, the "Nueva conversación" clear-state behavior, and the foot-of-chat disclaimer presence across canonical states. All four require a Vitest + React Testing Library + jsdom test infrastructure in `apps/web/` that does not exist today — the web workspace currently has no unit/integration test setup.

Setting up that infrastructure (vitest.config, jsdom environment, RTL configuration, MUI theme provider wrapping helper, MSAL auth bypass for component tests, route-tree mocking, the `apiClient`/`fetch` spy harness) is a scope of its own. Bundling it inside `chatbot-rag-mvp` would balloon that change beyond its core RAG-MVP focus and would conflate "the RAG slice is complete" with "the web test toolchain is configured." Splitting the deferred web tests into this follow-up change keeps `chatbot-rag-mvp` focused on the backend RAG plumbing and unblocks `chatbot-rag-mvp` for merge while web test infrastructure lands on its own track.

The deferral was decided during the `chatbot-rag-mvp` test audit (C.6 of the audit plan). All four tests have their assertions fully specified in `chatbot-rag-mvp/tasks.md` — this change picks them up byte-for-byte, no spec re-derivation needed.

**Note on scope shrinkage from five tests to four**: an earlier draft of this change included a fifth test (10.38) for the "Eliminar mi historial" link + confirmation modal + DELETE flow. That affordance was deferred from `chatbot-rag-mvp` to a future change (`chatbot-educate-mode-full` or similar) per PM V1 scope decision, so the test that would have exercised it is deferred alongside it — not picked up here. Compliance regression for D11 in V1 is covered at the API-side integration test layer for the `DELETE /api/chatbot/conversations/me` endpoint, which already exists from foundation's `chatbot-conversation-deletion` capability.

## What Changes

- Add Vitest + React Testing Library + jsdom dev dependencies to `apps/web/package.json` (Vitest already present in the workspace via `@vitest/coverage-v8`, but the web app does not currently consume it).
- Add `apps/web/vitest.config.ts` configured with the jsdom environment, MUI theme provider, MSAL bypass, and TanStack Router test helpers.
- Add an `apps/web/test/` directory structure mirroring the `apps/api/test/features/<feature>/` convention.
- Add helper utilities (theme wrapper, mocked auth/router providers, `fetch` spy harness) under `apps/web/test/setup/`.
- Implement the four deferred chatbot widget tests, one-for-one with the spec in `chatbot-rag-mvp/tasks.md`:
  - **10.22** — `MessageBubble` renders the "Fuentes consultadas (N)" panel when `sourcesCited` is non-empty; anchors carry `target="_blank"` + `rel="noopener noreferrer"`.
  - **10.23** — `MessageBubble` does NOT render the panel when `sourcesCited` is absent or empty (two sub-cases).
  - **10.28** — "Nueva conversación" click clears local state only: empties message list, fires zero HTTP requests, generates a fresh `conversation_id`, aria-label is `"Nueva conversación"`. Foundation regression guard for `chatbot-rag-mvp` Task 9.5.
  - **10.34** — foot-of-chat disclaimer literal `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` is present in every canonical widget state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`) and has no `onClick` or dismiss control. Foundation regression guard for `chatbot-rag-mvp` Task 9.6.
- Mark the four tasks in `chatbot-rag-mvp/tasks.md` as completed under this change's archive entry (cross-reference link, not a direct edit of the parent change).
- Add a `pnpm test:web` script alias and wire it into the CI pipeline's existing test matrix.

## Capabilities

### Modified Capabilities

- `chatbot-widget`: no contract change. This change adds automated test coverage for behaviors already specified by `chatbot-rag-mvp` — the citations panel render, the "Nueva conversación" clear-state behavior, and the persistent disclaimer. The widget's behavior contracts stay as written in `chatbot-rag-mvp/specs/chatbot-widget/spec.md`; this change exercises them at the component-render level. The D11 right-to-be-forgotten user-facing affordance was deferred from `chatbot-rag-mvp` per PM V1 scope decision, so its corresponding test (originally 10.38) is deferred alongside it and is NOT part of this change.

## Impact

- **Frontend**: `apps/web/package.json` (new dev deps), `apps/web/vitest.config.ts` (new), `apps/web/test/` directory (new), `apps/web/test/setup/` helpers (new), four new test files under `apps/web/test/features/chatbot/`.
- **CI**: `pnpm test:web` added to the test matrix. Coverage threshold initially set permissively (0%) and tightened in a follow-up once the suite stabilizes.
- **Dependencies**: `vitest`, `@vitest/coverage-v8` (already in root), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. No production deps.
- **Risk**: setting up jsdom + MUI + MSAL bypass + TanStack Router test helpers has known integration friction (jsdom missing browser APIs, MSAL requiring a mocked PublicClientApplication, router context needing `RouterProvider` wrapping). The four widget tests are the first consumers; expect 2-3 days of toolchain plumbing before the tests themselves can be written.
- **Test infrastructure friction discoveries from `chatbot-rag-mvp` audit (carry over)**: the subprocess+spy boundary (CLI tests can't be spied), Prisma 7 Proxy + `vi.spyOn` incompatibility, and Vitest 4 strict `[[Construct]]` enforcement are documented in commits `700d609a`, `bb68bb7b`, and `cdbb5928` respectively. Equivalent friction may surface in the web setup — for jsdom in particular, MUI v7's CSS variables and Tailwind utility classes have a history of unexpected behavior under jsdom.

## Deferred Debt

Out of scope for this change:

- Web E2E tests (Playwright / Cypress) — the four tests here are component-render tests that exercise the widget in jsdom isolation. A real E2E run against the deployed widget is `chatbot-educate-mode-full` territory.
- Visual regression tests / screenshot diffing — `chatbot-widget`'s "minimum-viable styling" status (`chatbot-rag-mvp` design.md Decision 17 area) means visual diffs would flake on intentional cosmetic edits. Defer until the widget gets a real design pass.
- Cross-browser testing of the widget — defer to E2E framework selection.
- Test for the streaming SSE consumer (`useChatStream`) — covered indirectly by 10.22/10.23 (which exercise rendered output for assistant messages). A focused unit test of the SSE frame parser belongs in a separate change if useChatStream gains complexity.
