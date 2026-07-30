# Platform Admin Operations Guide

This guide describes how platform administrators use the admin-only features of Huella Latam: reviewing and actioning the submission queue, managing organizations, and understanding the data that drives the admin dashboard.

---

## Access Requirements

Admin features are accessible to users with the `ADMIN` or `SUPERADMIN` system role. These roles are assigned directly in the database (or via the seed scripts during initial setup). A user with only an organization-level role (`VIEWER`, `CONTRIBUTOR`, `ADMIN`) cannot access admin routes.

The admin interface is accessible from the **Maintainer** section of the web application. All admin API routes are prefixed with `/admin/`.

---

## Submission Queue (`/admin/requests`)

### Overview

The submission queue is the central workspace for platform admins. Every time an organization submits (or re-submits) a request — for accreditation, carbon inventory calculation or verification, or reduction project verification — a record appears in this queue.

The queue shows only the **most recent submission per subject**: if an organization re-submits after a `REVIEWED` decision, the older submission is no longer surfaced.

### KPI cards

The top of the page displays aggregated counts:

| KPI               | Description                                         |
| ----------------- | --------------------------------------------------- |
| Total             | All submissions in the system                       |
| Pending           | Awaiting admin action                               |
| Approved          | Approved by an admin                                |
| With Observations | Sent back with review comments (status: `REVIEWED`) |
| Rejected          | Definitively rejected                               |

The KPI data comes from `GET /admin/requests/kpis`, broken down by submission type and status.

### Queue columns

| Column            | Description                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Organization Name | The organization that submitted                                                                                                    |
| Type              | `ORGANIZATION_ACCREDITATION`, `CARBON_INVENTORY_CALCULATION`, `CARBON_INVENTORY_VERIFICATION`, or `REDUCTION_PROJECT_VERIFICATION` |
| Period            | The year the submission relates to (inventory year for carbon submissions; organization creation year for accreditation)           |
| Status            | `PENDING`, `APPROVED`, `REVIEWED`, or `REJECTED`                                                                                   |
| Date Submitted    | When the submission was created                                                                                                    |
| Actions           | View or Edit button depending on status                                                                                            |

The table supports sorting by column and pagination (10 / 25 / 50 / 100 rows per page).

### Submission types

| Type                             | What is submitted                                 | Next step when approved                                                 |
| -------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `ORGANIZATION_ACCREDITATION`     | Organization profile data                         | Organization receives accreditation badge; `isAccredited` set to `true` |
| `CARBON_INVENTORY_CALCULATION`   | Carbon inventory (self-declared emissions)        | Calculation badge issued; organization may proceed to verification      |
| `CARBON_INVENTORY_VERIFICATION`  | Carbon inventory (verified by external certifier) | Verification badge issued                                               |
| `REDUCTION_PROJECT_VERIFICATION` | Reduction project claim                           | Verification badge issued                                               |

> **Note:** The `CARBON_INVENTORY_CALCULATION` type may be hidden from the queue depending on the `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` system parameter. When set to `HIDDEN`, only verification submissions appear. See [System Parameters Reference](../development/system-parameters.md).

---

## Reviewing a Submission

Open a submission from the queue to see its full detail view, including:

- Submitted organization data or inventory/project fields
- Any documents uploaded by the organization (viewed via temporary SAS URLs)
- Previous review history (if the submission was previously `REVIEWED` and re-submitted)
- Identity conflict warnings, for organization accreditations (see below)

### Identity Conflict Warnings

**API:** `GET /admin/submissions/:id/warnings`

For an `ORGANIZATION_ACCREDITATION` submission, the review dialog shows a **"Conflictos detectados"** section when the applicant's identity collides with another organization. Matching is field-to-same-field (`legalName`, `tradeName`, `taxId`), exact, case-insensitive and trimmed on both sides; null fields are skipped. There is no fuzzy matching and no country-specific tax-id normalization, so the same tax id written in two formats (`76.123.456-7` vs `761234567`) does not match.

