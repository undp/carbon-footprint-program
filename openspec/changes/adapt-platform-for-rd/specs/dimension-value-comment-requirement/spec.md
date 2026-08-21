## ADDED Requirements

### Requirement: An escape-hatch dimension value requires a comment on the line that selects it

A dimension value that stands for a case the closed catalog does not enumerate — an escape hatch — SHALL oblige the capture line selecting it to record what the case actually was.

Which values are escape hatches SHALL be declared by a shared deployment constant naming them, matched exactly, and applied identically by the API and by the capture form. It SHALL NOT be a column on the dimension value: the methodology is seed-managed for this deployment, and a per-value flag only earns a schema change if an administrator can toggle it, which would mean a maintainer surface for it.

The match SHALL be exact rather than by prefix, so an ordinary option that merely begins with the same word — `Otro país`, `Otro proceso` — is unaffected.

#### Scenario: Deployment adds an escape hatch under a new name

- **WHEN** the methodology gains an open-ended value whose name is not in the constant
- **THEN** lines selecting it do not require a comment until the name is added to the constant

#### Scenario: An option that merely starts with the same word is unaffected

- **WHEN** a user saves a line selecting a value named `Otro proceso` with no comment
- **THEN** the line is accepted

### Requirement: Capture rejects a line that omits a required comment

When a capture line selects an escape-hatch dimension value, the line SHALL be rejected unless its comment is present and non-empty. The rejection MUST be surfaced on the form as a validation error naming the offending value, not as a generic save failure.

Whitespace-only comments MUST be treated as absent.

#### Scenario: Line with an escape-hatch value and no comment is rejected

- **WHEN** a user saves a line selecting an escape-hatch value and leaves the comment empty
- **THEN** the line is rejected and the comment is flagged as required

#### Scenario: Line with an escape-hatch value and a comment is accepted

- **WHEN** a user saves a line selecting an escape-hatch value and supplies a non-empty comment
- **THEN** the line is accepted and the comment is persisted

#### Scenario: Whitespace-only comment is treated as absent

- **WHEN** a user saves a line selecting an escape-hatch value with a comment consisting only of whitespace
- **THEN** the line is rejected as if the comment were empty

#### Scenario: Ordinary value leaves the comment optional

- **WHEN** a user saves a line selecting a value that is not an escape hatch, with no comment
- **THEN** the line is accepted

### Requirement: The requirement does not exempt a value from having an emission factor

An escape-hatch dimension value SHALL still resolve to an emission factor through the normal factor lookup. The requirement governs what the user must record, not whether the line can be calculated; an open-ended option MUST NOT produce an uncalculable line.

#### Scenario: Escape-hatch value still yields a calculated result

- **WHEN** a line selects an escape-hatch value, supplies a comment and a quantity
- **THEN** the line resolves an emission factor and produces a result like any other line
