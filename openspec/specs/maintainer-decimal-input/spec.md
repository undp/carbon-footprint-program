# maintainer-decimal-input Specification

## Purpose

The maintainers' numeric cells and the GEI breakdown read and display numbers in the app locale (decimal comma), like emission capture.

## Requirements

### Requirement: Maintainer numeric cells accept and display a decimal comma

The maintainers' editable number cell, used for the emission factor «Valor» and the measurement unit «Factor base», SHALL read numbers in the app locale (`APP_LOCALE`, decimal comma, dot as thousands separator), as emission capture does. It SHALL accept up to `FACTOR_INPUT_DECIMAL_SCALE` decimals. In read mode it SHALL display the stored value in the app locale without rounding.

#### Scenario: Typing a decimal comma

- **WHEN** an admin edits the value of an emission factor, types `0,16` and leaves the cell
- **THEN** the form holds `0.16` and no «Valor es requerido» error is shown

#### Scenario: Reading a stored factor

- **WHEN** a factor with value `0.177` is shown in read mode
- **THEN** the cell displays `0,177`

#### Scenario: Large base factor

- **WHEN** the measurement unit «toneladas» (base factor `1000000`) is shown in read mode
- **THEN** the cell displays `1.000.000`

#### Scenario: Locked base factor while editing its row

- **WHEN** an admin edits a measurement unit row whose «Factor base» is locked (a base unit, a system-protected unit, or one already in use), such as «toneladas»
- **THEN** the locked cell displays `1.000.000` next to its lock icon, not `1000000`

#### Scenario: Clearing the cell

- **WHEN** an admin empties the cell and leaves it
- **THEN** the form holds `null` and the existing required validation applies

### Requirement: GEI breakdown accepts and displays a decimal comma

The GEI breakdown modal SHALL accept each gas value with a decimal comma, up to `FACTOR_INPUT_DECIMAL_SCALE` decimals, and SHALL display the declared value and the total in the app locale. A gas left empty SHALL count as `0`. The mismatch rule SHALL stay as it is: saving is blocked while the absolute difference between the total and the declared value exceeds `1e-4`, and the API keeps answering 400 `EMISSION_FACTOR_GAS_DETAILS_MISMATCH`.

#### Scenario: Typing a gas value with a comma

- **WHEN** an admin types `0,1` in the CO₂ fósil field
- **THEN** the field shows `0,1` and the total reflects `0.1`

#### Scenario: Breakdown of a new factor

- **WHEN** an admin types `0,16` as the value of a new factor, opens the breakdown, and enters CO₂ fósil `0,15` and CH₄ `0,01`
- **THEN** the declared value and the total both read `0,16`, there is no mismatch alert, and «Guardar desglose» is enabled

#### Scenario: Breakdown that does not add up

- **WHEN** the breakdown total differs from the declared value by more than `1e-4`
- **THEN** the mismatch alert is shown with both numbers in the app locale, and «Guardar desglose» is disabled
