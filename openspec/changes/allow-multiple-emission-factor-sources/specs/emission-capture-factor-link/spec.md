## ADDED Requirements

### Requirement: Capture selects a line's catalogue source by the number of sources offered

The catalogue sources offered to a line SHALL be those of the factors that match its dimension values and the rate unit compatible with its measurement unit. The own-factor option («Otro») SHALL be offered besides them, as today.

After every edit of a line whose source is not an own-factor source, once its required dimension values and its measurement unit are set, the editor SHALL apply the first of these rules that matches, and do nothing when none does:

- With exactly one catalogue source offered, it SHALL select that source and load its factor, also when the line held another source.
- With several offered and the line holding one of them, it SHALL load that source's factor again, so the line's factor matches its current dimension values and unit.
- With the line holding a catalogue source that is no longer offered, it SHALL clear the source and the factor.
- With several offered and no source held, it SHALL select nothing. The line SHALL stay incomplete until the user chooses a source.

#### Scenario: A single source is selected automatically

- **GIVEN** a subcategory whose factors for diesel in L all cite `"DEFRA 2025"`
- **WHEN** the user sets a line's dimension value to diesel and its unit to L
- **THEN** the line's source SHALL be `"DEFRA 2025"`, and its factor SHALL be loaded

#### Scenario: Several sources wait for the user's choice

- **GIVEN** a subcategory with a diesel factor in L citing `"DEFRA 2025"` and another citing `"Factor nacional"`
- **WHEN** the user sets a line's dimension value to diesel and its unit to L
- **THEN** no source SHALL be selected, both sources and the own-factor option SHALL be offered, and the line SHALL be incomplete until the user chooses one

#### Scenario: Choosing a source loads its factor

- **GIVEN** the line of the previous scenario with no source selected
- **WHEN** the user chooses `"Factor nacional"`
- **THEN** the line SHALL load the `"Factor nacional"` factor for diesel in L

#### Scenario: A chosen source survives a unit change

- **GIVEN** a line with `"Factor nacional"` chosen among several offered sources and its factor loaded
- **WHEN** the user changes the line's unit to another unit for which both sources are still offered
- **THEN** the line SHALL keep `"Factor nacional"` and load that source's factor for the new unit

#### Scenario: A source no longer offered is cleared

- **GIVEN** a line holding a catalogue source
- **WHEN** an edit leaves the line in a context where that source is not offered
- **THEN** the line's source and factor SHALL be cleared when no catalogue source or several are offered, and when exactly one is offered that source SHALL be selected instead and its factor loaded

#### Scenario: An own-factor line is left alone

- **GIVEN** a line whose source is the own-factor option
- **WHEN** the user changes its unit or a dimension value
- **THEN** the editor SHALL NOT select, reload or clear its source
