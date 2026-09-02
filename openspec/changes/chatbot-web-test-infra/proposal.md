## Why

Four web tests in `chatbot-rag-mvp/tasks.md` block 10 (10.22, 10.23, 10.28, 10.34) cover render and UX behavior of the chatbot widget: the citations panel rendering on `sourcesCited` non-empty/empty, the "Nueva conversación" reset behavior, and the foot-of-chat disclaimer presence across canonical states.

They were deferred out of `chatbot-rag-mvp` because `apps/web` had no unit-test toolchain at the time, and standing one up was a scope of its own.

**That reason no longer applies.** The web test infrastructure landed on `main` independently:

- `apps/web/vitest.config.ts` (jsdom environment, `VITE_*` env, coverage floor enforced in CI) and `apps/web/vitest.setup.ts` (`@testing-library/jest-dom` matchers, in-memory `localStorage` shim) — #496
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitest/coverage-v8` as `apps/web` dev dependencies
- `pnpm test:web` and a dedicated `test-web` CI job
- The co-located `*.test.ts(x)` convention, with the Chatbot module among the first covered — #513

So this change no longer builds infrastructure. It is now only the four deferred widget tests, written against the toolchain that already exists.

This matters because the four behaviors they cover are exactly the ones `chatbot-rag-mvp` adds to the widget and does not otherwise test: `ChatbotWidget` has no test file at all, and `MessageBubble.test.tsx` predates the citations panel.

## What Changes

- Implement the four deferred chatbot widget tests, co-located with the components under `apps/web/src/components/Chatbot/`:
  - **10.22** — `MessageBubble` renders the "Fuentes consultadas (N)" panel when `sourcesCited` is non-empty; each source is an anchor carrying `target="_blank"` and `rel="noopener noreferrer"`.
  - **10.23** — `MessageBubble` does NOT render the panel when `sourcesCited` is absent or empty (two sub-cases).
  - **10.28** — "Nueva conversación" resets the thread client-side: the rendered message list empties, no HTTP request is fired, and the control's accessible name is `"Nueva conversación"`.
  - **10.34** — the foot-of-chat disclaimer literal `"Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas."` is present in every canonical widget state (`empty`, `loading`, `streaming`, `error`, `truncated`, `degraded`), with no `onClick` and no dismiss control.
- Mark 10.22, 10.23, 10.28 and 10.34 complete in `chatbot-rag-mvp/tasks.md`.

Explicitly **not** part of this change any more, because `main` already provides it: web test dependencies, `vitest.config.ts`, the jsdom environment, setup helpers, the `pnpm test:web` script, and the CI wiring.

## Capabilities

### Modified Capabilities

- `chatbot-widget`: no contract change. This change adds automated test coverage for behaviors already specified by `chatbot-rag-mvp` — the citations panel render, the "Nueva conversación" reset, and the persistent disclaimer. The widget's behavior contracts stay as written in `chatbot-rag-mvp/specs/chatbot-widget/spec.md`; this change exercises them at the component-render level.

## Impact

- **Frontend**: two test files under `apps/web/src/components/Chatbot/` — additions to the existing `MessageBubble.test.tsx`, and a new `ChatbotWidget.test.tsx` (the widget's first test file). Plus coverage for `startNewConversation` in the existing `useChatStream.test.ts`, which is where the reset's state effects belong.
- **CI**: none. The existing `test-web` job picks these up; they raise measured coverage against the current floor rather than changing the gate.
- **Dependencies**: none.
- **Risk**: low. The toolchain friction this change originally existed to absorb — jsdom gaps, MUI under jsdom, provider wrapping — was resolved when the infrastructure landed. `ChatbotIcon.test.tsx` and `MessageBubble.test.tsx` both render without a `ThemeProvider` (MUI falls back to the default theme), so no wrapper helper is needed for assertions about behavior and labels.

  The one real consideration is that `ChatbotWidget` composes `useChatStream` and `useConversationRehydrate`, so a widget test must decide what to drive and what to stub. Stubbing the mount-time rehydrate fetch keeps "fires no HTTP request" a meaningful assertion rather than a tautology.

## Deferred Debt

Out of scope for this change:

- The "Eliminar mi historial" affordance and its test. `chatbot-rag-mvp` deliberately leaves history deletion out of the widget: "Nueva conversación" is a non-destructive client-side reset, and `deleteHistory` stays available on the hook for data-deletion requests without a UI entry point. The user-facing affordance and its test ship together in a later change. Right-to-be-forgotten regression is covered at the API layer by foundation's `chatbot-conversation-deletion` integration tests for `DELETE /api/chatbot/conversations/me`.
- Web E2E tests (Playwright / Cypress) — these four are component-render tests exercising the widget in jsdom isolation.
- Visual regression / screenshot diffing — the widget's styling is still minimum-viable, so visual diffs would flake on intentional cosmetic edits. Defer until it gets a design pass.
- Cross-browser testing of the widget — defer to E2E framework selection.
