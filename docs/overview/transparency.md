# Transparency Portal

The transparency portal is the **public-facing view** of the Huella Latam platform. It lists organizations that have successfully completed the submission and external-validation workflow, with their accompanying recognition badges.

The portal is the public outcome of the traceability platform: a verifiable record of which organizations have submitted carbon data that was validated by external certifiers.

---

## Access Model

| Aspect         | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Authentication | **None** — the endpoint is public                                 |
| Scope          | Organizations flagged `isAccredited = true` and `status = ACTIVE` |
| Filters        | Optional year filter via `?year=<YYYY>`                           |

The route is marked `config: { public: true }` in `apps/api/src/routes/api/transparency/index.ts`, bypassing the JWT requirement that applies to all other `/api` routes.

---

## API Endpoint

```
GET /api/transparency
GET /api/transparency?year=2024
```

**Response shape** (abbreviated):

```json
[
  {
    "organizationName": "Empresa Ejemplo S.A.",
    "sector": "Manufactura / Industria Manufacturera",
    "subsector": "Alimentos y Bebidas - Procesamiento de carnes",
    "year": 2024,
    "recognitions": {
      "organizationAccreditation": true,
      "carbonInventoryCalculation": true,
      "carbonInventoryVerification": true,
      "reductionProjectVerification": false
    }
  }
]
```

Each entry represents one organization's yearly record with its recognition badges.

---

## What Is Exposed

Public fields:

- Organization **name**
- Organization **sector** and **subsector**
- The **year** of the carbon inventory
- Boolean **recognition flags** indicating which approvals the organization has received

---

## What Is Redacted

The transparency endpoint does **not** expose:

| Field                              | Why                                                                   |
| ---------------------------------- | --------------------------------------------------------------------- |
| Organization size / employee count | Business-sensitive                                                    |
| Branch count                       | Business-sensitive                                                    |
| Detailed emission line data        | Commercial sensitivity (competitors could infer operational scale)    |
| Total tCO₂e figures                | Same as above                                                         |
| Revenue or financial metrics       | Not platform data, but listed for clarity — not stored                |
| Representative name, email, phone  | PII                                                                   |
| Tax ID / legal identifiers         | PII / regulatory                                                      |
| Reviewer identity                  | Internal to admin workflow                                            |
| Review comments                    | Internal                                                              |
| Uploaded documents                 | Access-controlled via SAS URLs; never referenced from public endpoint |

This scope is enforced inside `getTransparencyDataService` (`apps/api/src/features/transparency/getTransparencyData/service.ts`), which selects only the allowlisted columns from the database.

---

## Inclusion Criteria

An organization appears in the transparency list **only if**:

1. `Organization.status = ACTIVE`
2. `Organization.isAccredited = true` (has an approved `ORGANIZATION_ACCREDITATION` submission)
3. It has at least one `CarbonInventory` with:
   - `status = ACTIVE`
   - At least one approved submission of a type in `RECOGNITION_SUBMISSION_TYPES`
4. Approved submissions use only the statuses `APPROVED` or `APPROVED_AUTOMATICALLY`

Rejected or merely reviewed submissions are not considered — only conclusive approvals.

---

## Frontend

The public view lives at `apps/web/src/screens/Transparency/TransparencyScreen.tsx`.

Features:

- **Fuzzy search** over organization name, sector, and subsector (via `useFuzzySearch`, powered by `fuse.js`).
- **Year filter** dropdown for historical review.
- **Grid layout** displaying each organization's recognition badges.
- No login required — the screen is reachable from the public landing page.

The page performs a single `GET /api/transparency` call (no follow-up requests that could leak access-controlled data).

---

## Data Consistency Guarantees

Because the transparency view is derived from submission status at read time:

- An organization that loses its approved status (e.g., a submission is later reversed) disappears immediately from the listing.
- Newly approved organizations appear on the next request after approval completes.
- There is **no caching layer** between the endpoint and the database — every request is a live query.

This simplicity is appropriate for the current traffic volume. If usage grows substantially, a short-TTL cache at the Front Door or API level may be introduced.

---

## Why It Matters

For the platform's role as a **traceability and transparency** system, this endpoint is the ultimate public deliverable: it lets anyone — regulators, journalists, citizens, partner organizations — verify independently which entities have gone through the validation process, without touching any proprietary data.

The platform itself performs no certification. It surfaces the conclusions of external certifiers in a tamper-resistant, consistently formatted registry.
