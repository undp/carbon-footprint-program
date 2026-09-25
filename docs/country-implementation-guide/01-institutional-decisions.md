# 1. Institutional decisions

Before touching a single file, the country makes 10 decisions that shape everything else. Several
cannot be changed later without redoing data, so they are best closed in writing with the
environmental authority and recorded in minutes.

← [Back to index](./README.md) · Next: [2. Seed content](./02-seed-content.md) →

---

## The 10 decisions

| #   | Decision                                    | Options                                                                                       | Where it lands                                                                                  |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Operator and data controller                | Ministry, attached agency, international organization acting on the country's behalf          | Privacy notice, mandatory contacts ([phase 5](./05-validation-and-go-live.md)), cloud contracts |
| 2   | National methodological framework           | GHG Protocol, ISO 14064-1, an existing national footprint program                             | Category structure, names, badges                                                               |
| 3   | Official source of emission factors         | National GHG inventory, official grid factor, IPCC 2006/2019, DEFRA as fallback               | The whole factor catalogue ([phase 2](./02-seed-content.md))                                    |
| 4   | Who maintains the methodology over time     | Ministry technical team, consultancy, academia                                                | `ADMIN` users who run the catalogue; yearly factor update cycle                                 |
| 5   | Measurement recognition                     | `AUTOMATIC`, `MANUAL` or `HIDDEN` (see below)                                                 | `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` parameter and reviewer workload           |
| 6   | Badges awarded                              | Measurement, verification, reduction, organization accreditation; own names and artwork       | Seed badges and the badges screen                                                               |
| 7   | Where the platform runs, and data residency | Azure cloud (Bicep included) or on-premise with Docker Compose, even without internet access  | All of [phase 4](./04-infrastructure.md); where personal data is stored                         |
| 8   | Identity provider (login)                   | Self-hosted Keycloak, Entra External ID, or another OIDC provider the government already uses | [Phase 4](./04-infrastructure.md); who administers accounts and password recovery               |
| 9   | AI assistant (chatbot)                      | Enabled with Azure OpenAI, or disabled (`CHATBOT_ENABLED=false`, the default)                 | Cost, data residency (prompts leave the country), document corpus                               |
| 10  | First administrators                        | Names of the initial `SUPERADMIN` and `ADMIN` users                                           | First-user creation ([phase 4](./04-infrastructure.md#first-production-deploy-sequence))        |

### Measurement recognition options (decision 5)

| Value       | What happens when an organization self-declares a footprint                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `AUTOMATIC` | The platform approves the measurement immediately and awards the measurement badge. No admin action needed. |
| `MANUAL`    | The organization submits the footprint for review; an admin approves, sends back or rejects it.             |
| `HIDDEN`    | Measurement recognition is switched off; only verification submissions reach the admin queue.               |

The seed ships with `AUTOMATIC`. `MANUAL` needs a staffed review team (decision 4).

### Two decisions anticipated for phase 2

- **Subcategory recommendation mode** (`SUBCATEGORY_RECOMMENDATION_MODE`): `UNION` combines sector
  and subsector recommendations; `SPECIFIC` shows only the subsector's.
- **Country code**: keep `PD` or use the country's own ISO code. It determines whether the country
  automatically receives upstream content corrections
  ([details in phase 2](./02-seed-content.md#upfront-decision-keep-the-pd-code-or-use-your-own)).

## Platform roles

The platform has two independent role dimensions. The national team must assign specific people to
the system roles before launch.

| Role                               | Dimension    | Who holds it in a country               | What it does                                                                     |
| ---------------------------------- | ------------ | --------------------------------------- | -------------------------------------------------------------------------------- |
| `SUPERADMIN`                       | System       | 1–2 people from the authority           | Everything, including changing other users' roles                                |
| `ADMIN`                            | System       | Review team and methodology team        | Reviews submissions, blocks organizations, maintains the catalogue (maintainers) |
| `USER`                             | System       | Anyone who signs in                     | Default role                                                                     |
| `ADMIN` / `CONTRIBUTOR` / `VIEWER` | Organization | People from each company or public body | Manage, edit or view their organization's footprint                              |

The platform requires at least one `SUPERADMIN` at all times and prevents anyone from changing
their own role. "Maintainers" in this guide are system `ADMIN` users who work on the methodology
catalogue.

## Budget and staffing

This guide gives no cost figures: they depend on the path chosen in decision 7 and on local prices.
The upstream team's Azure estimate is in
[`infra cost estimation.pdf`](<../infra cost estimation.pdf>), and the sizing assumptions behind it
(a production baseline of about 200 daily active users) are in
[`app-usage-assumptions.md`](../infrastructure/app-usage-assumptions.md).

Budget people as well as infrastructure. A national deployment needs these roles; one person can
hold several in a small country:

| Role                   | During rollout                                      | In operation                                                                         |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Methodology specialist | Builds the catalogue and the guides (phase 2)       | Yearly factor load, catalogue corrections, methodological questions                  |
| Reviewer               | Tests the review flow                               | Reviews accreditation and verification submissions (and measurements under `MANUAL`) |
| Developer              | Seed validation, configuration, builds (phases 2–4) | Upstream releases, fixes, SQL-only changes                                           |
| System administrator   | Provisions infrastructure (phase 4)                 | Backups, monitoring, patching, identity provider                                     |
| Help desk              | Supports the pilot                                  | Answers organizations on the support address                                         |

## Lesson from previous deployments

Decision 7 must be closed early and with a confirmed budget. Assuming cloud hosting and discovering
later that there is no subscription or payment method stalls login and file storage for weeks.
On-premise deployment on the country's existing PostgreSQL works and is covered in
[phase 4](./04-infrastructure.md).

---

← [Back to index](./README.md) · Next: [2. Seed content](./02-seed-content.md) →
