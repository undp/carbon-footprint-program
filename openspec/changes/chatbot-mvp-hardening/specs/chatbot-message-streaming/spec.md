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

### Requirement: Answers without verified sources carry no numeric values

When `searchKnowledge` reports `'0 fuentes válidas encontradas'`, the system prompt SHALL instruct the assistant to open with the existing K=0 literal, MAY let it point to official external sources (GHG Protocol, IPCC, DEFRA, a certified verifier) and give conceptual context, and SHALL forbid it from giving any numeric value — emission factors, figures, ranges, percentages or estimates — even when qualified as approximate. The prohibition on invented URLs, section numbers, tables and bibliographic references SHALL remain.

This supersedes the K=0 guidance of `chatbot-rag-mvp` Decision 14, which allowed qualified approximate figures. A qualifier does not survive being copied into an inventory, and an unsourced figure can contradict the platform's own factors.

#### Scenario: The prompt forbids numbers in the K=0 path

- **WHEN** the system prompt is loaded
- **THEN** it SHALL contain the prohibition on numeric values for the zero-sources case, and SHALL NOT contain the earlier permission for "factores aproximados" or "cifras orientativas"