The warnings are **referential only** — the section states so explicitly, and the request can be approved with conflicts outstanding. Branches (_sedes_) of the same real organization share identity values by nature, so they surface here as awareness signals rather than errors.

Conflicts are listed flat and numbered ("Conflicto 1", "Conflicto 2") in the order the endpoint returns them, which puts collisions against an approved submission first. The collapsed row is only the handle; expanding it shows a side-by-side comparison (this submission vs. the conflicting organization) whose rows carry two facts that must not be confused:

| Row                         | Fact                                      | Values                                                                                                     |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Estado de la postulación"  | Status of the **submission** on each side | Aprobada (`collisionState = APPROVED`, compared against the **approved** snapshot) / Pendiente (`PENDING`) |
| "Estado de la organización" | Standing of each **organization** itself  | Inscrita / No Inscrita (`metadata.organizationIsAccredited`, and the same flag for the applicant)          |

A pending collision does **not** imply the other organization is new: it may be a first-time applicant or an already-inscribed organization editing its data — and the same is true of the applicant, which is why both sides report their own standing. That separation is also why the warning message says, for example, "Coincide con la postulación pendiente de la organización inscrita (RUT …) en razón social".

Below the two status rows the comparison lists the three identity fields, with the colliding one(s) highlighted. Both columns come from the endpoint's payload, which is the only surface that exposes an organization's approved snapshot: every other admin view reads `OrganizationSummaryView`, which ranks a pending edit above the approved data.

### Approving

**API:** `POST /admin/requests/:id/approve`

**Body:**

```json
{
  "reviewComments": "Optional comments visible to the organization.",
  "reviewFileUuids": ["uuid-of-review-document"],
  "recognitionFileUuids": ["uuid-of-recognition-certificate"]
}
```

**What happens:**

1. Submission status changes from `PENDING` to `APPROVED`.
2. The active badge matching the submission type is assigned to the submission.
3. Any attached recognition files (e.g., certificates) are linked.
4. The reviewer's identity and timestamp are recorded.

After approval, the organization's display status updates immediately — no caching is involved.

**Badge assignment:** A badge record must exist for the submission type (seeded during setup). If no active badge is found, the approval fails with a 422 error.

---

### Sending Back with Observations (Review)

**API:** `POST /admin/requests/:id/review`

**Body:**

```json
{
  "reviewComments": "Please correct the fuel quantity for subcategory X. The figure appears to be in kg but the unit selected is liters.",
  "reviewFileUuids": ["uuid-of-annotated-document"]
}
```

`reviewComments` is **required** when sending back with observations — an admin must explain what needs to be corrected.

**What happens:**

1. Submission status changes from `PENDING` to `REVIEWED`.
2. The review comments and any attached files are recorded.
3. The organization's inventory or project becomes **editable again**.
4. When the organization re-submits, a **new** `PENDING` submission is created. The previous `REVIEWED` submission remains in history.

The organization's display status on the `REVIEWED` submission reflects the admin's comments, which they can read before making corrections.

---

### Rejecting

**API:** `POST /admin/requests/:id/reject`

**Body:**

```json
{
  "reviewComments": "Optional rejection reason.",
  "reviewFileUuids": []
}
```

**What happens:**

1. Submission status changes from `PENDING` to `REJECTED`.
2. `reviewComments` are optional but recommended.
3. For carbon inventories: the organization may create a new inventory and re-submit from scratch.
4. For reduction projects: the project cannot be re-submitted; a new project must be created.

Rejection is permanent — a rejected submission cannot be reopened.

---

## Organization Management (`/admin/organizations`)

### Overview

The organizations list shows all organizations registered on the platform with their current operational status and carbon measurement activity.

### KPI cards

The KPI summary breaks down organizations by:

