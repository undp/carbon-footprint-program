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
| `Teleférico` added, **no factor**                            | The option the observation asks for, with nothing to calculate from — see below                       |
| `Tren cercanías` and `Tren larga distancia` removed          | The country has no passenger rail network; the Santo Domingo metro stays as `Metro`                   |
| `Taxi/Ride-share` → `Taxi/vehículo de transporte individual` | One value, not three. Taxi, motoconcho and platform vehicles are split only once their factors differ |
| `Bici` → `Bicicleta`                                         | Wording                                                                                               |

**The cable car ships as an option with no factor.** A figure was drafted — 0.04
kWh per passenger-kilometre times the SENI factor, on the reasoning that the
traction is electric — and then dropped: 0.04 kWh is a plausible mid-range for an
urban aerial cableway anywhere, not a measured value for the Santo Domingo
system. Publishing it would have put a number nobody measured into a national
inventory, where its provenance stops travelling with it.

The option remains, because the observation asks for it. A line that selects it
finds no seeded factor and falls through to `Otro` in **Fuente factor**, where the
registrant enters the operator's own value. That reads as a gap, which it is,
rather than as an answer. Ask the operator for the consumption per
passenger-kilometre and this becomes a data change.

## What `Otro` carries, and what it does not

Every `Otro` takes the highest factor of its dimension, so the escape hatch never
understates. The line's comment is where a registrant says what the emission
actually was — and it is optional, like every other comment in capture.

An earlier draft made it mandatory on the two dimensions whose catch-all is named
exactly `Otro`. It was dropped: the rule matched by value name, which meant it
could not be scoped to one dimension without becoming a per-dimension rule, and
two `Otro` options behaving differently from every other value is harder to
explain than the traceability it bought. Observations 4 and 6 say _especifique_;
the subcategory explanations say so too, and the conservative factor is what
keeps the hatch from becoming a hole. An inventory leaning on `Otro` is worth
reviewing rather than trusting.
