# ui-component-locale Specification

## Purpose

MUI grids, pagination, autocompletes and date pickers render their built-in texts in Spanish, and screen-specific grid texts take precedence over the locale.

## Requirements

### Requirement: MUI components render their built-in texts in Spanish

The web app SHALL apply the official `esES` locales of `@mui/material`, `@mui/x-data-grid` and `@mui/x-date-pickers`, so that no MUI built-in text (labels, placeholders, aria-labels, overlays) renders in English in grids, pagination, autocompletes or date pickers.

Two upstream translations SHALL be overridden: the Autocomplete open button reads «Abrir» (not «Abierto») and the date picker's day section reads «Día» (not «Dia»).

#### Scenario: Grid filter with no matches

- **WHEN** a column filter from the filter panel of a `StylizedDataGrid` matches no rows (e.g. Año = 2026 in the emission factor maintainer), and the screen sets no `noResultsOverlayLabel` of its own
- **THEN** the overlay reads «Resultados no encontrados», not «No results found.»

#### Scenario: Toolbar search with no matches

- **WHEN** the toolbar search of a `MaintainerDataGrid` matches no rows (the grid receives no rows, because the search filters them before the grid sees them)
- **THEN** the overlay shows the grid's `noRowsLabel` in Spanish (the screen's own, or «No hay filas para mostrar»)

#### Scenario: Grid pagination buttons

- **WHEN** a grid shows its pagination footer
- **THEN** the previous and next buttons are labelled «Ir a la página anterior» and «Ir a la página siguiente»

#### Scenario: Autocomplete open button

- **WHEN** an Autocomplete renders its popup button
- **THEN** its accessible name is «Abrir»

#### Scenario: Date picker field and dialog

- **WHEN** a `DatePicker` renders with an empty value
- **THEN** the placeholder reads `DD/MM/AAAA`, the open button reads «Elige fecha», and the section labels read «Día», «Mes» and «Año»

### Requirement: Screen-specific grid texts take precedence over the locale

`StylizedDataGrid` SHALL resolve each grid text in this order: the `localeText` passed by the screen, then the grid's own Spanish texts, then the `esES` grid locale. A screen that passes `localeText` SHALL NOT lose the locale for the keys it does not set. A screen that renders `DataGrid` directly with its own `localeText` SHALL spread the `esES` grid locale first, because the prop replaces the theme's locale instead of merging with it.

#### Scenario: Screen overrides the empty-grid text

- **WHEN** `InventoriesTab` passes `localeText={{ noRowsLabel: "No hay huellas disponibles" }}` and its grid is empty
- **THEN** the overlay reads «No hay huellas disponibles»

#### Scenario: Screen override does not drop other keys

- **WHEN** a screen passes only `noRowsLabel` and the grid shows its pagination footer
- **THEN** the pagination buttons still read in Spanish

#### Scenario: Screen-specific no-results text

- **WHEN** a column filter from the filter panel of the sectors maintainer («Rubros») matches no rows
- **THEN** the overlay reads «No se encontraron rubros»
