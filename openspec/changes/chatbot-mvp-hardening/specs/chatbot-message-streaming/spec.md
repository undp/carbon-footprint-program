## MODIFIED Requirements

### Requirement: Endpoint registers the searchKnowledge tool definition for every chat completion

The handler SHALL pass `options.tools` containing exactly one tool definition: `searchKnowledge`. The tool declares a JSON Schema requiring only `query: string`. It SHALL NOT expose `topK`, `scope`, `sourceType`, or any other parameter. On the first round of a turn `tool_choice` SHALL name `searchKnowledge` rather than being `"auto"`, so retrieval runs on every turn.

The model is a poor judge of whether a question is answerable from the corpus. Questions shaped as requests for advice do not read as lookups, so under `"auto"` they skip retrieval and reach the honest fallback while the answer sits in the corpus unread — observed in QA. Forcing the call removes a decision the model cannot make well, at the cost of one embedding and one extra round on turns that would not have searched, including greetings. The similarity floor in `chatbot-corpus-retrieval` is what keeps a forced search from putting irrelevant fragments in front of the model.

The system prompt SHALL be amended so its non-retrieval modes remain correct when a forced search returns nothing relevant: a greeting or an off-domain question SHALL still produce its canned response and SHALL NOT be answered with the K=0 opener merely because the forced retrieval found no usable rows.

#### Scenario: Tool definition is passed on every turn

- **WHEN** the handler invokes `provider.streamCompletion`
- **THEN** `options.tools` SHALL be a non-empty array containing exactly one entry with `name = "searchKnowledge"` and a JSON-Schema parameters object that requires only a `query` field of type `string`

#### Scenario: Tool schema does not expose server-side defaults

- **WHEN** the tool definition is inspected
- **THEN** the JSON Schema's `properties` SHALL contain only `query`, and SHALL NOT contain `topK`, `scope`, `sourceType`, or any other field

#### Scenario: First round forces the retrieval call

- **WHEN** the handler invokes `provider.streamCompletion` for the first round of a turn
- **THEN** `tool_choice` SHALL name the `searchKnowledge` function, and the provider SHALL NOT be free to answer without calling it

#### Scenario: Second round does not force the call

- **WHEN** the handler invokes the provider again after executing the tool
- **THEN** `tool_choice` SHALL NOT force another call, preserving the existing single-round invariant

#### Scenario: A greeting still receives a welcome, not the K=0 opener

- **WHEN** the user sends a greeting and the forced retrieval returns no rows above the similarity floor
- **THEN** the assistant SHALL answer with the welcome described by the system prompt, and SHALL NOT open with the K=0 literal

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

### Requirement: Retrieval similarity is logged for later calibration

For every turn that performs retrieval, the handler SHALL log the similarity of the highest-scoring row returned by `searchKnowledge`, together with whether any row survived the similarity floor.

The floor ships at a provisional value. This log is what makes it possible to replace that guess with a measurement once a real corpus is loaded, rather than tuning it a second time by intuition.

#### Scenario: Top similarity is recorded per retrieval

- **WHEN** `searchKnowledge` returns rows for a turn
- **THEN** the handler SHALL log the top row's similarity value

#### Scenario: Empty retrieval is recorded as such

- **WHEN** retrieval returns rows but none survive the similarity floor
- **THEN** the handler SHALL log that no row survived, alongside the top similarity that was rejected
