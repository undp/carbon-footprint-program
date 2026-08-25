# RD Methodology Factors

What the Dominican methodology changed in
`tools/seed/src/data/base/methodologies.json`, and which of those changes carry a
number.

**The branch adds options, not factors.** The observations asked for dimension
values the country actually has — dumps rather than only sanitary landfills, a
cable car, isolated grids — and those values ship. Pricing them is MMARN's:
Dominican factors come from the Dominican authority, and a number derived here
would be a foreign estimate wearing a national badge. Every value this branch
adds is therefore an option with **no seeded factor**, with one exception.

## The exception: the SENI grid factor

`0.5915 kgCO₂e/kWh` replaces `0.177`, a UK figure inherited from the demo dataset
that understated Dominican grid emissions roughly threefold. It is the one factor
the branch changes, because it prices Scope 2 for every organization in the
country and leaving a UK number there is worse than replacing it with an
order-of-magnitude-correct national one.

It is still not an official figure. **Confirm it against what the CNE / MEM
publishes before the first reporting cycle closes.**

## What happens to an option with no factor

The capture line finds nothing seeded, so **Fuente factor** offers only `Otro`,
where the registrant enters the value they hold — the operator's, the ministry's,
their own metering — and it is stored with the line. The option is usable and the
gap is visible, which is the point: an empty factor reads as a question, and a
plausible-looking derived number does not.

Every one of these becomes a data change the day MMARN supplies the figure. No
code is involved.

## Scope 2 — Electricidad

| Value           | Factor        | Note                                                                                          |
| --------------- | ------------- | --------------------------------------------------------------------------------------------- |
| SENI            | 0.5915 kg/kWh | The one replacement — see above                                                               |
| Sistema aislado | none          | Typically diesel generation, so above the interconnected grid — by how much is MMARN's to say |
| Otro            | none          | Escape hatch                                                                                  |

The demo dataset's single `Sistema nacional` value is gone: the country has an
interconnected grid and isolated systems, and the observation asks for both.

## Scope 3 — Disposición de residuos sólidos

The `Destino` dimension gains `Vertedero a cielo abierto`, `Vertedero controlado`
and `Otro`, alongside the `Relleno sanitario`, `Incineración` and `Reciclaje` the
platform already carried. **The three pre-existing destinations keep the
platform's DEFRA 2025 factors, unchanged. The three new ones carry none.**

A first pass derived them, scaling the landfill factor per material by the IPCC
2006 Vol. 5 Ch. 3 methane correction factor for the site type. It was dropped —
and the reason is worth keeping, because it is the question MMARN has to answer
before any number goes in: that derivation treats the DEFRA landfill figure as
the MCF = 1.0 reference, and DEFRA's figure is net of the landfill-gas capture
typical of a managed UK site. Model the _absence_ of capture at unmanaged
Dominican sites instead and the ranking inverts — dumps come out **above** the
sanitary landfill rather than below it.

**Is the disposal-route ranking driven by methane generation, or by net emissions
after capture?** Until that is answered, a derived multiplier is a coin flip
dressed as a factor.

## Scope 3 — Desplazamiento diario de empleados

| Change                                                       | Basis                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `Teleférico` added, **no factor**                            | The option the observation asks for — see below                                                       |
| `Tren cercanías` and `Tren larga distancia` removed          | The country has no passenger rail network; the Santo Domingo metro stays as `Metro`                   |
| `Taxi/Ride-share` → `Taxi/vehículo de transporte individual` | One value, not three. Taxi, motoconcho and platform vehicles are split only once their factors differ |
| `Bici` → `Bicicleta`                                         | Wording                                                                                               |

Both renames keep the platform's existing factors: the numbers are the same rows
under new names, not new values.

**The cable car.** A figure was drafted — 0.04 kWh per passenger-kilometre times
the SENI factor, on the reasoning that the traction is electric — and dropped:
0.04 kWh is a plausible mid-range for an urban aerial cableway anywhere, not a
measured value for the Santo Domingo system. Ask the operator for the consumption
per passenger-kilometre.

## What `Otro` carries, and what it does not

Nothing. `Otro` is an option with no factor, like every other value this branch
adds, and its comment is optional like every other comment in capture.

Two drafts tried to make the escape hatch self-defending — a mandatory comment,
and the highest factor of its dimension so it could never understate — and both
are gone. The mandatory comment matched values by name, so it could not be scoped
to one dimension without becoming a per-dimension rule, and two `Otro` options
behaving unlike every other value cost more in explanation than the traceability
bought. The conservative factor went with the rest of the derived numbers.

What is left is honest rather than protective: selecting `Otro` obliges the
registrant to supply a factor, because there is none to fall back on. Observations
4 and 6 say _especifique_, and the subcategory explanations ask for the comment;
neither is enforced. An inventory leaning on `Otro` is worth reviewing rather than
trusting.
