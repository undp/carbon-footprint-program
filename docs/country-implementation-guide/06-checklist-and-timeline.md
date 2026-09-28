# 6. Master checklist and timeline

With dedicated teams, a country can be live in roughly 12–18 weeks. The critical path is
**1 → 2 → 4B → 5**, and its longest step is the emission factor catalogue, not the infrastructure.
Durations are indicative: each country should adjust them to its teams' availability.

← [5. Validation and go-live](./05-validation-and-go-live.md) · [Index](./README.md)

---

## Timeline by phase

| Phase                                                                                                  | Deliverable that closes it                                                                                | Owner                   | Weeks (indicative)           |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------- |
| [1. Institutional decisions](./01-institutional-decisions.md)                                          | Minutes with the 10 decisions and the administrators' names                                               | Environmental authority | 1–2                          |
| [2. Seed content](./02-seed-content.md)                                                                | Country seed on its branch, passing the validation gate                                                   | Methodology team        | 6–10                         |
| [3. Configuration and branding](./03-configuration-and-branding.md)                                    | Partners, logos, public pages, locale, tax identifier and email addresses in the branch                   | Content + developer     | 1–2 (parallel with 2 and 4A) |
| [4A. Provision infrastructure](./04-infrastructure.md)                                                 | Servers or subscription, database, file store, IdP and backups ready; staging deployed                    | National IT             | 2–4 (parallel with 2 and 3)  |
| [4B. Staging check and first production deploy](./04-infrastructure.md#staging-gate-before-production) | Staging gate passed; production built, migrated and seeded; first `SUPERADMIN` and administrators created | National IT + developer | ~2 (after 2, 3 and 4A)       |
| [5. Validation and go-live](./05-validation-and-go-live.md)                                            | Legal contacts confirmed, pilot completed, training delivered, public launch                              | Authority + methodology | 3–4                          |

Critical path: 1–2 + 6–10 + ~2 + 3–4 = 12–18 weeks.

## Master checklist

### Phase 1 — Institutional decisions

- [ ] Operator and data controller defined.
- [ ] Methodological framework and official factor source agreed.
- [ ] Team responsible for maintaining the methodology appointed.
- [ ] Recognition mode and badges decided; recommendation mode and country code anticipated.
- [ ] Infrastructure path and data residency decided, with a confirmed budget.
- [ ] Identity provider chosen.
- [ ] Chatbot enabled or disabled.
- [ ] Two `SUPERADMIN` users and the initial system `ADMIN` users named.
- [ ] AGPL-3.0 obligations and use of the name reviewed by legal.
- [ ] Decision on importing history from a previous program.
- [ ] A developer assigned for phases 2 to 4.

### Phase 2 — Seed content

- [ ] Country code decided (`PD` or own) and `countries.json` updated.
- [ ] National factors loaded for every reporting year, with source and year; official grid
      electricity factor.
- [ ] Category and subcategory structure fitted to the national framework.
- [ ] 30 subcategory guides and 3 category guides localized.
- [ ] 35 screen help texts reviewed.
- [ ] Sectors, subsectors, recommendations and main activities aligned with the national
      classification.
- [ ] Organization sizes and job positions adjusted.
- [ ] Reduction initiatives adapted.
- [ ] Official badges, and terms and conditions including the legal contacts.
- [ ] System parameters configured.
- [ ] Chatbot corpus completed (if applicable).
- [ ] Validation gate passed.

### Phase 3 — Configuration and branding

- [ ] Partners, logos and institutional colors.
- [ ] Landing-page demo notice removed or replaced.
- [ ] "Sobre la iniciativa", "Material complementario" and "Agradecimientos" pages.
- [ ] Support email, locale and tax identifier.
- [ ] Year windows reviewed.

### Phase 4A — Provision infrastructure

- [ ] Server or subscription, database with pgvector, file store, IdP with SMTP provisioned.
- [ ] Database users and default privileges configured.
- [ ] Backups configured and a restore tested.
- [ ] Staging with its own database, bucket and OIDC client.
- [ ] Staging deployed.

### Phase 4B — Staging check and first production deploy

- [ ] Images built from the final country branch.
- [ ] Staging re-seeded with the final seed and staging gate passed.
- [ ] Production migrated and seeded once.
- [ ] First `SUPERADMIN` and administrators created.

### Phase 5 — Validation and go-live

- [ ] Legal contacts confirmed as published and monitored.
- [ ] Procedure for data-subject requests, with a named developer.
- [ ] How reviewers tell organizations about outcomes agreed; identity checks for accreditation defined.
- [ ] Pilot completed in production.
- [ ] Training delivered to the three audiences.
- [ ] Public launch with the help desk running.

---

← [5. Validation and go-live](./05-validation-and-go-live.md) · [Index](./README.md)
