## Why

`chatbot_chat_conversation.expires_at` is written at row creation and respected by every read, and nothing ever deletes a row. The retention promise therefore holds at the product layer and not at the data layer: an expired conversation is invisible to the user and still present in a database dump, indefinitely. The widget states no retention window at all, precisely because a duration there would promise a deletion that does not happen — so the platform currently cannot tell a user how long their conversations are kept. This change is what would make that sentence sayable.

This was designed and implemented inside `chatbot-mvp-hardening` and then pulled back out, so that change could ship its spend controls without also carrying a scheduled background job. The design survives here intact; what is missing is only the decision to run it.

## What Changes

- **A purge that deletes expired conversations**, run once when the API becomes ready and every 24 hours thereafter, gated on `CHATBOT_ENABLED` so a deployment with the chatbot off schedules nothing.
- **A backlog measurement taken before each delete**, logged with the deleted count and raised to a warning when the oldest still-present expired row is materially older than the sweep interval.
- **No `pg_cron`.** On Azure the extension must join `azure.extensions`, a server parameter that _replaces_ its list rather than appending, so an error there drops `VECTOR` and breaks the chatbot migration. On-premise it must be installed on the server, which is the same fight already fought for pgvector. Two infrastructure battles, in two topologies, to execute one `DELETE`.
- **No advisory lock.** PostgreSQL serializes competing deletes against the same rows, so concurrent sweeps cost duplicated work rather than incorrect data.

Explicitly **not** in scope:

- **Batched deletion.** Warranted only if the deleted count becomes sustainedly large; at current volumes a single statement is correct.
- **Retention tiering.** Already shipped in `chatbot-mvp-hardening`: anonymous conversations expire in 7 days, authenticated in 30. This change deletes what that one marks as expired.

## Capabilities

### Modified Capabilities

- `chatbot-conversation-persistence`: expired rows acquire a process that deletes them, and that process acquires a way to report that it has stopped working.

## Impact

- **API**: one new plugin under `plugins/app/`, scheduled from `onReady`. No route, no endpoint, no request-path cost.
- **Database**: no schema change. The existing `chatbot_chat_conversation_expires_at_idx` serves the sweep and `chatbot_chat_message.conversation_id` already cascades.
- **Docs**: `docs/operations/runbook.md` and `docs/security/sensitive-data.md` both currently describe the purge as deferred and the manual SQL sweep as the interim measure; both stop being true.
- **First run**: deletes everything accumulated since the tables existed, and reports a correspondingly large backlog. That is the measurement working, not a fault.
