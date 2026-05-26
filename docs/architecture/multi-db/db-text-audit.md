# `@db.Text` audit (SQL Server free-text truncation)

## Why

In PostgreSQL a bare Prisma `String` maps to `text` (unbounded). In **SQL Server
a bare `String` maps to `NVarChar(1000)`**, which **silently truncates** longer
content. Every free-form text field must therefore carry `@db.Text`
(→ `nvarchar(max)`) **in the SQL Server schema**. Adding `@db.Text` to the
PostgreSQL schema as well is harmless (`text` either way) and keeps the two
schemas visually aligned, so we apply it to **both** schemas.

`Json` columns (`gasDetails`, `derivationDetails`, `resultDetails`,
`organizationData`, `consideredGei`) already map to `nvarchar(max)` on SQL Server
— out of scope here.

**These annotations are applied in PR 4** (task 4.5), to both schemas.

## Fields to annotate with `@db.Text`

| Model.field                                   | column                           | reason                                        |
| --------------------------------------------- | -------------------------------- | --------------------------------------------- |
| CountryParameter.value                        | `value`                          | parameter value, unbounded                    |
| CountryParameter.description                  | `description`                    | description                                   |
| SystemParameter.value                         | `value`                          | parameter value, unbounded                    |
| SystemParameter.description                   | `description`                    | description                                   |
| CountryOrganizationSize.description           | `description`                    | description                                   |
| CountrySector.description                     | `description`                    | description                                   |
| CountrySubsector.description                  | `description`                    | description                                   |
| OrganizationMainActivity.description          | `description`                    | description                                   |
| MethodologyVersion.description                | `description`                    | description                                   |
| MethodologyVersion.regulation                 | `regulation`                     | regulation citation (borderline, can be long) |
| Explanation.description                       | `description`                    | description                                   |
| Explanation.content                           | `content`                        | long-form user-facing markdown                |
| Category.synonyms                             | `synonyms`                       | synonym list (borderline)                     |
| Category.description                          | `description`                    | description                                   |
| Subcategory.description                       | `description`                    | description                                   |
| EmissionFactor.source                         | `source`                         | factor source citation                        |
| CarbonInventoryLineInput.manualFactorSource   | `manual_factor_source`           | manual factor source                          |
| CarbonInventoryLineInput.comment              | `comment`                        | free-text comment                             |
| CarbonInventoryLineFactor.appliedFactorSource | `applied_factor_source`          | applied factor source                         |
| OrganizationData.address                      | `address`                        | address (borderline, can exceed 1000)         |
| ReductionProject.description                  | `description`                    | description                                   |
| ReductionProject.reportedElsewhereDescription | `reported_elsewhere_description` | justification text                            |
| Submission.reviewComments                     | `review_comments`                | reviewer comments                             |
| ReductionPlanInitiative.description           | `description`                    | description                                   |

## Already annotated (no change)

- `Category.explanation` — already `@db.Text`
- `Subcategory.explanation` — already `@db.Text`

## Deliberately excluded (short/bounded — 1000 chars is safe)

`name`, `icon`, `color`, `code`, `slug`, `version`, `abbreviation`, `isoCode`,
`key`, `type`, `legalName`, `tradeName`, `taxId`, representative fields,
`firstName`, `lastName`, `email`, `idpUserId`, `idpName`, file metadata
(`originalName`, `mimeType`, `blobPath`), `gwpUsed`, `implementationDate`,
`sectorName`, `organizationName`, and `title` fields.

> If any `title` field (ReductionProject, ReductionPlanInitiative) is allowed to
> be long in the UI, revisit it — borderline.
