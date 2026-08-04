# inline-explanations Specification

## Purpose

Category and Subcategory records store their explanation markdown inline on their own row instead of joining a separate `Explanation` table, so read endpoints return the text without an extra fetch. This capability covers the inline nullable `explanation` column on both models, the removal of the unused `examples` column and the `Explanation.visible` flag, the create/update/list API contract, the position-and-name-matched seed, and the frontend context split between slug-fetch and direct-content rendering.

## Requirements

### Requirement: Category and Subcategory store explanation inline

Each `Category` and `Subcategory` record SHALL carry its explanation markdown as a nullable `explanation` text field on the same row. The prior `explanationSlug` foreign key and the separate `Explanation` join for per-entity content MUST be removed.

#### Scenario: Category explanation persisted on the row

- **WHEN** a category is created or updated with an `explanation` string
- **THEN** the value is stored in `category.explanation` and returned verbatim by subsequent read endpoints

#### Scenario: Subcategory explanation persisted on the row

- **WHEN** a subcategory is created or updated with an `explanation` string
- **THEN** the value is stored in `subcategory.explanation` and returned verbatim by subsequent read endpoints

#### Scenario: Null explanation is valid

- **WHEN** a category or subcategory is created without an `explanation`
- **THEN** the record is persisted with `explanation = null` and read endpoints return `null` for that field

### Requirement: `examples` field removed from Category and Subcategory

The `examples` column MUST NOT exist on `category` or `subcategory` after this change. Create and update inputs MUST reject or ignore an `examples` field, and read responses MUST NOT include it.

#### Scenario: Read response omits examples

- **WHEN** a client calls `getAllCategories` or `getAllSubcategories`
- **THEN** no response item contains an `examples` field

#### Scenario: Update payload no longer accepts examples

- **WHEN** a client submits `updateCategory` or `updateSubcategory` with an `examples` key
- **THEN** the schema validation layer rejects the field (it is not part of the accepted input shape)

### Requirement: `Explanation` table retained without `visible` flag

The `Explanation` table and `GET /explanations/{slug}` endpoint SHALL remain available for future standalone explanations. The `visible` field MUST be removed from the model, Zod schema, and endpoint response.

#### Scenario: Endpoint response excludes visible

- **WHEN** a client calls `GET /explanations/{slug}` for an existing row
- **THEN** the response contains `slug` and `content` but no `visible` field

#### Scenario: Schema rejects visible

- **WHEN** any caller destructures the response type or `ExplanationBaseSchema`
- **THEN** `visible` is not a property of the resulting type

### Requirement: List endpoints return inline explanation

`getAllCategories` and `getAllSubcategories` SHALL include `explanation` (nullable string) in each response item. `getAllSubcategories` previously omitted explanation content; this gap MUST be closed.

#### Scenario: Subcategory list includes explanation

- **WHEN** a client calls `getAllSubcategories`
- **THEN** each item contains an `explanation` field with either the markdown string or `null`

#### Scenario: Category list includes explanation

- **WHEN** a client calls `getAllCategories`
- **THEN** each item contains an `explanation` field with either the markdown string or `null`

### Requirement: Seed writes explanation directly to entity rows

The `seedExplanations` script SHALL read markdown files from `seeds/data/<dataset>/explanations/{categories,subcategories}/c<pos>_<name>.md` and write each file's content to the matching `category.explanation` or `subcategory.explanation` column, matched by position and normalized name. It MUST NOT create `Explanation` rows for per-entity content.

#### Scenario: Category explanation seeded

- **WHEN** the seed runs with a markdown file at `explanations/categories/c1_energia.md`
- **THEN** the category at position 1 with normalized name `energia` has its `explanation` column populated with the file's content

#### Scenario: Subcategory explanation seeded

- **WHEN** the seed runs with a markdown file at `explanations/subcategories/c2_transporte.md`
- **THEN** the subcategory at position 2 with normalized name `transporte` has its `explanation` column populated

#### Scenario: No standalone Explanation rows created

- **WHEN** the seed completes
- **THEN** no `Explanation` rows exist for per-category or per-subcategory content

### Requirement: Frontend context exposes two explanation-opening methods

`ExplanationContext` SHALL provide `openExplanationBySlug(slug: string)` and `openExplanationContent(content: string)`. The slug variant MUST fetch via `useExplanation` and render the returned content. The content variant MUST render the provided string directly without a network request.

#### Scenario: Category info icon opens without a fetch

- **WHEN** a user clicks the info icon on a `CategoryCard` whose `explanation` is non-null
- **THEN** the explanation modal opens rendering the string directly, and no `GET /explanations/{slug}` request is issued

#### Scenario: Subcategory info icon opens without a fetch

- **WHEN** a user clicks the info icon on a subcategory surface (preselection card, emission editor header) whose `explanation` is non-null
- **THEN** the modal opens rendering the string directly, with no network call

#### Scenario: Info icon always rendered; null explanation shows placeholder

- **WHEN** a user clicks the info icon on a category or subcategory whose `explanation` is `null`
- **THEN** the modal opens and renders the "No existe una explicación disponible aún" placeholder, with no network call

#### Scenario: Slug-fetch path still works

- **WHEN** a caller invokes `openExplanationBySlug(slug)` with a slug that exists in the `explanation` table
- **THEN** the modal opens, `useExplanation` fetches the row, and the content renders once resolved

### Requirement: Create/update inputs accept optional `explanation`

`createCategory`, `updateCategory`, `createSubcategory`, and `updateSubcategory` SHALL accept an optional, nullable `explanation` string in their input schemas. When provided, it MUST be persisted to the corresponding row's `explanation` column. These inputs MUST NOT accept `examples`.

#### Scenario: Create persists explanation

- **WHEN** a client calls `createCategory` or `createSubcategory` with `explanation: "..."`
- **THEN** the new row has `explanation` set to that value and the response includes it

#### Scenario: Update replaces explanation

- **WHEN** a client calls `updateCategory` or `updateSubcategory` with a new `explanation` value
- **THEN** the row's `explanation` column is replaced and subsequent reads return the new value

#### Scenario: Update can clear explanation

- **WHEN** a client calls `updateCategory` or `updateSubcategory` with `explanation: null`
- **THEN** the row's `explanation` is set to `null`
