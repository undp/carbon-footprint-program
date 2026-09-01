## ADDED Requirements

### Requirement: The capture screen preselects the vintage that matches the footprint's year

When an organization captures an activity, the platform SHALL preselect an emission factor among those available for that activity (same dimension values, compatible rate unit), using the measurement year of the carbon inventory. For a footprint of year `Y` the preselected factor SHALL be, in order:

1. the factor whose year is `Y`;
2. otherwise the transversal factor (no year);
3. otherwise the factor with the most recent year below `Y`;
4. otherwise the factor with the closest year above `Y`.

When the preselected factor's year is not `Y`, the platform SHALL tell the organization which year was applied instead. When no factor is available for the activity at all, the platform SHALL preselect nothing and leave the organization to load its own factor, as it does today.

#### Scenario: The exact year exists

- **GIVEN** a footprint measured for 2023, and factors for 2022, 2023 and 2025 available for the activity
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2023 factor SHALL be preselected, AND no other-year notice SHALL be shown

#### Scenario: A transversal factor covers the activity

- **GIVEN** a footprint measured for 2023, and a single transversal factor available for the activity
- **WHEN** the organization completes the activity's required fields
- **THEN** the transversal factor SHALL be preselected, AND no other-year notice SHALL be shown, because a transversal factor applies to every year

#### Scenario: Only earlier years exist

- **GIVEN** a footprint measured for 2023, and factors for 2020 and 2022 available for the activity
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2022 factor SHALL be preselected — the most recent year that does not exceed the footprint's year — AND the organization SHALL be told that a 2022 factor was applied to a 2023 footprint

#### Scenario: Only later years exist

- **GIVEN** a footprint measured for 2022, and factors for 2025 and 2027 available for the activity
- **WHEN** the organization completes the activity's required fields
- **THEN** the 2025 factor SHALL be preselected — the closest year above the footprint's year — AND the organization SHALL be told that a 2025 factor was applied to a 2022 footprint

#### Scenario: The footprint has no year yet

- **GIVEN** a carbon inventory that has no measurement year recorded
- **WHEN** the organization reaches the capture screen and completes an activity's required fields
- **THEN** the platform SHALL preselect the most recent factor available for the activity AND tell the organization that the measurement year is still undefined

### Requirement: The organization can always choose another vintage

The capture screen SHALL let the organization pick any vintage available for the activity, not only the preselected one. Choosing a vintage SHALL load that factor's value and rate unit for the line, exactly as choosing a source does today. Loading an own factor SHALL remain available regardless of the vintages on offer.

#### Scenario: Overriding the preselected vintage

- **GIVEN** a footprint measured for 2023 whose activity has the 2023 factor preselected, with 2022 and 2025 also available
- **WHEN** the organization selects the 2022 factor
- **THEN** the line SHALL take the 2022 factor's value and rate unit, AND the choice SHALL survive saving and reloading the footprint

#### Scenario: A single vintage still offers a choice of provider

- **WHEN** an activity has factors from more than one source for the footprint's year
- **THEN** the organization SHALL be able to choose among them, preserving today's behavior for source selection

### Requirement: The applied year is recorded on the line and shown

Each captured line SHALL record the year of the emission factor actually applied to it, alongside the value, rate unit and source it already records, together with an indication of whether that year differs from the footprint's measurement year.

The recorded year SHALL be shown to the organization in the capture screen and in the summary of factors used, and SHALL NOT change when the catalog is later edited.

#### Scenario: A verifier can tell an exact match from a fallback

- **GIVEN** a footprint measured for 2022 with one line resolved to a 2022 factor and another resolved to a 2024 factor for lack of a 2022 one
- **WHEN** the summary of factors used is consulted
- **THEN** both lines SHALL show the year of the factor applied, AND the second SHALL be identifiable as having used a factor from another year

#### Scenario: A catalog edit does not rewrite history

- **GIVEN** a saved line that applied the 2022 factor of an activity
- **WHEN** a maintainer later corrects that factor's value, or loads a newer vintage for the same activity
- **THEN** the saved line SHALL keep the value, rate unit, source and year it recorded

### Requirement: Changing the footprint's year offers to update the factors

When the measurement year of a carbon inventory changes and the footprint already has captured lines, the platform SHALL notify the organization that the factors no longer match the new year and SHALL offer to re-resolve them. The organization decides: nothing SHALL be recalculated without that explicit action. The same offer SHALL be made when a footprint duplicated from another year is re-dated.

A carbon inventory that is not editable — self-declared or under verification — SHALL NOT be re-resolved, and SHALL NOT be offered the update.

#### Scenario: The organization accepts the update

- **GIVEN** a footprint measured for 2022 with captured lines resolved to 2022 factors
- **WHEN** the organization changes the measurement year to 2023 and accepts the offer to update the factors
- **THEN** every editable line SHALL be re-resolved with the preselection rule against 2023, AND the resulting values SHALL be saved

#### Scenario: The organization declines the update

- **GIVEN** the same footprint
- **WHEN** the organization changes the measurement year to 2023 and declines the offer
- **THEN** every line SHALL keep the factor it had recorded, AND the footprint's results SHALL be unchanged

#### Scenario: Duplicating last year's footprint

- **GIVEN** a footprint measured for 2022 that is duplicated to start the 2023 measurement
- **WHEN** the organization sets the copy's measurement year to 2023
- **THEN** the platform SHALL offer to update the copied factors to 2023 under the same rule

#### Scenario: A declared footprint is left alone

- **GIVEN** a self-declared footprint measured for 2022
- **WHEN** newer vintages are loaded into the catalog
- **THEN** the footprint SHALL keep its recorded factors and SHALL NOT be offered any update
