# Architecture

Technical design of the Huella Latam platform: system components, technology choices, and the mathematical and data-model foundations that power carbon emission calculations.

> For deployment and Azure infrastructure, see [`../infrastructure/`](../infrastructure/).

---

| Document | Description |
|---|---|
| [System Architecture](./system-architecture.md) | Components, services, data flow, and integrations |
| [Tech Stack](./tech-stack.md) | Validated technology decisions with rationale |
| [Emission Calculation Logic](./emission-calculation.md) | Core formula, data model (LineInput / LineFactor / LineResult), input types (SIMPLIFIED / EXPERT / DIRECT), aggregation view, and end-to-end example |
| [Methodology and Emission Factor Taxonomy](./methodology-taxonomy.md) | MethodologyVersion → Category → Subcategory → Dimension → EmissionFactor hierarchy, `gasDetails` structure, seed format, and taxonomy API endpoints |
