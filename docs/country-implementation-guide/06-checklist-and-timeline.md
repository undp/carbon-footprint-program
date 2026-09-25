# 6. Master checklist and timeline

With dedicated teams, a country can be live in 12–16 weeks. The critical path is the emission
factor catalogue, not the infrastructure. Durations are indicative: each country should adjust them
to its teams' availability.

← [5. Validation and go-live](./05-validation-and-go-live.md) · [Index](./README.md)

---

## Timeline by phase

| Phase                                                               | Deliverable that closes it                                                                  | Owner                   | Weeks (indicative) |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- | ------------------ |
| [1. Institutional decisions](./01-institutional-decisions.md)       | Minutes with the 10 decisions and the administrators' names                                 | Environmental authority | 1–2                |
| [2. Seed content](./02-seed-content.md)                             | Country branch with the 15 files and ~70 texts reviewed; `pnpm db:restore` with no warnings | Methodology team        | 6–10               |
| [3. Configuration and branding](./03-configuration-and-branding.md) | Partners, logos, public pages, locale, tax identifier and email addresses                   | Content + IT            | 1–2 (in parallel)  |
| [4. Infrastructure](./04-infrastructure.md)                         | Staging and production up; migration and seed applied; first `SUPERADMIN`                   | National IT             | 2–4 (in parallel)  |
| [5. Validation and go-live](./05-validation-and-go-live.md)         | Pilot completed, legal contacts published, training delivered                               | Authority + methodology | 3–4                |

## Master checklist

### Phase 1 — Institutional decisions

- [ ] Operator and data controller defined.
- [ ] Methodological framework and official factor source agreed.
- [ ] Team responsible for maintaining the methodology appointed.
- [ ] Recognition mode, badges and recommendation mode decided.
- [ ] Infrastructure path with a confirmed budget.
- [ ] Identity provider chosen.
- [ ] Chatbot enabled or disabled.
- [ ] Initial `SUPERADMIN` and `ADMIN` users named.

### Phase 2 — Seed content

- [ ] Country code decided (`PD` or own) and `countries.json` updated.
- [ ] National factors loaded, with source and year; official grid electricity factor.
- [ ] Category and subcategory structure fitted to the national framework.
- [ ] 30 subcategory guides and 3 category guides localized.
- [ ] 35 screen help texts reviewed.
- [ ] Sectors, subsectors, recommendations and main activities aligned with the national
      classification.
- [ ] Organization sizes and job positions adjusted.
- [ ] Reduction initiatives adapted.
- [ ] Official badges and terms and conditions.
- [ ] System parameters configured.
- [ ] Chatbot corpus completed (if applicable).

### Phase 3 — Configuration and branding

- [ ] Partners, logos and institutional colors.
- [ ] Landing-page demo notice removed or replaced.
- [ ] "Sobre la iniciativa", "Material complementario" and "Agradecimientos" pages.
- [ ] Support email, locale and tax identifier.
- [ ] Year windows reviewed.

### Phase 4 — Infrastructure

- [ ] Server or subscription, database with pgvector, file store and IdP provisioned.
- [ ] Database users and default privileges configured.
- [ ] Images built from the country branch.
- [ ] Migration and seed applied in staging and production.
- [ ] First `SUPERADMIN` created.

### Phase 5 — Validation and go-live

- [ ] Seed validation and functional validation passed.
- [ ] Legal contacts published and monitored.
- [ ] Pilot completed.
- [ ] Training delivered to the three audiences.
- [ ] Public launch with the help desk running.

---

← [5. Validation and go-live](./05-validation-and-go-live.md) · [Index](./README.md)
