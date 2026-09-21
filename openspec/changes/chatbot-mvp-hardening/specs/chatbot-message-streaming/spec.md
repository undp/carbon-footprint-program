## ADDED Requirements

### Requirement: A turn is refused before the model when a usage quota is exhausted

`POST /api/chatbot/message` SHALL evaluate the per-identity daily token budget and, for anonymous callers, the global anonymous token pool, after `chatbotIdentityPreHandler` has resolved the caller and before the LLM provider is invoked. When either is exhausted the endpoint SHALL respond 429 with the message belonging to that layer, SHALL NOT invoke the provider, and SHALL NOT persist a user or assistant message for the refused turn.

Refusing before the provider is the entire point: a refusal that still pays for a completion controls nothing.

#### Scenario: Refusal happens before any provider call

- **WHEN** a quota refuses the turn
- **THEN** no call to the LLM provider or the embedding provider SHALL be made for that turn

#### Scenario: Refused turns leave no rows behind

- **WHEN** a quota refuses the turn
- **THEN** no `chatbot_chat_message` row SHALL be written for it, and no conversation SHALL be created on its behalf

#### Scenario: Refusal precedes the stream hijack

- **WHEN** a quota refuses the turn
- **THEN** the response SHALL be an ordinary JSON 429, not an SSE stream carrying a terminal error event
