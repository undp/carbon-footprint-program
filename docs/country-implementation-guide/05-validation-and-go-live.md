# 5. Validation and go-live

The platform goes live when a pilot of 3–5 real organizations completes a footprint end to end and
the legal contacts are published. We estimate 3–4 weeks, including training.

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →

---

## Seed validation (before seeding production)

- [ ] `pnpm db:restore` locally or in staging runs without `No subcategory match` warnings or
      missing-unit errors.
- [ ] Every subcategory has its guide, and the example ends at the "Cantidad" (quantity) value.
- [ ] A GHG specialist recomputes one line per subcategory by hand and the result matches the
      platform.
- [ ] The grid electricity factor, the main fuels and waste are national and cite source and year.
- [ ] Sector recommendations show sensible subcategories for 3 test sectors.
- [ ] No CLP amounts or "País Demo" references remain in visible texts.

## Functional validation (in staging)

- [ ] Sign-up and sign-in with the country's identity provider, including password recovery.
- [ ] Create an organization, invite members and assign organization roles.
- [ ] Complete a footprint, attach evidence and download the ZIP with summary and methodology.
- [ ] Apply for recognition, then approve, send back and reject from `/admin/requests`
      ([admin guide](../operations/admin-guide.md)).
- [ ] Create a reduction project and a neutralization plan.
- [ ] Review the public transparency screen and the institutional pages.
- [ ] If the chatbot is enabled: ingest the corpus
      ([runbook](../operations/runbook.md#chatbot-corpus-ingestion-and-activation)) and test
      questions about the national methodology.

## Obligations before the first real user

The operator is the data controller of its instance. Before opening sign-up it must publish and
monitor these contacts
([country-onboarding step 12](../development/country-onboarding.md#step-12--publish-the-deployments-operational-contacts)):

| Contact                         | Receives                                              |
| ------------------------------- | ----------------------------------------------------- |
| Privacy and data-subject rights | Access, correction, deletion and portability requests |
| Data-protection officer         | Whatever national law assigns to the role             |
| Content or abuse reports        | Illegal or prohibited files uploaded to the instance  |
| Child safety                    | Escalation to the country's competent authority       |

It must also set the breach-notification window (reference: 72 hours), personal-data retention and
report response times. See [`PRIVACY.md`](../../PRIVACY.md) and
[`CONTENT_MODERATION.md`](../../CONTENT_MODERATION.md).

## Pilot, training and operations

1. **Closed pilot** with 3–5 organizations from different sectors, supported by the methodology
   team.
2. **Training** for three audiences: administrators (submission review, users), maintainers
   (catalogue and factors) and organizations (footprint capture). The manuals in
   [`user_manual/`](../../user_manual/README.md) are a starting point.
3. **Public launch** with the help desk running on the support address
   ([phase 3](./03-configuration-and-branding.md)).
4. **Yearly cycle.** Load the new year's factors in the maintainer before opening the reporting
   season; without them, the year does not appear in the selector.
5. **Release upgrades.** Migrate on every release, re-apply grants and review the `PD` content
   migrations as a changelog of methodology decisions
   ([phase 2](./02-seed-content.md#upfront-decision-keep-the-pd-code-or-use-your-own)).

---

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →
