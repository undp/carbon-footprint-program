# RD Methodology Factors

Where the Dominican dimension values and emission factors in
`tools/seed/src/data/base/methodologies.json` come from, and exactly what each
number was derived from.

**Every factor here is a proposal pending MMARN validation.** Corrections are
edits to one JSON file, not code changes. The `source` string of each touched
subcategory says the same thing, because all active factors of a subcategory
must share one source — a rule the maintainer API enforces.

## The number that most needs confirming

The **SENI grid factor** (`0.5915 kgCO₂e/kWh`) prices Scope 2 for every
organization in the country, so it is the single most consequential value on the
branch. It replaces `0.177`, a UK figure inherited from the demo dataset that
understated Dominican grid emissions roughly threefold. The replacement is an
order-of-magnitude-correct national grid factor, not an official one: confirm it
against the figure the CNE / MEM publishes before the first reporting cycle
closes.

## Scope 2 — Electricidad

| Value           | Factor (kg/kWh) | Basis                                                                             |
| --------------- | --------------- | --------------------------------------------------------------------------------- |
| SENI            | 0.5915          | National interconnected grid factor (see above)                                   |
| Sistema aislado | 0.76217         | IPCC 2006 diesel EF, 74.1 kgCO₂/GJ, at 35 % net generating efficiency             |
| Otro            | 0.76217         | Highest factor of the dimension, per the conservative rule for the escape hatches |

Isolated systems are above the interconnected grid because they are typically
diesel generation with no thermal cogeneration.

## Scope 3 — Disposición de residuos sólidos

The destinations Dominican waste actually reaches, priced from the existing
landfill figure per material and the IPCC 2006 Vol. 5 Ch. 3 methane correction
factor (MCF) for the site type:

| Destination               | Multiplier on the landfill factor | IPCC site type                      |
| ------------------------- | --------------------------------- | ----------------------------------- |
| Relleno sanitario         | 1.0 (unchanged)                   | Managed, anaerobic                  |
| Vertedero controlado      | 0.8                               | Unmanaged, deep (≥ 5 m of waste)    |
| Vertedero a cielo abierto | 0.6                               | Uncategorised                       |
| Otro                      | the material's highest factor     | — (conservative, never understates) |

**Stated limitation.** This treats the DEFRA landfill factor as the MCF = 1.0
reference. DEFRA's figure is net of the landfill-gas capture typical of a managed
UK site, so if MMARN prefers to model the _absence_ of capture at unmanaged
Dominican sites, the multipliers move the other way — unmanaged sites would come
out above the sanitary landfill rather than below it. That is precisely the
question to put to MMARN: **is the disposal-route ranking driven by methane
generation (MCF) or by net emissions after capture?** The answer changes three
multipliers and nothing else.

`Otro` takes the highest factor available for its material rather than a
multiplier, so an unclassified disposal route never understates emissions.

## Scope 3 — Desplazamiento diario de empleados

| Change                                                       | Basis                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `Teleférico` added, 0.02366 kg/km                            | 0.04 kWh per passenger-km of aerial cableway × the SENI factor — electric traction                    |
| `Tren cercanías` and `Tren larga distancia` removed          | The country has no passenger rail network; the Santo Domingo metro stays as `Metro`                   |
| `Taxi/Ride-share` → `Taxi/vehículo de transporte individual` | One value, not three. Taxi, motoconcho and platform vehicles are split only once their factors differ |
| `Bici` → `Bicicleta`                                         | Wording                                                                                               |

The cable-car figure is the least established of the three: 0.04 kWh per
passenger-kilometre is a plausible mid-range for an urban aerial cableway, not a
measured value for the Santo Domingo system. Ask the operator.

## The mandatory comment on `Otro`

A capture line selecting `Otro` — in the waste and electricity dimensions — cannot
be saved without saying what the emission actually was. The names that carry the
obligation live in `COMMENT_REQUIRED_DIMENSION_VALUES`
(`packages/constants`), matched exactly so `Otro país` and `Otro proceso` stay
ordinary options. It is enforced server-side in `syncCarbonInventoryLines` and
surfaced on the line's comment action before the user reaches save.

Combined with the conservative factor, this is what keeps an escape hatch from
becoming a hole: the number never understates, and the comment gives MMARN what
it needs to reclassify the line later.

**One thing to watch.** Renaming `Otro` from the methodology maintainer disables
the requirement for that value, because the rule is the name. If MMARN renames it
or adds another catch-all, add the name to the constant.
