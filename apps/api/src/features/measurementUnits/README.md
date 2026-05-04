# Measurement Units

## Picker-vs-Display Rule

All reads of `MeasurementUnit` or `RateMeasurementUnit` fall into one of two modes:

**Picker mode** — listing units for a user or admin to _select_ when creating new data.  
Must filter `where: { status: MeasurementUnitStatus.ACTIVE }` so soft-deleted units are invisible.

**Display mode** — resolving a stored FK to render an existing record (e.g., a line input's unit name, a factor's rate unit abbreviation).  
Must NOT filter by status; the join must succeed even when the unit is `DELETED`.

### Audit Results (as of measurement-unit-management implementation)

| File                                                                                                 | Context                                                                          | Decision          |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| `features/measurementUnits/getAllMeasurementUnits/service.ts`                                        | Picker — public list consumed by EmissionEditor and Maintainer screen            | Filter `ACTIVE` ✓ |
| `features/measurementUnits/getAllRateMeasurementUnits/service.ts`                                    | Picker — public list consumed by EmissionEditor                                  | Filter `ACTIVE` ✓ |
| `features/carbonInventories/getCarbonInventoryMethodology/helper.ts` `buildRateUnitsByMagnitudeMap`  | Picker — builds options for emission-factor unit picker in EmissionEditor        | Filter `ACTIVE` ✓ |
| `features/subcategories/getAllSubcategories/service.ts` — `include: { measurementUnit }`             | Display — resolves units configured on existing subcategories                    | Unfiltered ✓      |
| `features/subcategories/createSubcategory/service.ts` — `include: { measurementUnit }`               | Display — resolves newly created subcategory's configured units for the response | Unfiltered ✓      |
| `features/subcategories/updateSubcategory/service.ts` — `include: { measurementUnit }`               | Display — resolves updated subcategory's configured units for the response       | Unfiltered ✓      |
| `features/carbonInventories/getEmissionsDetailedSummary/service.ts` — `include: { measurementUnit }` | Display — renders unit name on existing line inputs                              | Unfiltered ✓      |
| `features/carbonInventories/getEmissionFactors/service.ts` — `include: { rateMeasurementUnit }`      | Display — renders rate unit on existing line factors                             | Unfiltered ✓      |
| `features/emissionFactors/createEmissionFactor/service.ts` — `include: { rateMeasurementUnit }`      | Display — returns the rate unit of the newly created factor                      | Unfiltered ✓      |
| `features/emissionFactors/updateEmissionFactor/service.ts` — `include: { rateMeasurementUnit }`      | Display — returns the rate unit of the updated factor                            | Unfiltered ✓      |
| `features/emissionFactors/getAllEmissionFactors/service.ts` — `include: { rateMeasurementUnit }`     | Display — lists emission factors with their rate units                           | Unfiltered ✓      |
| `features/methodologies/duplicateMethodology/service.ts` — measurement unit links                    | Copy of FK links for duplication; no direct unit read                            | N/A               |
