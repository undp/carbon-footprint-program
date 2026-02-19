# Organization Lifecycle and States

This document details the behavior of the fields defined in `CommonOrganizationFieldsSchema` across the different states of the accreditation flow.

## Reference Fields (`CommonOrganizationFieldsSchema`)

- **`status`**: Public/administrative state (`ACCREDITED`, `NOT_ACCREDITED`, `BLOCKED`).
- **`lastSubmissionStatus`**: Status of the last submission linked to the active data (`PENDING`, `APPROVED`, `REJECTED`, or `null`).
- **`hasUnsubmittedChanges`**: Indicates if there is a draft (`OrganizationData` active without submission) more recent than the accredited or submitted version.
- **`isEditable` (Logical Flag)**: Determines if the user can modify the information in the current state.

---

## States and Flows Matrix

### 1. Newly Created (Initial Draft)

The organization exists but has never been submitted for review.

- **`status`**: `NOT_ACCREDITED`
- **`lastSubmissionStatus`**: `null`
- **`hasUnsubmittedChanges`**: `true`
- **`isEditable`**: `true` (The user is completing the initial profile).
- **`Displayed Data`**: Display the just created organization data.

### 2. Pending Approval (Under Review)

The user submitted the information and is waiting for the administrator's response.

- **`status`**: `NOT_ACCREDITED`
- **`lastSubmissionStatus`**: `PENDING`
- **`hasUnsubmittedChanges`**: `false`
- **`isEditable`**: `false` (Locked while under review to prevent inconsistent changes).
- **`Displayed Data`**: Display the organization data that is under review.

### 3. Approved (Accredited)

The administrator approved the submission. The organization is officially accredited.

- **`status`**: `ACCREDITED`
- **`lastSubmissionStatus`**: `APPROVED`
- **`hasUnsubmittedChanges`**: `false`
- **`isEditable`**: `true` (Editing creates a new draft/version).
- **`Displayed Data`**: Display the organization data that is accredited.

### ~~4. Approved + Pending Changes (Approved + Draft)~~

**NOT IMPLEMENTED**
_This state is currently bypassed by the system as edits to accredited organizations trigger an immediate submission._

An accredited organization that has been edited but the changes have not been submitted.

- **`status`**: `ACCREDITED` (Maintains accreditation based on the previous version).
- **`lastSubmissionStatus`**: `APPROVED` (Refers to the current official version).
- **`hasUnsubmittedChanges`**: `true` (A new `OrganizationData` exists without submission).
- **`isEditable`**: `true`.
- **`Displayed Data`**: Display the draft organization data.

### 5. Approved + New Submission (Approved + Pending Re-accreditation)

Changes to an already accredited organization were submitted for a new review.

- **`status`**: `ACCREDITED` (Still accredited by the previous version).
- **`lastSubmissionStatus`**: `PENDING` (The new version is under review).
- **`hasUnsubmittedChanges`**: `false`.
- **`isEditable`**: `false` (The new version is locked until the admin decides).
- **`Displayed Data`**: Display the organization data that is under review.

### 6. Rejected (Initial)

The administrator rejected the initial submission. The rejected data stays `ACTIVE` (visible but not editable) until a new submission replaces it.

- **`status`**: `NOT_ACCREDITED`
- **`lastSubmissionStatus`**: `REJECTED`
- **`hasUnsubmittedChanges`**: `false` (The rejected data is not editable anymore).
- **`isEditable`**: `true`.
- **`Displayed Data`**: Display the rejected organization data.

### 7. Approved + Re-accreditation Rejected

The administrator rejected the changes submitted for an organization that was already accredited. The rejected version stays `ACTIVE` (visible but not editable) until a new submission replaces it. The previous approved version remains the official one.

- **`status`**: `ACCREDITED` (Still accredited by the previous approved version).
- **`lastSubmissionStatus`**: `REJECTED` (Refers to the last attempted submission).
- **`hasUnsubmittedChanges`**: `false` (A new draft is generated just when the user submits a new version, and this new version is submitted inmediately for now).
- **`isEditable`**: `true`.
- **`Displayed Data`**: Display the approved organization data.

### 8. Re-accreditation Approved

The administrator approves a new version of the data. The previous version (which was `APPROVED`) becomes `OUTDATED`, and the new version becomes the official one.

- **`status`**: `ACCREDITED`
- **`lastSubmissionStatus`**: `APPROVED`
- **`hasUnsubmittedChanges`**: `false`
- **`isEditable`**: `true`.
- **`Displayed Data`**: Display the organization data that is accredited.

### 9. Blocked

Manual administrative action independent of accreditation.

- **`status`**: `BLOCKED`
- **`lastSubmissionStatus`**: (Depends on previous state, e.g., `APPROVED`).
- **`hasUnsubmittedChanges`**: (Depends on whether there were drafts).
- **`isEditable`**: `false` (A blocked organization cannot operate or be edited until unblocked).
- **`Displayed Data`**: Display the organization data based on priority display order (PENDING > DRAFT > APPROVED > REJECTED).

---

## Logical Summary for Implementation

| Case                    | `status`         | `lastSubmissionStatus` | `hasUnsubmittedChanges` | `isEditable` |
| :---------------------- | :--------------- | :--------------------- | :---------------------- | :----------- |
| **New Draft**           | `NOT_ACCREDITED` | `null`                 | `true`                  | `true`       |
| **Under Review**        | `NOT_ACCREDITED` | `PENDING`              | `false`                 | `false`      |
| **Accredited**          | `ACCREDITED`     | `APPROVED`             | `false`                 | `true`       |
| **Re-accreditation**    | `ACCREDITED`     | `PENDING`              | `false`                 | `false`      |
| **Re-accred. Approved** | `ACCREDITED`     | `APPROVED`             | `false`                 | `true`       |
| **Re-accred. Rejected** | `ACCREDITED`     | `REJECTED`             | `false`                 | `true`       |
| **Rejected (Initial)**  | `NOT_ACCREDITED` | `REJECTED`             | `false`                 | `true`       |
| **Blocked**             | `BLOCKED`        | Any                    | Any                     | `false`      |

---

_Note: Accreditation is a derived state. An organization is considered accredited if there exists at least one `OrganizationData` version with `ACTIVE` status that has an `APPROVED` submission._
