## 1. Widget notices

- [x] 1.1 Add `CHATBOT_AI_DISCLAIMER` and `CHATBOT_RETENTION_NOTICE` to `apps/web/src/config/constants.ts`, documenting that the retention notice states the 30-day ceiling rather than the 7-day anonymous tier, and why understating retention is the error that matters.
- [x] 1.2 Replace the module-local `FOOT_DISCLAIMER` in `ChatbotWidget.tsx` with the imported constant, changing the wording to `"Respuestas generadas por IA. Pueden contener errores; verifica contra las fuentes citadas."`.
- [x] 1.3 Render `CHATBOT_RETENTION_NOTICE` as a second line in the same foot-of-chat container, sharing the disclaimer's typography and non-interactive nature.
- [x] 1.4 Leave the comment explaining why `deleteHistory` is unwired exactly as it is — it remains accurate under Decision 8 and is now covered by a spec requirement.
- [x] 1.5 Update the byte-for-byte disclaimer mirror in `ChatbotWidget.test.tsx` to the new literal and add a matching mirror for the retention notice.
- [x] 1.6 Extend the foot-of-chat test block to assert both notices render in all six canonical states and that neither carries an interactive affordance.
- [x] 1.7 Keep the existing assertion that no control named for deletion exists, and add a comment tying it to Decision 8 so a future reader does not mistake it for an oversight.
- [x] 1.8 Run `pnpm test:web` and confirm the suite passes with the coverage floor intact.

## 2. Emergency shutdown runbook

- [x] 2.1 Add a "Chatbot emergency shutdown" section to `docs/operations/runbook.md` with the exact `az webapp config appsettings set` invocation that sets `CHATBOT_ENABLED=false` on the production App Service.
- [x] 2.2 Document the expected effect: roughly one minute of restart, chatbot routes answering 404, and no code path reaching Azure OpenAI.
- [x] 2.3 Document the reversal, and state that `VITE_CHATBOT_ENABLED` is build-time — disabling the backend leaves the widget visible but unserviced until the frontend is rebuilt, which is acceptable in an emergency but alarming if discovered unannounced.
- [x] 2.4 Note that the kill switch is the only control that stops spend instantly, and that the quotas and alerts added by this change do not replace it.

## 3. Cost alerting in Bicep

- [x] 3.1 Create `infra/modules/chatbotAlerting.bicep` with parameters for the monthly budget amount (default 30) and the notification email address.
- [x] 3.2 Add an action group with the supplied email as receiver.
- [x] 3.3 Add a `Microsoft.Consumption/budgets` resource scoped to the resource group, with notifications at 50%, 80%, and 100%.
- [x] 3.4 Add an Azure Monitor metric alert on the Azure OpenAI account firing above 50000 processed tokens in a one-hour window; verify the metric's real name and aggregation against the deployed resource and report any mismatch rather than silently substituting.
- [x] 3.5 Wire the module into `infra/main.bicep` gated by `enableChatbot`, matching how the other chatbot resources are gated.
- [x] 3.6 Add module comments stating that neither alarm throttles anything and that the TPM capacity on the OpenAI deployments is the only enforcing ceiling.
- [x] 3.7 ~~Add a resource-id output to `infra/modules/openai.bicep`~~ — **not needed**: the module already exposes `output id string = account.id`. The earlier claim that it exposed only the endpoint and deployment names was wrong; verified at `infra/modules/openai.bicep:139` and consumed directly.
- [x] 3.8 Verify before deploying that the deployment principal can create `Microsoft.Consumption/budgets`; that resource type needs Cost Management rights a Contributor-scoped principal may lack, and the failure only appears at deploy time.
- [x] 3.9 State in the module and in the runbook that this alerting is Azure-only, so the on-premise deployment has no cost alerting at all and relies entirely on the application-level quotas from groups 4 and 6.
- [x] 3.10 Record the cost model the default came from — roughly 10 USD/month at 300 users, 27 at 500, 108 at 1000 — so the number is traceable rather than arbitrary.

## 4. Burst limit on the send route

