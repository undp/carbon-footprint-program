# Chatbot and RAG Security

Security controls specific to the AI assistant: the model-supplied input it accepts, the corpus it is allowed to quote, the cookies it issues, and the credentials it uses to reach Azure OpenAI.

The chatbot is off unless `CHATBOT_ENABLED=true`. A deployment that leaves it off runs no AI code path, issues no conversation cookie, and needs no Azure OpenAI resource — none of the controls below are load-bearing in that configuration.

Related: [Sensitive Data Handling](./sensitive-data.md) covers the conversation cookies and the PII inventory; [Secrets Management](./secrets.md) covers credential delivery; [Infrastructure Hardening](./hardening.md) covers input validation across the rest of the API.

---

## Trust boundaries

The assistant introduces two inputs the rest of the API does not have. Both are untrusted, for different reasons.

| Input                    | Origin                      | Why it is untrusted                                                                                               |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tool-call arguments      | The LLM, mid-turn           | The model chooses them. A prompt-injected or simply malfunctioning model can emit anything the JSON Schema allows |
| Retrieved corpus content | Operator-ingested documents | Reaches the model as text. Whatever it contains, the model must read it as data, never as instructions            |

The user's message is untrusted in the ordinary way and is validated like any other request body.

---

## Tool arguments are validated before they reach the embedding provider or the database

The model can invoke exactly one tool, `searchKnowledge`, and the schema it sees exposes exactly one field:

```ts
// apps/api/src/features/chatbot/tools/searchKnowledge/schema.ts
parameters: {
  type: "object",
  properties: { query: { type: "string", minLength: 1, maxLength: 2000 } },
  required: ["query"],
  additionalProperties: false,
}
```

`topK`, `scope`, and `sourceType` are deliberately **not** exposed. They are server-side concerns; a model that could set `topK` could inflate retrieval cost per turn, and one that could set `scope` could widen the corpus beyond what the deployment intends.

The JSON Schema is the first line of defence, not the only one. Arguments arrive as a JSON string, and both layers behind it re-validate:

| Layer                                                            | Rejects                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SearchKnowledgeArgsSchema` (`tools/searchKnowledge/execute.ts`) | Malformed JSON, missing or non-string `query`, unknown fields                                           |
| `searchKnowledge` (`InvalidQueryError`)                          | Empty / whitespace-only query; query over 512 estimated tokens; `topK` non-integer or outside `[1, 20]` |

Both checks run **before** the embedding provider is called and **before** any SQL executes, so a bad tool call costs neither an embedding request nor a database round-trip.

The retrieval SQL binds every user-influenced value (`query` vector, `scope`, `sourceType`, `topK`) as a parameter. Nothing is string-concatenated, and the `embedding` column is never selected back.

---

## Retrieved content is quoted as data, never as instructions

This is the prompt-injection control, and its exact shape is load-bearing.

Each retrieved chunk is rendered into the tool-result message as:

```
Fuente <n>: [<cite_label>](<cite_url>) - Contenido: "<snippet>"
```

The `Contenido:` prefix and the surrounding double quotes exist so the model reads the chunk as quoted material rather than as new system-level direction. **Do not remove the quoting, and do not introduce control phrases** (`"you must"`, `"ignore previous"`, `"system:"`) into the tool-result string outside this scaffolding. The system prompt reinforces the same contract in Spanish.

Today the corpus is operator-controlled, so the realistic threat is low. The formatting rule is written down because the citation flow is general-purpose: the day a deployment ingests a document it did not author, this is the control that already has to be in place.

The Markdown link is pre-formatted server-side for a related reason. The model is asked to copy a complete link verbatim, never to construct or reformat a URL — URL construction is the failure mode that produces plausible, hallucinated citations.

---

## Retrieval cannot read unpublished corpus content

`searchKnowledge` joins `chatbot_corpus_chunk` to `chatbot_corpus_source` and filters `status = 'ACTIVE'` unconditionally. There is no option, flag, or argument that relaxes it.

| Status     | Meaning                                   | Visible to retrieval |
| ---------- | ----------------------------------------- | -------------------- |
| `DRAFT`    | Mid-ingest, not yet reviewed or activated | No                   |
| `ACTIVE`   | Published                                 | Yes                  |
| `OUTDATED` | Superseded by a newer version             | No                   |

So a half-ingested document, or a retired one, can never be quoted to a user regardless of how well it matches the query. Ingest always writes `DRAFT`; a separate `chatbot:activate` step performs the `DRAFT → ACTIVE` cutover (demoting any prior `ACTIVE` of the same `(name, scope)` to `OUTDATED`) atomically under an advisory lock.

This is a release-gate invariant: the integration test asserting that an `OUTDATED` chunk stays out of results even when it is the closest match blocks merging if it fails. Corpus-table access is additionally confined to the retrieval and ingest modules by `corpusAccessBoundary.test.ts`.

---

## Conversation cookies

Full treatment — including the deliberate non-`HttpOnly` decision and the IDOR reasoning — is in [Sensitive Data Handling](./sensitive-data.md#chatbot-conversation-persistence-and-retention). Two points are repeated here because they are the ones most likely to be "simplified" by mistake:

- **`chatbot_conversation_id` is intentionally readable by JavaScript.** The signature is the security property, not `HttpOnly`. `GET /api/chatbot/conversations/me/current` re-checks TTL and caller identity on every read, so a forged or edited id yields `404` (and clears the cookie) rather than another user's thread.
- **`SameSite` must mirror `chatbot_session_id`:** `None; Secure` in production, `Lax` outside it. The web app and API are served from different registrable domains, so a `Lax` cookie is simply never sent — persistence would work in local development and silently do nothing in production. This shipped as a defect once; do not narrow it back.

---

## Credentials for Azure OpenAI

Production authenticates **keylessly**, via the App Service system-assigned managed identity and a bearer-token provider scoped to `https://cognitiveservices.azure.com/.default`. Both the chat and embedding clients take the same path.

