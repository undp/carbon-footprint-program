# 5. Validation and go-live

The platform goes live when the legal contacts are confirmed as published and a closed pilot of
3–5 real organizations completes a footprint end to end in production. We estimate 3–4 weeks,
including training. The checks happen earlier: the seed at the end of
[phase 2](./02-seed-content.md#validation-gate-before-seeding-production), and the functional
checks in staging in [phase 4B](./04-infrastructure.md#staging-gate-before-production).

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →

---

## Obligations before the first real user

The operator is the data controller of its instance. Pilot organizations are real users, so these
contacts must be published and monitored **before the pilot starts**:

| Contact                         | Receives                                              |
| ------------------------------- | ----------------------------------------------------- |
| Privacy and data-subject rights | Access, correction, deletion and portability requests |
| Data-protection officer         | Whatever national law assigns to the role             |
| Content or abuse reports        | Illegal or prohibited files uploaded to the instance  |
| Child safety                    | Escalation to the country's competent authority       |

**Where to publish them.** The platform has no dedicated privacy screen. The contacts are written
into the terms and conditions PDF during [phase 2](./02-seed-content.md#seed-inventory), because
that PDF is seeded with production and the landing page links to it. They can also go on the
"Sobre la iniciativa" page ([phase 3](./03-configuration-and-branding.md)) or the operator's own
website. Before the pilot, confirm they are visible and that someone monitors each one.

The operator must also set the breach-notification window (reference: 72 hours), personal-data
retention and report response times. See [`PRIVACY.md`](../../PRIVACY.md) and
[`CONTENT_MODERATION.md`](../../CONTENT_MODERATION.md).

### What the public transparency screen publishes

The transparency screen is public, with no sign-in. It lists every **accredited, active**
organization that has at least one approved recognition for a year, showing:

- the organization's name, sector and subsector;
- the footprint year;
- which recognitions it holds (accreditation, measurement, verification, reduction project).

It never shows emission figures, footprint details, organization size, tax IDs, representatives'
contact data, review comments or uploaded files. There is no per-organization opt-out: an
organization enters the list by requesting accreditation, and leaves it only if an admin blocks it.
The terms and conditions must therefore tell organizations, before they apply for accreditation,
that their name and recognitions will be published. Legal should confirm this basis under national
law.

### Personal data and data-subject requests

The platform stores this personal data:

| Where                 | Data                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| User accounts         | Email, first and last name, identity-provider subject; no passwords (the IdP holds them)       |
| Organization profiles | Legal and trade name, tax ID, address; the representative's full name, tax ID, phone and email |
| Activity records      | Who created or updated each footprint, submission and project                                  |
| Logs                  | May contain user IDs or emails in error traces                                                 |

There is no self-service or automated deletion, export or anonymization. Access, correction,
deletion and portability requests are fulfilled by a developer with direct database access, so the
privacy contact needs a documented internal procedure and a named developer behind it. Data stays
where decision 7 put it: in the country on-premise, or in the chosen Azure region.

## Running the review process

- **Organizations are not notified.** The platform sends no email and has no in-app notifications.
  When a reviewer approves, sends back or rejects a submission, the organization only sees it the
  next time it opens the platform (status chips, the submission history and the reviewer's
  comments). Agree how reviewers will tell organizations about outcomes, especially under
  `MANUAL` recognition and for verification requests.
- **Organization identity is checked by people, not the platform.** Anyone can create an
  organization and becomes its organization `ADMIN`. The tax ID is free text: no per-country
  format check and no uniqueness rule. Accreditation is where identity is verified: the
  organization uploads supporting documents and a reviewer checks them. The review screen warns
  when the legal name, trade name or tax ID matches another organization, but only on exact text
  (`76.123.456-7` and `761234567` do not match), so reviewers should also search by hand.
- **Look for custom factors.** Lines whose factor source is "Otro" were not taken from the
  catalogue; ask for their justification before approving
  ([phase 2](./02-seed-content.md#limits-of-the-catalogue-structure)).
- **Staff the queue.** Review time grows with the number of organizations and with `MANUAL`
  recognition; measure it during the pilot and size the review team from that.

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
the first factor for a year exists, that year does not appear in the selector (except in expert
mode, which offers the last five years regardless); subcategories left
without a factor for it offer only custom factors. Corrections to existing factors do not change
footprints already calculated
([phase 2](./02-seed-content.md#factor-corrections-and-past-footprints)).

## Upstream releases

The country branch keeps receiving security fixes and features from upstream. For each release:

1. **Read the release notes and the seed-data changes.** Content corrections land in
   `tools/seed/src/data/base/`, and the seed never runs again, so a country with its own code
   receives none of them automatically
   ([phase 2](./02-seed-content.md#upfront-decision-keep-the-pd-code-or-use-your-own)); decide which
   to apply by hand in the maintainer. The release notes also say when a release needs a one-time
   operation before migrating, such as the
   [migration history reset](../operations/migration-history-reset.md), which rebuilds the database
   and keeps only the users: rehearse it in staging and plan it with the organizations first.
2. **Merge the release tag** into the country branch. Conflicts should only appear in the files
   listed in [phase 3](./03-configuration-and-branding.md#keep-country-changes-easy-to-merge) and in
   the seed data.
3. **Rebuild, migrate and deploy** as in the
   [first-deploy sequence](./04-infrastructure.md#first-production-deploy-sequence), skipping the
   seed, which never runs again.
4. **Re-apply grants** only if the database has no default privileges.

The running version is reported by the API health endpoint (`APP_VERSION`); the versioning policy
is in [`versioning.md`](../release/versioning.md).

### Working with the upstream team

- **Questions and bugs:** open an issue in the upstream GitHub repository
  ([`CONTRIBUTING.md`](../../CONTRIBUTING.md)).
- **Security vulnerabilities:** never in a public issue; use the private reporting route in
  [`SECURITY.md`](../../SECURITY.md). Watch the repository's releases to learn about security
  fixes.
- **Contributing national improvements back:** pull requests are welcome under the same license,
  which also keeps the country branch closer to upstream.
- **Accessibility:** the repository has no accessibility conformance statement. If national rules
  require one (for example WCAG 2.1 AA), audit the deployment before launch.

---

← [4. Infrastructure](./04-infrastructure.md) · [Index](./README.md) · Next: [6. Master checklist and timeline](./06-checklist-and-timeline.md) →
