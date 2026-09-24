## ADDED Requirements

### Requirement: An emission factor may be changed only while nothing depends on it

An emission factor SHALL be updatable and deletable while it is not in use, and SHALL be immutable once it is. The rule SHALL be enforced by the API, not only presented by the maintainer: a request to update or delete a factor in use SHALL be rejected with `EMISSION_FACTOR_IN_USE` and a 409, and SHALL change nothing.

The rule SHALL apply to every field of the factor, the gas breakdown included, and to the soft delete.

#### Scenario: A factor no line uses can be corrected

- **GIVEN** an emission factor that no line references
- **WHEN** an administrator changes its value, its source or its year
- **THEN** the update SHALL succeed

#### Scenario: A factor a line uses cannot be changed

- **GIVEN** an emission factor referenced by the active input of a line
- **WHEN** an administrator submits any update to it
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`, AND the stored factor SHALL be unchanged

#### Scenario: The gas breakdown is not an exception

- **GIVEN** an emission factor referenced by the active input of a line
- **WHEN** an administrator saves only its gas breakdown
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`

#### Scenario: A factor in use cannot be deleted

- **GIVEN** an emission factor referenced by the active input of a line
- **WHEN** an administrator deletes it
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`, AND the factor SHALL remain `ACTIVE`

### Requirement: "In use" means a live line references the factor

A factor SHALL be considered in use when a line factor snapshot points at it from a line input whose `isActive` is true, on a line in state `ACTIVE` or `OUTDATED`, under a footprint in state `ACTIVE`. All three conditions SHALL hold. Lines in state `OUTDATED` count because a parked line keeps its snapshot and can be reactivated without passing through line synchronization.

References held only by superseded line inputs SHALL NOT count. Those versions are audit trail that no reader of the application consults, and treating them as dependencies would freeze a factor permanently on the strength of a row nothing reads.

References held by a line under a footprint that has neither an owner nor an organization SHALL NOT count. Such a footprint is created by the open calculator and no actor can delete it — the delete endpoint is private, its authorization grants an org-less footprint only to its creator, and no write route lets an administrator bypass that. Counting them would let anonymous traffic freeze the live catalogue permanently.

References held by a deleted line, or by a line under a deleted footprint, SHALL NOT count. Both deletions are soft and leave the active input and its snapshot in place, and neither is reversible through any code path, so treating them as dependencies would lock a factor forever against a line nobody can see, restore or point at.

#### Scenario: A reference in a superseded input does not freeze the factor

- **GIVEN** a line that once used a factor and was saved again with a different one, so the first reference survives only in a superseded input
- **WHEN** an administrator updates that factor
- **THEN** the update SHALL succeed

#### Scenario: A parked line still counts

- **GIVEN** a line in state `OUTDATED` whose active input references a factor
- **WHEN** an administrator updates that factor
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`

#### Scenario: An unclaimed anonymous footprint does not lock the factor

- **GIVEN** a factor referenced only by a live line under a footprint with no owner and no organization
- **WHEN** an administrator updates or deletes that factor
- **THEN** the request SHALL succeed

#### Scenario: A claimed footprint still locks it

