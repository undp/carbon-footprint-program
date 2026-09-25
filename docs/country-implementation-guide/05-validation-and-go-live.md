# 5. Validation and go-live

The platform goes live when the functional checks pass in staging, the legal contacts are
published, and a closed pilot of 3–5 real organizations completes a footprint end to end in
production. We estimate 3–4 weeks, including training. The seed itself is validated earlier, as the
exit gate of [phase 2](./02-seed-content.md#validation-gate-before-seeding-production).

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →

---

## Functional validation (in staging)

- [ ] Sign-up and sign-in with the country's identity provider, including password recovery by
      email.
- [ ] Create an organization, add members and assign organization roles.
- [ ] Complete a footprint, attach evidence and download the ZIP with summary and methodology.
- [ ] Recognition works as decided in phase 1. With `AUTOMATIC`, self-declaring awards the
      measurement badge at once. With `MANUAL`, approve, send back and reject a submission from
      `/admin/requests` ([admin guide](../operations/admin-guide.md)).
- [ ] Approve, send back and reject a verification submission and a reduction-project submission,
      which always go through admin review.
- [ ] Create a reduction project and a neutralization plan.
- [ ] Review the public transparency screen and the institutional pages.
- [ ] If the chatbot is enabled: ingest the corpus with `pnpm chatbot:ingest-corpus`
      ([runbook](../operations/runbook.md#chatbot-corpus-ingestion-and-activation)) and test
      questions about the national methodology.

## Obligations before the first real user

The operator is the data controller of its instance. Pilot organizations are real users, so these
contacts must be published and monitored **before the pilot starts**:

| Contact                         | Receives                                              |
| ------------------------------- | ----------------------------------------------------- |
| Privacy and data-subject rights | Access, correction, deletion and portability requests |
| Data-protection officer         | Whatever national law assigns to the role             |
| Content or abuse reports        | Illegal or prohibited files uploaded to the instance  |
| Child safety                    | Escalation to the country's competent authority       |

**Where to publish them.** The platform has no dedicated privacy screen. Put them in the terms and
conditions PDF, which the landing page links to (seeded in
[phase 2](./02-seed-content.md#seed-inventory)), and in the public pages, for example "Material
complementario" ([phase 3](./03-configuration-and-branding.md)), or on the operator's own website.

The operator must also set the breach-notification window (reference: 72 hours), personal-data
retention and report response times. See [`PRIVACY.md`](../../PRIVACY.md) and
[`CONTENT_MODERATION.md`](../../CONTENT_MODERATION.md).

## Pilot, training and launch

1. **Closed pilot in production** with 3–5 organizations from different sectors, supported by the
   methodology team.
2. **Training** for three audiences: administrators (submission review, users), maintainers
   (catalogue and factors) and organizations (footprint capture). The manuals in
   [`user_manual/`](../../user_manual/README.md) are a starting point.
3. **Public launch** with the help desk running on the support address
   ([phase 3](./03-configuration-and-branding.md)).

## Yearly cycle

Factors are valid for a single year ([phase 2](./02-seed-content.md#factors-are-per-year)), so
before each reporting season the maintainers load the full set of factors for the new year. Until
the first factor for a year exists, that year does not appear in the selector; subcategories left
without a factor for it offer only custom factors. Corrections to existing factors do not change
footprints already calculated
([phase 2](./02-seed-content.md#factor-corrections-and-past-footprints)).

## Upstream releases

The country branch keeps receiving security fixes and features from upstream. For each release:

1. **Read the release notes and the migrations.** Migrations that match `iso_code = 'PD'` are
   methodology corrections the country does not receive automatically if it uses its own code
   ([phase 2](./02-seed-content.md#upfront-decision-keep-the-pd-code-or-use-your-own)); decide which
   to apply by hand in the maintainer.
2. **Merge the release tag** into the country branch. Conflicts should only appear in the files
   listed in [phase 3](./03-configuration-and-branding.md#keep-country-changes-easy-to-merge) and in
   the seed data.
3. **Rebuild, migrate and deploy** as in the
   [first-deploy sequence](./04-infrastructure.md#first-production-deploy-sequence), skipping the
   seed, which never runs again.
4. **Re-apply grants** only if the database has no default privileges.

The running version is reported by the API health endpoint (`APP_VERSION`); the versioning policy
is in [`versioning.md`](../release/versioning.md).

---

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →
