## ADDED Requirements

### Requirement: Env-configured generic OIDC validation

The API SHALL validate bearer tokens — configured purely by environment variables when `AUTH_PROVIDER=jwks` (`JWKS_ISSUER` = token `iss`, `JWKS_URI` = JWKS endpoint, `JWKS_AUDIENCE` = expected `aud`) — from any OIDC issuer that emits the claims the provider requires: a subject (`oid` or `sub`) and an email (`email` or `preferred_username`). Once the generic scope handling is in place, no issuer-specific code SHALL be required to accept such an issuer — configuration only.

#### Scenario: Token missing the email claim is rejected

- **WHEN** a token is otherwise valid but carries neither `email` nor `preferred_username`
- **THEN** the request is rejected (the email claim is mandatory)

#### Scenario: Keycloak token accepted by config alone

- **WHEN** the API is configured with Keycloak's issuer, JWKS URI, and audience and receives a valid Keycloak token
- **THEN** the request is authenticated with no code change

#### Scenario: Audience enforced when set

- **WHEN** `JWKS_AUDIENCE` is set and a token's `aud` does not include it
- **THEN** the token is rejected

### Requirement: Purely generic JWKS validation with no Azure-specific path

The API SHALL validate tokens using a single, provider-agnostic JWKS path with no Azure-specific branch. It SHALL verify the token signature against `JWKS_URI`, the issuer against `JWKS_ISSUER` (when set), and the audience against `JWKS_AUDIENCE` (when set); it SHALL extract the subject as `oid ?? sub` and the email as `email ?? preferred_username`. There SHALL be no `ver:2.0` / `/v2.0` issuer validation and no `AZURE_TENANT_ID` gating: the auth `AZURE_*` vars (`AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) SHALL have no effect on token validation. Azure **Storage** `AZURE_*` configuration is independent and SHALL remain functional.

#### Scenario: Non-Azure token validated by the generic path only

- **WHEN** a valid non-Azure (e.g. Keycloak) token is presented
- **THEN** it is accepted or rejected solely by the generic JWKS checks (signature, issuer, audience, required claims, scope) with no Azure-specific rule applied

#### Scenario: Residual auth `AZURE_*` does not affect validation

- **WHEN** `AZURE_TENANT_ID` (or `AZURE_API_CLIENT_ID`) is present in the environment, including shell/direnv overriding the env file
- **THEN** token validation is unchanged — no Azure rules are re-activated and a valid Keycloak token is still accepted

### Requirement: Browser↔API issuer/hostname consistency

The issuer value validated against the token `iss` SHALL match the issuer the browser used to obtain the token, while the JWKS endpoint SHALL be resolvable from inside the API's network. A hostname mismatch between these SHALL be treated as a misconfiguration that fails validation.

#### Scenario: Split hostnames resolve correctly

- **WHEN** `JWKS_ISSUER` is the browser-facing issuer and `JWKS_URI` uses the internal service hostname
- **THEN** the API validates `iss` against the browser-facing issuer and successfully fetches keys from the internal JWKS URI

### Requirement: Generic scope validation across `scp` and `scope`

The provider SHALL read the granted scope from `payload.scp ?? payload.scope` (the `OidcTokenPayload` type SHALL include `scope?: string`) and SHALL enforce `JWKS_REQUIRED_SCOPE`, retaining scope validation across issuers that emit either claim. Disabling scope validation via `JWKS_SKIP_SCOPE_CHECK=true` SHALL NOT be the configured path — scope is enforced, not skipped.

#### Scenario: Required scope present in the standard `scope` claim

- **WHEN** `JWKS_REQUIRED_SCOPE=access_as_user` and a token carries the required scope in `scope` (not `scp`)
- **THEN** scope validation passes

#### Scenario: Required scope present in the Azure `scp` claim

- **WHEN** `JWKS_REQUIRED_SCOPE=access_as_user` and an Azure token carries the required scope in `scp`
- **THEN** scope validation passes

#### Scenario: Required scope absent

- **WHEN** `JWKS_REQUIRED_SCOPE=access_as_user` and a token carries the required scope in neither `scp` nor `scope`
- **THEN** the token is rejected