This is enforced by the infrastructure, not just by convention. `infra/modules/openai.bicep` deploys the account with `disableLocalAuth: true`, which switches off API-key authentication at the resource, and `infra/modules/openAiRoleAssignment.bicep` grants the App Service identity `Cognitive Services OpenAI User` on it. The App Service template never sets `AZURE_OPENAI_API_KEY`. A key would therefore not work even if someone added one.

One deployment detail with a security consequence: the account sets `customSubDomainName`, which is **required** for Entra ID authentication. Without it the account is reachable only on the regional shared endpoint, which does not accept AAD tokens — managed identity then fails at runtime with a 401 that looks exactly like a missing role assignment.

`AZURE_OPENAI_API_KEY` is a **local-development fallback only**. When it is set to a non-empty value both clients switch to API-key auth; production leaves it unset. It is never logged: no code path writes provider credentials to the logger, and the key reaches the process as an environment variable rather than as request data. See [Secrets Management](./secrets.md) for delivery and classification, and [Azure AI access requirements](../infrastructure/chatbot-ai-access-requirements.md) for the role assignment.

---

## The mock providers cannot reach production

Both the LLM and embedding providers have mock implementations for local development and tests. The embedding mock is the dangerous one: its vectors are SHA-256-derived and carry **no semantic relation to the text**, so cosine similarity over them is effectively random. Ingesting or retrieving with it corrupts the corpus quietly rather than failing loudly.

Two independent guards, deliberately scoped differently:

| Guard                | Condition                                                                              | Why the scope differs                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| API boot validation  | `NODE_ENV=production` + `EMBEDDING_PROVIDER=mock` + `CHATBOT_ENABLED=true`             | A deployment with the chatbot off never computes an embedding, and must not be forced to provision Azure for a disabled feature |
| `chatbot:ingest` CLI | `NODE_ENV=production` + `EMBEDDING_PROVIDER=mock`, **regardless of `CHATBOT_ENABLED`** | Seeding a corpus before switching the assistant on is an intended workflow, and ingest is what writes vectors                   |

The pair is what closes the gap: the CLI guard covers exactly the window the boot guard deliberately leaves open. Neither is redundant — removing either one creates a path that writes mock vectors into a production corpus.

An `eslint` rule (`chatbot/no-network-imports-in-mock`) additionally prevents either mock from acquiring a network dependency, so "mock" cannot quietly start making outbound calls.

---

## What this feature does not add

- **No new PII.** The corpus tables hold operator-ingested reference material and embeddings derived from it — no user content. Conversation content is covered by the existing chatbot PII inventory.
- **No new audit-log events.** Corpus ingestion and activation are CLI operations run by an operator; `chatbot_corpus_ingest_run` records them as history (who triggered it, which embedding model, chunk count) but is not part of the application audit trail.
- **No user-facing corpus management.** Ingest and activate are CLI-only in V1. There is no endpoint through which a user, of any role, can add to or modify the corpus.
