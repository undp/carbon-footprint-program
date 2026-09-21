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

- [ ] 2.1 Add a "Chatbot emergency shutdown" section to `docs/operations/runbook.md` with the exact `az webapp config appsettings set` invocation that sets `CHATBOT_ENABLED=false` on the production App Service.
- [ ] 2.2 Document the expected effect: roughly one minute of restart, chatbot routes answering 404, and no code path reaching Azure OpenAI.
- [ ] 2.3 Document the reversal, and state that `VITE_CHATBOT_ENABLED` is build-time — disabling the backend leaves the widget visible but unserviced until the frontend is rebuilt, which is acceptable in an emergency but alarming if discovered unannounced.
- [ ] 2.4 Note that the kill switch is the only control that stops spend instantly, and that the quotas and alerts added by this change do not replace it.

## 3. Cost alerting in Bicep

- [ ] 3.1 Create `infra/modules/chatbotAlerting.bicep` with parameters for the monthly budget amount (default 30) and the notification email address.
- [ ] 3.2 Add an action group with the supplied email as receiver.
- [ ] 3.3 Add a `Microsoft.Consumption/budgets` resource scoped to the resource group, with notifications at 50%, 80%, and 100%.
- [ ] 3.4 Add an Azure Monitor metric alert on the Azure OpenAI account firing above 50000 processed tokens in a one-hour window; verify the metric's real name and aggregation against the deployed resource and report any mismatch rather than silently substituting.
- [ ] 3.5 Wire the module into `infra/main.bicep` gated by `enableChatbot`, matching how the other chatbot resources are gated.
- [ ] 3.6 Add module comments stating that neither alarm throttles anything and that the TPM capacity on the OpenAI deployments is the only enforcing ceiling.
- [ ] 3.7 Add a resource-id output to `infra/modules/openai.bicep` — it currently exposes only the endpoint and deployment names, and the metric alert needs the account's id to scope to it.
- [ ] 3.8 Verify before deploying that the deployment principal can create `Microsoft.Consumption/budgets`; that resource type needs Cost Management rights a Contributor-scoped principal may lack, and the failure only appears at deploy time.
- [ ] 3.9 State in the module and in the runbook that this alerting is Azure-only, so the on-premise deployment has no cost alerting at all and relies entirely on the application-level quotas from groups 4 and 6.
- [ ] 3.10 Record the cost model the default came from — roughly 10 USD/month at 300 users, 27 at 500, 108 at 1000 — so the number is traceable rather than arbitrary.

## 4. Burst limit on the send route

- [ ] 4.1 Add `CHATBOT_MAX_TURNS_PER_MINUTE = 15` to `apps/api/src/config/constants.ts`, documenting that it bounds the overshoot the token budgets cannot see because they read before a turn and credit after it.
- [ ] 4.2 Add the route-level `rateLimit` config to `apps/api/src/features/chatbot/sendMessage/route.ts` alongside the existing `allowPublicAccess`.
- [ ] 4.3 Document at the call site that this layer keys on IP because `@fastify/rate-limit` runs in `onRequest`, before `chatbotIdentityPreHandler` resolves the caller — an ordering constraint, not a preference.
- [ ] 4.4 Add an integration test asserting that turns beyond the cap receive 429 and never reach the LLM provider.

## 5. Tiered retention and conversation purge

- [ ] 5.1 Add `CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS = 7` beside the existing 30-day constant, documenting the relationship-based rationale and that both stay compile-time values per Decision 7.
- [ ] 5.2 Branch `computeExpiresAt` in `sendMessage/service.ts` on identity kind so anonymous conversations expire in 7 days and authenticated ones in 30.
- [ ] 5.3 Update the stale comment on `CHATBOT_CONVERSATION_TTL_DAYS` that still reads "pg_cron purge deferred".
- [ ] 5.4 Create `apps/api/src/plugins/app/chatbotPurge.ts` as an autoloaded Fastify plugin that returns immediately when `CHATBOT_ENABLED` is false, registering nothing.
- [ ] 5.5 Implement the sweep in three ordered steps: read the oldest `expires_at` still in the past, then `DELETE` the expired rows, then log the deleted count together with the measured backlog age.
- [ ] 5.6 Keep the measurement strictly before the delete, and comment why — measuring after always reports zero, so a purge dead for a month would look healthy.
- [ ] 5.7 Log at warning level when the backlog age materially exceeds the sweep interval, since that means earlier sweeps did not complete regardless of the cause.
- [ ] 5.8 Take no advisory lock, and comment that concurrent sweeps are tolerated because PostgreSQL serializes them and a collision costs duplicated work rather than wrong data.
- [ ] 5.9 Run the first sweep from an `onReady` hook so `fastify.prisma` is decorated, and guard the `createApp(withPrisma: false)` path used by tests.
- [ ] 5.10 Schedule the 24-hour interval with `.unref()` so it never holds the process open, and clear it in an `onClose` hook so a restart cannot leave two timers running.
- [ ] 5.11 Catch and log sweep failures without rethrowing — a failed purge is not a reason to take the chatbot down — and let the next interval retry.
- [ ] 5.12 Note in the code that sustained large deleted counts are the trigger for batched deletion, and that a transaction-scoped advisory lock is the next step if many instances and large deletes ever coincide.
- [ ] 5.13 Add integration tests: expired rows are deleted, unexpired rows survive, cascaded messages disappear with their conversation, and two concurrent sweeps both complete leaving no expired row.
- [ ] 5.14 Add an integration test that the backlog is measured before deletion — seed a long-expired row and assert the logged backlog reflects its true age rather than zero.
- [ ] 5.15 Add integration tests for the tiered TTL: an anonymous conversation expires in 7 days, an authenticated one in 30.

