## MODIFIED Requirements

### Requirement: Requests KPIs endpoint supports optional year filtering

The existing `GET /api/admin/requests/kpis` endpoint SHALL accept an optional `year` query parameter. When provided, submission counts SHALL be filtered to submissions whose associated carbon inventory matches the given year. When omitted, the endpoint SHALL behave as before (unfiltered totals).

#### Scenario: Request without year filter (backwards-compatible)

- **WHEN** the endpoint is called without a `year` query parameter
- **THEN** the response SHALL return the same unfiltered totals as the current behavior

#### Scenario: Request with year filter

- **WHEN** the endpoint is called with `year=2025`
- **THEN** the response SHALL return submission counts filtered to submissions associated with inventories where `CarbonInventory.year = 2025`
