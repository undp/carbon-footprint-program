## ADDED Requirements

### Requirement: An organization declares a primary and an optional secondary economic activity

`organization_data` SHALL carry a nullable `secondary_subsector_id` referencing `country_subsector`, alongside the existing `sector_id` and `subsector_id`. The existing `subsector_id` represents the organization's **primary** economic activity; `secondary_subsector_id` represents its **secondary** economic activity and is optional.

The secondary activity SHALL be selectable from the full set of ACTIVE subsectors, independent of the sector chosen for the primary activity, because an organization may operate a secondary activity in a different sector.

The secondary activity MUST NOT be introduced as a third catalog level: both activities are selections from the same `country_subsector` catalog.

#### Scenario: Organization registers with only a primary activity

- **WHEN** an organization is saved with a sector and a primary activity and no secondary activity
- **THEN** the record persists with `secondary_subsector_id = NULL` and no validation error is raised

#### Scenario: Secondary activity in a different sector

- **WHEN** an organization whose primary activity belongs to the tourism sector selects a secondary activity belonging to the agriculture sector
- **THEN** the selection is accepted and both activities are persisted

#### Scenario: Deleted subsector is not offered as a secondary activity

- **WHEN** the secondary-activity selector loads its options
- **THEN** only subsectors with `status = 'ACTIVE'` are offered, except for a value already selected on the record being edited, which remains rendered

### Requirement: The secondary activity is selected through a single flat search field

The organization form SHALL offer the secondary activity as one searchable field over all ACTIVE subsectors, each option labelled with its parent sector and its own name, rather than as a second sector-plus-activity pair of selectors.

#### Scenario: Option labels disambiguate same-named activities

- **WHEN** two subsectors in different sectors share a name and the user opens the secondary-activity field
- **THEN** each option is rendered with its parent sector name, so the two are distinguishable

#### Scenario: No second sector selector is rendered

- **WHEN** the organization form renders the secondary-activity field
- **THEN** no additional sector selector is shown for it; the sector selector on the form continues to scope only the primary activity

### Requirement: Soft-deleting a catalog row never rewrites an organization's declared activities

Soft-deleting a `country_subsector` MUST leave `organization_data.subsector_id` and `organization_data.secondary_subsector_id` untouched, consistent with the existing rule that deleting a catalog row never rewrites a country's historical footprint.

#### Scenario: Organization keeps its secondary activity after the catalog row is deleted

- **WHEN** an admin soft-deletes a subsector referenced by an organization as its secondary activity
- **THEN** the organization's `secondary_subsector_id` still points at that row and the value continues to render in the organization's profile