- [x] 4.1 Add the cap, documenting that it bounds the overshoot the token budgets cannot see because they read before a turn and credit after it. **Shipped as `CHATBOT_MAX_TURNS_PER_MINUTE_DEFAULT = 15` in `config/constants.ts` plus a `CHATBOT_MAX_TURNS_PER_MINUTE` env override in `config/environment.ts`**, not a bare constant: the limiter's store is per app instance and the chatbot suites build one app per file, so a fixed 15 made `toolRound` (19 turns) start 429-ing partway through. The suite raises it in `vitest.config.ts`; the burst test builds its own app with a cap of 2.
- [x] 4.2 Add the route-level `rateLimit` config to `apps/api/src/features/chatbot/sendMessage/route.ts` alongside the existing `allowPublicAccess`.
- [x] 4.3 Document at the call site that this layer keys on IP because `@fastify/rate-limit` runs in `onRequest`, before `chatbotIdentityPreHandler` resolves the caller — an ordering constraint, not a preference.
- [x] 4.4 Add an integration test asserting that turns beyond the cap receive 429 and never reach the LLM provider.

## 5. Tiered retention

- [x] 5.1 Add `CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS = 7` beside the existing 30-day constant, documenting the relationship-based rationale and that both stay compile-time values per Decision 7.
- [x] 5.2 Branch `computeExpiresAt` in `sendMessage/service.ts` on identity kind so anonymous conversations expire in 7 days and authenticated ones in 30.
- [x] 5.3 Update the stale comment on `CHATBOT_CONVERSATION_TTL_DAYS` that still reads "pg_cron purge deferred".
- [x] 5.4 Physically deleting expired rows moved to the `chatbot-conversation-purge` change — this group now tiers the window without enforcing it at the data layer.
- [x] 5.5 Add integration tests for the tiered TTL: an anonymous conversation expires in 7 days, an authenticated one in 30.

## 6. Token quotas

- [x] 6.1 Add `CHATBOT_MAX_TOKENS_PER_IDENTITY_PER_DAY = 40_000` and `CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY = 300_000`, documenting that the recorded `tokens_used` counts only the terminal round and therefore understates real spend.
- [x] 6.2 Add the three rejection message constants in neutral Spanish, beside the existing `CHATBOT_GENERIC_ERROR_MESSAGE`.
- [x] 6.3 Implement the per-identity 24-hour token sum, joining messages to conversations on the identity columns. **No new index needed**: the aggregate filters on `created_at` plus the conversation's identity columns, both of which the foundation migration already indexes (`chatbot_chat_message_conversation_id_created_at_idx`, `chatbot_chat_conversation_user_id_expires_at_idx`, `chatbot_chat_conversation_session_id_created_at_idx`).
- [x] 6.4 Implement the global anonymous 24-hour token sum over conversations with no `user_id`.
- [x] 6.5 Enforce both in `sendMessage` after the identity preHandler and before the provider call, responding 429 with the layer's own message and persisting nothing for a refused turn.
- [x] 6.6 Ensure the refusal is an ordinary JSON 429 rather than an SSE stream carrying a terminal error, and that it is not conflated with the existing 413 for oversized input.
- [x] 6.7 Confirm the widget renders the server's 429 body rather than substituting the generic provider-failure copy, and add a web test for it. **Found a real bug**: the 429 branch assumed every 429 came from the burst limiter and told the caller to wait, which is wrong advice for a spent daily allowance. Now the reset header selects the burst copy and its absence reads the server's message.
- [x] 6.8 Add integration tests: identity over budget is refused; anonymous caller refused when the pool is exhausted; authenticated caller unaffected by an exhausted pool; refused turns leave no message rows.

## 7. Documentation sync and verification

- [ ] 7.1 Update the chatbot retention section of `docs/security/sensitive-data.md` to describe tiered retention, leaving its statement that expired rows still accumulate intact — that remains true until `chatbot-conversation-purge` lands.
- [ ] 7.2 Leave the "Chatbot Conversation Purge" section of `docs/operations/runbook.md` alone — the manual sweep it documents is still the only thing that deletes.
- [ ] 7.3 Record in the runbook that the anonymous token pool can be exhausted by one actor and how an operator recognizes that state, so it is not diagnosed as an outage.
- [ ] 7.4 Run `pnpm format && pnpm lint && pnpm type-check` and the API and web suites; confirm all pass.
- [ ] 7.5 Re-read the specs against the implementation and reconcile any drift in the specs rather than in silence.
