## MODIFIED Requirements

### Requirement: Conversations expire 30 days after creation and the value is not refreshed

The system SHALL set `chatbot_chat_conversation.expires_at` at row creation to `created_at` plus a retention window chosen by the caller's identity kind: `CHATBOT_CONVERSATION_TTL_DAYS = 30` for an authenticated caller, and `CHATBOT_ANONYMOUS_CONVERSATION_TTL_DAYS = 7` for an anonymous one. Both constants SHALL live in `apps/api/src/config/constants.ts` and SHALL remain compile-time constants rather than environment variables — a deployment needing a different window is already modifying code, and keeping the value fixed lets the widget's retention notice state a number without coordinating across two applications. `expires_at` SHALL NOT be refreshed when subsequent messages are appended to the conversation.

The asymmetry follows the relationship. An authenticated caller has an account to return to and history worth preserving across devices. An anonymous caller gains only that the thread survives a page reload — a benefit already lost whenever the browser discards the session cookie — while carrying the same data-at-rest exposure. Retaining less from the callers there is no way to contact is the cheapest reduction in exposure available, and it requires nothing of anyone.

#### Scenario: Authenticated conversation gets a 30-day expires_at

- **WHEN** a conversation row is created for a caller whose identity kind is `user`
- **THEN** `expires_at` SHALL equal `created_at + 30 days` within database timestamp precision

#### Scenario: Anonymous conversation gets a 7-day expires_at

- **WHEN** a conversation row is created for a caller whose identity kind is `session`
- **THEN** `expires_at` SHALL equal `created_at + 7 days` within database timestamp precision

#### Scenario: expires_at is not refreshed on subsequent messages

- **WHEN** a new message is appended to an existing conversation
- **THEN** the conversation's `expires_at` SHALL remain at its original value

#### Scenario: An abandoned anonymous thread stops rehydrating after a week

- **WHEN** an anonymous caller returns more than seven days after their last turn, carrying a conversation id that names an expired row
- **THEN** the rehydrate endpoint SHALL treat it as absent and the widget SHALL start a fresh conversation, exactly as it already does for any expired id
