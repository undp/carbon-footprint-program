# Data Model

Database schema reference for the Huella Latam platform. Covers domain concepts, entity relationships, and the PostgreSQL views used by the API layer.

> For the emission factor taxonomy (Category / Subcategory / EmissionFactor models), see [`../architecture/methodology-taxonomy.md`](../architecture/methodology-taxonomy.md).
> For the emission calculation data model (LineInput / LineFactor / LineResult), see [`../architecture/emission-calculation.md`](../architecture/emission-calculation.md).

---

| Document                                                    | Description                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Conceptual Guide](./conceptual-guide.md)                   | Domain concepts and modeling principles                                                   |
| [Developer Guide](./developer-guide.md)                     | Database developer reference: Prisma usage, migration workflow, conventions               |
| [ER Diagram](./er-diagram.svg)                              | Entity-relationship diagram (SVG)                                                         |
| [Organization Model](./organization.md)                     | Organization entity deep-dive: fields, statuses, relations                                |
| [Organization Summary View](./organization-summary-view.md) | `OrganizationSummaryView` — fields, SQL, and queries that use it                          |
| [Submission Summary View](./submission-summary-view.md)     | `SubmissionSummaryView` — fields, UNION ALL SQL, admin queue queries, and KPI aggregation |

The ER diagram source is also available in Mermaid format at [`er-diagram.mmd`](./er-diagram.mmd) for editing.
