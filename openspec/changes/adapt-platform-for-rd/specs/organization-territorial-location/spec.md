## ADDED Requirements

### Requirement: A single self-referencing territory catalog holds the administrative hierarchy

The system SHALL introduce a `territory` table holding the deployment's administrative subdivisions as a self-referencing hierarchy: each row carries a name, the level it belongs to, and a nullable `parent_id` referencing another territory row. A row whose `parent_id` is `NULL` is a root of the hierarchy.

The table SHALL NOT be scoped per country by a separate level-definition table: the levels of one deployment's hierarchy are fixed by that deployment's seed data.

The hierarchy SHALL be loaded by the migration that creates it, because the seed skips entirely on a database that already holds a country and an already-populated deployment would otherwise never receive the catalog. The seed SHALL remain a second path for a database created without migrations, and SHALL be a no-op when the table already holds rows.

No admin CRUD endpoints and no maintainer screen SHALL be provided for it, because administrative boundaries change by law rather than by administrative action. It SHALL nonetheless be an ordinary catalog table, so that a deployment which later needs to correct it can add a maintainer additively.

#### Scenario: Hierarchy is traversable upward

- **WHEN** a territory row at the deepest level is read
- **THEN** its ancestors up to the root are reachable by following `parent_id`

#### Scenario: No maintainer route exists

- **WHEN** the admin sidebar and route table are inspected
- **THEN** no route or screen exposes create, update, delete or restore over `territory`

### Requirement: An organization references the most specific territory it knows

`organization_data` SHALL carry a nullable `territory_id` referencing `territory`. The organization stores exactly one reference: the most specific node in the hierarchy that the registrant can supply. Ancestor levels SHALL NOT be stored on the organization; they are derived by walking the hierarchy from the referenced node.

Storing one reference per organization rather than one column per level makes an incoherent combination — a municipality that does not belong to the selected province — structurally impossible.

The reference is nullable, and a registrant who knows only an intermediate level SHALL be able to save the organization referencing that intermediate node, consistent with the requirement being qualified "según aplique".

#### Scenario: Registrant supplies every level

- **WHEN** an organization is saved with a selection down to the deepest level
- **THEN** `territory_id` points at that deepest node and every ancestor is derivable from it

#### Scenario: Registrant knows only up to an intermediate level

- **WHEN** an organization is saved having selected a province but no municipality or deeper level
- **THEN** `territory_id` points at the province node and the record is accepted

#### Scenario: Location left unspecified

- **WHEN** an organization is saved without any territorial selection
- **THEN** `territory_id` is `NULL` and no validation error is raised

#### Scenario: Province of an organization is derived, not stored

- **WHEN** an organization's province is reported
- **THEN** it is obtained by walking the hierarchy from `territory_id`, not from a province column on the organization

### Requirement: Territorial selectors are dependent and ordered by level

The organization form SHALL render one selector per level of the hierarchy, in hierarchy order. Each selector SHALL offer only the children of the node selected in the level above it, and SHALL be disabled until that parent selection exists. Clearing a selector MUST clear every selector below it.

#### Scenario: Child selector is scoped by its parent

- **WHEN** a province is selected
- **THEN** the municipality selector offers only municipalities whose `parent_id` is that province

#### Scenario: Clearing a parent clears its descendants

- **WHEN** a province selection is cleared while a municipality was already selected
- **THEN** the municipality selection and every selection below it are cleared

#### Scenario: Deeper selector is disabled without its parent

- **WHEN** the form loads with no province selected
- **THEN** the municipality selector and every deeper selector are disabled

### Requirement: The physical address is a separate free-text field

`organization_data` SHALL retain a free-text address field, independent of the territorial hierarchy, holding the street-level address. The territorial selectors MUST NOT be used to capture street-level detail, and the free-text field MUST NOT be used to capture the administrative subdivisions.

#### Scenario: Address and hierarchy are captured independently

- **WHEN** an organization supplies both a territorial selection and a physical address
- **THEN** both are persisted, the hierarchy in `territory_id` and the street-level detail in the address field

#### Scenario: Address without a territorial selection

- **WHEN** an organization supplies a physical address and no territorial selection
- **THEN** the address is persisted and `territory_id` is `NULL`
