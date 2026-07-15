# idp-content-security-policy Specification

## Purpose

TBD - created by archiving change generic-oidc-auth-provider. Update Purpose after archive.

## Requirements

### Requirement: Build-time env-driven CSP in nginx

The web app SHALL serve a Content-Security-Policy from `apps/web/nginx.conf` whose `connect-src`, `form-action`, and `frame-src` directives permit the configured IdP domain, and that domain SHALL be derived from the OIDC issuer (`VITE_OIDC_ISSUER`) rather than hardcoded per country/deployment. The policy SHALL be produced at **build time** from a build ARG (the runner stage has no runtime environment and `VITE_*` are build-time only); a runtime `envsubst`/entrypoint mechanism SHALL NOT be used, since changing the issuer already requires a web rebuild.

#### Scenario: CSP permits the configured IdP

- **WHEN** the web image is built with the OIDC issuer set to a given IdP domain
- **THEN** nginx serves a CSP whose `connect-src`/`form-action`/`frame-src` allow that IdP domain

#### Scenario: Switching IdP requires no hand-edit of the policy

- **WHEN** the deployment changes the IdP/issuer via environment and rebuilds the web image
- **THEN** the served CSP allows the new IdP domain without hand-editing the CSP

#### Scenario: No per-country hardcode

- **WHEN** the nginx CSP source is inspected
- **THEN** the IdP domain is injected from the issuer build ARG, not written as a literal per-country value

### Requirement: Azure Static Web Apps CSP out of scope

This change SHALL scope the IdP CSP to the on-prem nginx (docker-compose) deploy path only. The Azure Static Web Apps path — `apps/web/public/staticwebapp.config.json`, `infra/deploy-web.sh`, and `infra/modules/staticWebApp.bicep` — SHALL NOT be modified by this change and SHALL remain Azure-only. This is recorded explicitly (not silently omitted); making the SWA CSP IdP-agnostic is a documented follow-up if SWA must serve a generic-OIDC deployment.

#### Scenario: SWA artifacts are untouched

- **WHEN** the change's diff is reviewed
- **THEN** `staticwebapp.config.json`, `deploy-web.sh`, and `staticWebApp.bicep` are unchanged, and the out-of-scope decision is documented
