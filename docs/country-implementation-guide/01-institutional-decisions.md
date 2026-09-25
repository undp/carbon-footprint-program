# 1. Institutional decisions

Before touching a single file, the country makes 10 decisions that shape everything else. Several
cannot be changed later without redoing data, so they are best closed in writing with the
environmental authority and recorded in minutes.

← [Back to index](./README.md) · Next: [2. Seed content](./02-seed-content.md) →

---

## The 10 decisions

| #   | Decision                                | Options                                                                                       | Where it lands                                                                                  |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Operator and data controller            | Ministry, attached agency, international organization acting on the country's behalf          | Privacy notice, mandatory contacts ([phase 5](./05-validation-and-go-live.md)), cloud contracts |
| 2   | National methodological framework       | GHG Protocol, ISO 14064-1, an existing national footprint program                             | Category structure, names, badges                                                               |
| 3   | Official source of emission factors     | National GHG inventory, official grid factor, IPCC 2006/2019, DEFRA as fallback               | The whole factor catalogue ([phase 2](./02-seed-content.md))                                    |
| 4   | Who maintains the methodology over time | Ministry technical team, consultancy, academia                                                | Catalogue admin users; yearly factor update cycle                                               |
| 5   | Measurement recognition                 | Automatic, manual review or hidden                                                            | `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` parameter and reviewer workload           |
| 6   | Badges awarded                          | Measurement, verification, reduction, neutralization; own names and artwork                   | Seed badges and the badges screen                                                               |
| 7   | Where the platform runs                 | Azure cloud (Bicep included) or on-premise with Docker Compose, even without internet access  | All of [phase 4](./04-infrastructure.md)                                                        |
| 8   | Identity provider (login)               | Self-hosted Keycloak, Entra External ID, or another OIDC provider the government already uses | [Phase 4](./04-infrastructure.md); who administers accounts                                     |
| 9   | AI assistant (chatbot)                  | Enabled with Azure OpenAI, or disabled (`CHATBOT_ENABLED=false`, the default)                 | Cost, data residency, document corpus                                                           |
| 10  | First administrators                    | Names of the initial `SUPERADMIN` and `ADMIN` users                                           | First-user creation ([phase 4](./04-infrastructure.md))                                         |

Two more decisions are made while preparing the seed, but it pays to anticipate them here:

- **Subcategory recommendation mode** (`SUBCATEGORY_RECOMMENDATION_MODE`): `UNION` combines sector
  and subsector recommendations; `SPECIFIC` shows only the subsector's.
- **Country code**: keep `PD` or use the country's own ISO code. It determines whether the country
  automatically receives upstream content corrections
  ([details in phase 2](./02-seed-content.md#upfront-decision-keep-the-pd-code-or-use-your-own)).

## Platform roles

The platform has two independent role dimensions. The national team must assign specific people to
the system roles before launch.

| Role                               | Dimension    | Who holds it in a country               | What it does                                                       |
| ---------------------------------- | ------------ | --------------------------------------- | ------------------------------------------------------------------ |
| `SUPERADMIN`                       | System       | 1–2 people from the authority           | Everything, including changing other users' roles                  |
| `ADMIN`                            | System       | Review team and methodology team        | Reviews submissions, blocks organizations, maintains the catalogue |
| `USER`                             | System       | Anyone who signs in                     | Default role                                                       |
| `ADMIN` / `CONTRIBUTOR` / `VIEWER` | Organization | People from each company or public body | Manage, edit or view their organization's footprint                |

The platform requires at least one `SUPERADMIN` at all times and prevents anyone from changing
their own role. Details in [`../security/rbac.md`](../security/rbac.md).

## Lesson from previous deployments

Decision 7 must be closed early and with a confirmed budget. Assuming cloud hosting and discovering
later that there is no subscription or payment method stalls login and file storage for weeks.
On-premise deployment on the country's existing PostgreSQL works and is documented in
[`../operations/production-deployment.md`](../operations/production-deployment.md).

---

← [Back to index](./README.md) · Next: [2. Seed content](./02-seed-content.md) →
