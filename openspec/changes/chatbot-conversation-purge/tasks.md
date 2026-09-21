## 1. The purge itself

- [ ] 1.1 Add `CHATBOT_PURGE_INTERVAL_MS` (24 hours) and `CHATBOT_PURGE_BACKLOG_WARN_MULTIPLIER` to `apps/api/src/config/constants.ts`, documenting that the threshold is a multiple of the interval because a healthy sweep always leaves roughly one interval of backlog behind.
- [ ] 1.2 Create `apps/api/src/plugins/app/chatbotPurge.ts` as an autoloaded Fastify plugin that returns immediately when `CHATBOT_ENABLED` is false, registering nothing.
- [ ] 1.3 Implement the sweep in three ordered steps: read the oldest `expires_at` still in the past, then `DELETE` the expired rows, then log the deleted count together with the measured backlog age.
- [ ] 1.4 Keep the measurement strictly before the delete, and comment why — measuring after always reports nothing, so a purge dead for a month would look healthy.
- [ ] 1.5 Log at warning level when the backlog age materially exceeds the sweep interval, since that means earlier sweeps did not complete regardless of the cause.
- [ ] 1.6 Take no advisory lock, and comment that concurrent sweeps are tolerated because PostgreSQL serializes them and a collision costs duplicated work rather than wrong data.
- [ ] 1.7 Run the first sweep from an `onReady` hook so `fastify.prisma` is decorated, and guard the `createApp(withPrisma: false)` path used by tests.
- [ ] 1.8 Schedule the 24-hour interval with `.unref()` so it never holds the process open, and clear it in an `onClose` hook so a restart cannot leave two timers running.
- [ ] 1.9 Catch and log sweep failures without rethrowing, and let the next interval retry.
- [ ] 1.10 Note in the code that sustained large deleted counts are the trigger for batched deletion, and that a transaction-scoped advisory lock is the next step if many instances and large deletes ever coincide.

## 2. Tests

- [ ] 2.1 Expired rows are deleted and unexpired rows survive.
- [ ] 2.2 Messages disappear with their conversation through the existing cascade, with no second statement.
- [ ] 2.3 A sweep with nothing expired reports zero deleted and a null backlog — distinct from a backlog of zero.
- [ ] 2.4 Two concurrent sweeps both complete and leave no expired row behind.
- [ ] 2.5 The backlog reports the true age of the oldest expired row rather than the newest, and never zero.
- [ ] 2.6 A sweep measures before deleting, so the following sweep reports nothing left — the steady state that makes a non-null reading meaningful.

## 3. Documentation

- [ ] 3.1 Rewrite the "Chatbot Conversation Purge" section of `docs/operations/runbook.md`, which currently documents the manual SQL sweep as the interim measure and `pg_cron` as the eventual one.
- [ ] 3.2 Correct the retention section of `docs/security/sensitive-data.md`, which states that the purge is deferred and that expired rows accumulate.
- [ ] 3.3 Restore a retention duration to `CHATBOT_PRIVACY_NOTICE` in `apps/web/src/config/constants.ts`, which states none today because nothing deleted; update its mirror and the "claims no retention window" assertion in `ChatbotWidget.test.tsx`, and the `chatbot-widget` spec that forbids a duration.
- [ ] 3.4 Record that the first production sweep reports a large backlog by design, so it is not read as a fault.
- [ ] 3.5 Run `pnpm format && pnpm lint && pnpm type-check` and the API suite; confirm all pass.
