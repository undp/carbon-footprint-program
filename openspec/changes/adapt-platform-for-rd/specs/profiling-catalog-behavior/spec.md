## MODIFIED Requirements

### Requirement: Admin list supports status filter and returns impactedChildren

Each `GET /admin/<domain>` endpoint MUST accept `?status=active|deleted|all`, defaulting to `active`. The server MUST reject any other value with `400`.

Each admin list response MUST include `impactedChildren` per row: the per-reference counts that drive the delete-warning dialog on the frontend, computed inside the same query from the catalog `_count` over the references relevant to the row's domain:

- Sector: active subsectors, active main activities, organization data, subcategory recommendations
- Subsector: active main activities, organization data, subcategory recommendations
- Main activity: organization data
- Organization size: organization data

For sectors and subsectors, the `organization data` count MUST include organizations that reference the row as their **secondary** economic activity (`organization_data.secondary_subsector_id`), in addition to those referencing it as their primary activity, per `organization-economic-activity`. Counting only primary references would present an administrator with an understated number in the delete-warning dialog and lead them to confirm a deletion whose real reach is larger than displayed. The dialog surfaces one combined organization count, not one per reference kind, since the consequence for the administrator is identical.

Catalog children MUST be counted ACTIVE-only — a `status = 'DELETED'` child never participates, since the parent has already broken the relationship. Carbon-inventory snapshots (`carbon_inventory.organizationData`) are deliberately NOT counted here: soft-deleting a catalog row never affects a frozen huella, so it is not surfaced in the delete-warning dialog.

#### Scenario: Default filter hides DELETED

- **WHEN** an ADMIN calls `GET /admin/<domain>` without a `status` query
- **THEN** the response contains only rows with `status = 'ACTIVE'`

#### Scenario: status=all returns both

- **WHEN** an ADMIN calls `GET /admin/<domain>?status=all`
- **THEN** the response includes both ACTIVE and DELETED rows, each carrying its current `status`

#### Scenario: Invalid status value rejected

- **WHEN** a client calls `GET /admin/<domain>?status=purged`
- **THEN** the response is `400` with a Zod validation error

#### Scenario: impactedChildren counts ACTIVE catalog children only

- **WHEN** an ADMIN lists a domain whose target row has one ACTIVE and one DELETED catalog child of the same kind
- **THEN** the row's `impactedChildren` count for that kind includes only the ACTIVE child

#### Scenario: Secondary-activity references are counted

- **WHEN** an ADMIN lists subsectors and one row is referenced by two organizations as their primary activity and by three others as their secondary activity
- **THEN** that row's `impactedChildren` organization count is five

#### Scenario: One organization referencing a row twice is counted once

- **WHEN** an organization references the same subsector as both its primary and its secondary activity
- **THEN** that row's `impactedChildren` organization count includes that organization once