## 6. Token quotas

- [ ] 6.1 Add `CHATBOT_MAX_TOKENS_PER_IDENTITY_PER_DAY = 40_000` and `CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY = 300_000`, documenting that the recorded `tokens_used` counts only the terminal round and therefore understates real spend.
- [ ] 6.2 Add the three rejection message constants in neutral Spanish, beside the existing `CHATBOT_GENERIC_ERROR_MESSAGE`.
- [ ] 6.3 Implement the per-identity 24-hour token sum, joining messages to conversations on the identity columns; confirm the query uses the existing indexes and add any new one in raw SQL in a migration, never as a Prisma `@@index`.
- [ ] 6.4 Implement the global anonymous 24-hour token sum over conversations with no `user_id`.
- [ ] 6.5 Enforce both in `sendMessage` after the identity preHandler and before the provider call, responding 429 with the layer's own message and persisting nothing for a refused turn.
- [ ] 6.6 Ensure the refusal is an ordinary JSON 429 rather than an SSE stream carrying a terminal error, and that it is not conflated with the existing 413 for oversized input.
- [ ] 6.7 Confirm the widget renders the server's 429 body rather than substituting the generic provider-failure copy, and add a web test for it.
- [ ] 6.8 Add integration tests: identity over budget is refused; anonymous caller refused when the pool is exhausted; authenticated caller unaffected by an exhausted pool; refused turns leave no message rows.

## 7. Always retrieve, and floor the results

- [ ] 7.1 Add `CHATBOT_MIN_SIMILARITY = 0.45`, documented as provisional, explaining why it errs high and that it awaits measurement.
- [ ] 7.2 Thread a tool-choice option through the LLM provider so the first round can force `searchKnowledge` while the second round stays unforced.
- [ ] 7.3 Force the call on the first round in `sendMessage/handler.ts`, preserving the existing single-round invariant and its guard against a second consecutive tool call.
- [ ] 7.4 Amend `prompts/es/system.md` so the decision of whether to search is gone, and so the greeting and off-domain modes still return their canned responses when a forced retrieval yields nothing relevant.
- [ ] 7.5 Filter rows below `CHATBOT_MIN_SIMILARITY` in TypeScript after the query; leave the SQL `WHERE` untouched so the HNSW plan stays driven by `ORDER BY ... LIMIT`.
- [ ] 7.6 Log the top row's similarity on every retrieval, and log when no row survives the floor, so the value can later be calibrated from data.
- [ ] 7.7 Document at the `embedding_model` filter that changing the embedding model makes the whole existing corpus silently invisible and obliges a full re-ingestion.
- [ ] 7.8 Add tests: the first round forces the tool call, the second does not, weak rows are dropped, an all-weak result takes the existing K=0 path, and a greeting is not answered with the K=0 opener.

## 8. Documentation sync and verification

- [ ] 8.1 Update the chatbot retention section of `docs/security/sensitive-data.md` to describe tiered retention and a purge that runs, replacing the text stating the purge is deferred and rows accumulate.
- [ ] 8.2 Update the "Chatbot Conversation Purge" section of `docs/operations/runbook.md`, which currently documents the manual sweep as the interim measure.
- [ ] 8.3 Record in the runbook that the anonymous token pool can be exhausted by one actor and how an operator recognizes that state, so it is not diagnosed as an outage.
- [ ] 8.4 Run `pnpm format && pnpm lint && pnpm type-check` and the API and web suites; confirm all pass.
- [ ] 8.5 Re-read the specs against the implementation and reconcile any drift in the specs rather than in silence.