- **GIVEN** a factor referenced by one unclaimed anonymous footprint and one claimed footprint
- **WHEN** an administrator updates that factor
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`

#### Scenario: A deleted line releases the factor

- **GIVEN** a factor referenced only by a line in state `DELETED`
- **WHEN** an administrator updates that factor
- **THEN** the update SHALL succeed

#### Scenario: A deleted footprint releases the factor

- **GIVEN** a factor referenced only by a live line under a footprint in state `DELETED`
- **WHEN** an administrator updates that factor
- **THEN** the update SHALL succeed

### Requirement: Deleting a factor detaches the lines it leaves behind

When a factor is deleted, the system SHALL remove the frozen factor snapshot and the computed result of every line that still references it under an unclaimed anonymous footprint, in the same transaction. Those lines SHALL keep their subcategory, dimension selections, measurement unit and quantity, and SHALL read as unfinished.

Snapshots held by superseded line inputs, by deleted lines and by deleted footprints SHALL be left untouched, because no reader of the application consults them.

The system SHALL NOT attach a line to a deleted factor. A payload naming one SHALL be refused with `INVALID_EMISSION_FACTOR_REFERENCE` (422) before anything is written, the same way a payload naming a factor of another year or of another subcategory is.

#### Scenario: The line comes back asking for a factor

- **GIVEN** a factor referenced by a line of an unclaimed anonymous footprint
- **WHEN** an administrator deletes that factor
- **THEN** the line SHALL keep its quantity and unit, and SHALL hold no factor snapshot and no computed result

#### Scenario: Audit trail is not rewritten

- **GIVEN** a factor referenced from a superseded input and from a deleted line
- **WHEN** an administrator deletes that factor
- **THEN** both snapshots SHALL survive

#### Scenario: A stale payload does not re-attach it

- **GIVEN** a client that still names a deleted factor on a line
- **WHEN** the line is saved
- **THEN** the request SHALL be refused with a 422 whose `details.reason` is `DELETED`, and nothing SHALL be written

### Requirement: The rule does not depend on the methodology version's status

Whether the methodology version the factor hangs off is published SHALL NOT affect whether the factor can be changed. A factor of the published version with no lines behind it SHALL be editable, and a factor of an unpublished version with lines behind it SHALL NOT be.

#### Scenario: An unused factor of the published version is editable

- **GIVEN** a factor belonging to the published methodology version, referenced by no line
- **WHEN** an administrator updates it
- **THEN** the update SHALL succeed

#### Scenario: A used factor of an unpublished version is protected

- **GIVEN** a methodology version that was unpublished when a newer one was published, and a factor of that version still referenced by the active input of a line
- **WHEN** an administrator updates that factor
- **THEN** the request SHALL be rejected with `EMISSION_FACTOR_IN_USE`

### Requirement: Adding a factor is never blocked by usage

Creating an emission factor SHALL NOT be subject to this rule, since nothing can reference a factor that does not exist. An administrator SHALL be able to add factors to the methodology version a live footprint already reads, which is the only version that can reach it.

A newly added factor SHALL become available to capture immediately, for footprints of its own year, and SHALL NOT alter any line already entered.

#### Scenario: A factor is added to the published version

- **GIVEN** the published methodology version
- **WHEN** an administrator adds a factor for a year with no factors yet
- **THEN** the creation SHALL succeed, AND the factor SHALL be offered to footprints of that year on that version

#### Scenario: Adding a factor disturbs nothing already captured

- **GIVEN** a footprint whose lines hold manual factors because the catalogue had none for its year
- **WHEN** an administrator adds catalogue factors for that year
- **THEN** those lines SHALL keep their manual factors and their results unchanged

### Requirement: The maintainer states the dependency instead of offering what will fail

The emission-factor listing SHALL expose, per factor, how many live lines reference it, counted by exactly the predicate the guard applies, so the grid never locks a row the API would accept nor offers an edit the API will refuse. It SHALL report the lines held by unclaimed anonymous footprints as a separate count. The maintainer SHALL name that second count in the delete confirmation, and SHALL NOT use it to lock the row. The maintainer SHALL use it to leave a factor in use non-editable and non-deletable in the grid, and SHALL say why, naming the number of lines.

The count SHALL be understood as of the last read: it explains the rule, while the API is what enforces it.

#### Scenario: A factor in use is inert in the grid and explains itself

- **GIVEN** a factor referenced by three active lines
- **WHEN** an administrator opens the emission-factor maintainer
- **THEN** that row SHALL not enter edit mode and SHALL offer no delete, AND the reason SHALL be shown, stating that three lines use it

#### Scenario: A factor added moments ago can still be corrected

- **GIVEN** an administrator has just added a factor and no line references it yet
- **WHEN** they reopen the row to fix a mistyped value
- **THEN** the row SHALL be editable, AND the update SHALL succeed

### Requirement: Only the emission-factor screen opens on the published version

The emission-factor screen SHALL be reachable in edit mode for the published methodology version. The Categories, Subcategories and Dimensions screens SHALL remain read-only for it, unchanged, since no dependency rule stands behind them and deleting a subcategory cascades to its emission factors whether or not those are in use.

#### Scenario: The published version can be opened for factors

- **WHEN** an administrator chooses to edit the published methodology version
- **THEN** the emission-factor screen SHALL allow adding factors and editing unused ones

#### Scenario: The other methodology screens stay closed

- **GIVEN** an administrator editing the published methodology version
- **WHEN** they open Categories, Subcategories or Dimensions
- **THEN** those screens SHALL be read-only, exactly as before this change
