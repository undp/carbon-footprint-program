# chatbot-conversation-deletion Specification

## Purpose

Defines the `DELETE /api/chatbot/conversations/me` endpoint, which lets any caller erase their own chat history to satisfy the platform's right-to-be-forgotten policy. Deletion is scoped to the resolved caller identity — `user_id` for authenticated callers, the signed `chatbot_session_id` cookie value for anonymous callers — and cascades to the associated `chatbot_chat_message` rows. The endpoint is idempotent (always HTTP 204, never 401), it is not identity-creating (it never mints a session cookie), and on the anonymous path it clears the session cookie so no chatbot trace remains in the browser.

## Requirements

### Requirement: Endpoint deletes all conversations bound to the caller identity

The system SHALL expose `DELETE /api/chatbot/conversations/me`. When invoked, it SHALL delete every `chatbot_chat_conversation` row where the row's identity column matches the caller: `user_id = currentUser.id` for authenticated callers, or `session_id = <signed cookie value>` for anonymous callers. Cascade delete on `chatbot_chat_message.conversation_id` SHALL ensure all associated messages are also removed.

#### Scenario: Authenticated caller deletes by user_id

- **WHEN** an authenticated user posts `DELETE /api/chatbot/conversations/me` and has one or more conversation rows where `user_id = currentUser.id`
- **THEN** all such conversation rows SHALL be deleted, all child message rows SHALL be removed via the foreign-key cascade, and the response SHALL be HTTP 204 with no body

#### Scenario: Anonymous caller deletes by session_id

- **WHEN** an anonymous client posts `DELETE /api/chatbot/conversations/me` carrying a valid signed `chatbot_session_id` cookie matching one or more conversation rows
- **THEN** all such conversation rows SHALL be deleted, all child message rows SHALL be removed via cascade, and the response SHALL be HTTP 204

#### Scenario: Authenticated caller's anonymous conversations are not deleted

- **WHEN** an authenticated user (with a populated `currentUser`) invokes the deletion endpoint
- **THEN** the deletion SHALL match only on `user_id` — conversations created earlier under the same browser's `session_id` while unauthenticated SHALL NOT be deleted by this call

### Requirement: Deletion is idempotent

A delete request SHALL succeed (HTTP 204) regardless of whether any rows were actually removed. The endpoint SHALL NOT return 404 when the caller has zero conversations. This makes client retry safe and simplifies UI flows that fire the request optimistically.

#### Scenario: No matching rows still returns 204

- **WHEN** an authenticated caller with no conversations posts the deletion endpoint
- **THEN** the response SHALL be HTTP 204 with no body

#### Scenario: Anonymous caller with valid cookie but no conversations returns 204

- **WHEN** an anonymous caller carrying a valid signed cookie that has never been associated with a conversation posts the deletion endpoint
- **THEN** the response SHALL be HTTP 204

### Requirement: Caller without identity returns 204 (no-op)

If neither `currentUser` nor a valid signed `chatbot_session_id` cookie is present on the request, the endpoint SHALL respond with HTTP 204 (no-op). The endpoint SHALL NOT respond with HTTP 401, and SHALL NOT generate a fresh session cookie — `DELETE /api/chatbot/conversations/me` is not an identity-creating endpoint.

#### Scenario: No identity returns 204 without setting a cookie

- **WHEN** a caller with no auth and no `chatbot_session_id` cookie posts the deletion endpoint
- **THEN** the response SHALL be HTTP 204, the response SHALL NOT include a `Set-Cookie` header, and no rows SHALL be modified

#### Scenario: Tampered cookie treated as no identity

- **WHEN** a caller posts the deletion endpoint with a `chatbot_session_id` cookie whose signature does not validate against `COOKIE_SECRET`
- **THEN** the response SHALL be HTTP 204, no rows SHALL be modified, the response SHALL NOT generate a fresh cookie, and the response SHALL NOT include any `Set-Cookie` header for `chatbot_session_id` (the invalid cookie is treated as no identity, and we do not advertise its existence by clearing it)

### Requirement: Anonymous deletion clears the session cookie

When the caller is anonymous and carried a valid signed `chatbot_session_id` cookie on the request (whether or not any conversation rows actually matched), the response SHALL clear the cookie with a `Set-Cookie` header carrying **the same attributes the cookie was set with** — `Max-Age=0`, `Path=/api/chatbot`, `HttpOnly`, plus the environment-appropriate `SameSite`/`Secure` (`SameSite=None; Secure` in production, `SameSite=Lax` in local dev). Mirroring the set attributes is what lets the browser reliably delete the cookie. This aligns with the 30-day retention and right-to-be-forgotten policy (see `design.md` §Background Context, D11) — after a deletion, no chatbot trace SHALL remain in the user's browser. The no-identity and tampered-cookie cases are covered by the `Caller without identity returns 204 (no-op)` requirement above; the scenarios below cover only the valid-signed-cookie path. The authenticated-caller anti-scenario stays here because it scopes the cookie-clearing behavior to anonymous callers exclusively.

#### Scenario: Anonymous caller with valid cookie has cookie cleared on success

- **WHEN** an anonymous caller posts the deletion endpoint with a valid signed `chatbot_session_id` cookie matching one or more conversations
- **THEN** the response SHALL be HTTP 204 AND SHALL include a `Set-Cookie` header that clears `chatbot_session_id` with `Max-Age=0`, `Path=/api/chatbot`, `HttpOnly`, and the same `SameSite`/`Secure` attributes the cookie was set with for the environment

#### Scenario: Anonymous caller with valid cookie but no matching rows still has cookie cleared

- **WHEN** an anonymous caller posts the deletion endpoint with a valid signed cookie that has never been associated with a conversation
- **THEN** the response SHALL be HTTP 204 AND SHALL include the cookie-clearing `Set-Cookie` header

#### Scenario: Authenticated caller does not receive any chatbot cookie header

- **WHEN** an authenticated caller posts the deletion endpoint
- **THEN** the response SHALL be HTTP 204 AND SHALL NOT include any `Set-Cookie` header for `chatbot_session_id`

### Requirement: Endpoint URL is `DELETE /api/chatbot/conversations/me`

The endpoint SHALL be exposed at exactly `/api/chatbot/conversations/me` under the API base path, accepting only the `DELETE` method. The route SHALL be registered alongside the streaming endpoint at `apps/api/src/routes/api/chatbot/index.ts`.

#### Scenario: Endpoint reachable at canonical URL

- **WHEN** a `DELETE` is made to `/api/chatbot/conversations/me`
- **THEN** the route SHALL be matched and the deletion handler SHALL run

#### Scenario: Other methods rejected

- **WHEN** a `GET`, `POST`, or `PUT` is made to `/api/chatbot/conversations/me`
- **THEN** the framework SHALL respond with HTTP 404 or 405, never invoking the deletion handler

### Requirement: Route schema declares response shapes for all relevant HTTP status codes

The route schema SHALL declare response shapes for HTTP 204 (success / no-op) and HTTP 500 (unexpected server error). The 204 response SHALL have an empty body and SHALL NOT carry a content type.

#### Scenario: Successful response carries no body

- **WHEN** the deletion handler completes successfully
- **THEN** the response status SHALL be 204 and the response body SHALL be empty