- **Status** (`ACTIVE` / `BLOCKED`)
- **Accreditation** (whether `isAccredited = true`)
- **Carbon inventory presence** (whether at least one carbon inventory exists)

### Organizations table

| Column            | Description                                    |
| ----------------- | ---------------------------------------------- |
| Organization Name | Legal or registered name                       |
| Sector            | Economic sector                                |
| Tax ID            | Tax identifier (RUT / RUC / ID Tributario)     |
| Size              | Organization size category                     |
| Status            | Derived from accreditation and inventory state |
| Last Measurement  | Date of the most recent carbon inventory       |
| Total Emissions   | Aggregate tCO₂e across all inventories         |
| Actions           | View, Edit, Block, or Unblock                  |

Sorting and filtering are client-side over the full list. The search box matches organization name, tax ID, sector, size and status. The subsector is still returned by the API but is no longer displayed as a column.

---

### Blocking an Organization

**API:** `POST /admin/organizations/:id/block`

Sets the organization's status to `BLOCKED`. A blocked organization:

- Cannot create new submissions
- Does not appear in the transparency portal (even if previously accredited)
- Retains all existing data

Use blocking to suspend an organization for compliance or data-quality reasons without deleting their records.

---

### Unblocking an Organization

**API:** `POST /admin/organizations/:id/unblock`

Sets the organization's status back to `ACTIVE`. If the organization was previously accredited, it reappears in the transparency portal immediately.

---

## API Reference

All admin routes require `ADMIN` or `SUPERADMIN` system role. All responses follow the standard API shape — see [API Design Conventions](../development/api-conventions.md).

### Requests

| Method | Path                          | Description                                    |
| ------ | ----------------------------- | ---------------------------------------------- |
| `GET`  | `/admin/requests`             | List all submissions (most recent per subject) |
| `GET`  | `/admin/requests/kpis`        | Count breakdown by type and status             |
| `POST` | `/admin/requests/:id/approve` | Approve a pending submission                   |
| `POST` | `/admin/requests/:id/review`  | Return with observations                       |
| `POST` | `/admin/requests/:id/reject`  | Reject a submission                            |

### Submissions

| Method | Path                              | Description                                                |
| ------ | --------------------------------- | ---------------------------------------------------------- |
| `GET`  | `/admin/submissions/:id/warnings` | Warnings computed for a submission, dispatched by its type |

### Organizations

| Method | Path                               | Description                                        |
| ------ | ---------------------------------- | -------------------------------------------------- |
| `GET`  | `/admin/organizations`             | List all organizations with pagination and filters |
| `GET`  | `/admin/organizations/kpis`        | Organization count breakdown                       |
| `POST` | `/admin/organizations/:id/block`   | Block an organization                              |
| `POST` | `/admin/organizations/:id/unblock` | Unblock an organization                            |

---

## File Attachments in Submissions

Admins can attach files to their review decision (review files and recognition certificate files). These files must be uploaded first via `POST /files` and then referenced by their UUID in the approval/review/rejection request body.

Files attached to a submission are stored in Azure Blob Storage and are accessible only through the API's `GET /files/:uuid/download` endpoint (which generates a temporary SAS URL). They are never publicly accessible.

See [File Storage](../infrastructure/FileStorage.md) for the upload flow.

---

## Automatic Approval

Some submission types can be configured for automatic approval via the `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` system parameter set to `AUTOMATIC`. When a carbon inventory calculation submission is automatically approved, it receives `status = APPROVED_AUTOMATICALLY`. These submissions are excluded from the KPI counts and from the pending queue — they do not require admin action.

See [System Parameters Reference](../development/system-parameters.md).

---

## Data Consistency

The admin queue and KPI counts are **live queries** — there is no cache to invalidate. The web app polls for updates at a short interval so the queue stays fresh without requiring a manual page reload.

Submission history is append-only: every submission transition is recorded with the reviewer's identity and timestamp. No submission record is deleted.
