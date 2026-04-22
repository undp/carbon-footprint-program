# Glossary

Reference for domain-specific terminology used across the Huella Latam platform and documentation.

---

## Carbon Accounting

### Carbon footprint

Total greenhouse gas (GHG) emissions caused directly or indirectly by an individual, organization, event, or product, expressed as **tCO₂e** (tonnes of CO₂ equivalent).

### GHG Protocol

The Greenhouse Gas Protocol — the most widely used international accounting standard for government and business leaders to understand, quantify, and manage GHG emissions. The platform uses GHG Protocol categories as the default methodology.

### CO₂e (CO₂ equivalent)

A unit for comparing the global warming impact of different greenhouse gases. 1 tCO₂e = the climate impact of one metric tonne of carbon dioxide. Methane, N₂O, and other gases are normalized to CO₂e using their GWP (Global Warming Potential).

### Scope 1 — Direct emissions

Emissions from sources owned or controlled by the organization (e.g., company vehicles, on-site fuel combustion, process emissions). In the platform, represented by the "Emisiones directas" category.

### Scope 2 — Indirect emissions from purchased energy

Emissions from the generation of purchased electricity, heating, or cooling consumed by the organization. Represented by "Emisiones indirectas por energía".

### Scope 3 — Other indirect emissions

All other indirect emissions in an organization's value chain: employee commuting, purchased goods, waste, business travel, etc. Represented by "Otras emisiones indirectas".

### Emission factor

A coefficient that converts an activity quantity (e.g., liters of diesel burned, kWh consumed) into CO₂e emissions. Example: `2.68 kg CO₂e / liter of diesel`.

### Dimension (emission factor dimension)

A property that differentiates emission factors within the same subcategory. Example: "fuel type" is a dimension whose values (diesel, gasoline, natural gas) each correspond to different emission factor values.

### Methodology version

A versioned set of emission categories, subcategories, dimensions, and emission factors. Each country can have multiple methodology versions; only one is `PUBLISHED` at a time. Organizations' inventories are always tied to the methodology version that was active when they were created.

### Subcategory

A specific emission source within a category (e.g., "Combustiones estacionarias" — stationary combustion — under "Emisiones directas"). Subcategories are where emission factors are applied.

---

## Platform Workflow

### Inventory (carbon inventory)

An organization's record of emissions for a given reporting period and organizational boundary. Composed of lines, each representing a specific emission source.

### Inventory line

A single entry in an inventory — one subcategory with associated input quantities, resolved emission factors, and a calculated result.

### Self-declaration

A member action indicating the organization has reviewed and attests to its own inventory. Depending on the `CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR` system parameter, self-declaration may automatically produce an approved calculation submission.

### Submission

A formal request for admin review of an inventory, organization data, or reduction project. Submissions move through statuses: `PENDING` → `APPROVED` / `APPROVED_AUTOMATICALLY` / `REVIEWED` / `REJECTED`.

### Calculation (submission type)

A submission stage in which an admin reviews the methodology and calculations of the inventory itself. Must be approved before a verification submission can be made.

### Verification (submission type)

A submission stage in which the organization submits evidence of **external third-party validation** of their carbon inventory. The platform records the outcome of external validation; it does not perform validation itself.

### External validator / certifier

A certified third-party organization accredited to validate carbon inventories (e.g., under ISO 14064-3). Validation happens **outside** the platform. The admin records the validator's conclusion by approving or rejecting the verification submission.

### Accreditation (organization)

A separate submission track for validating an organization's identity and registration data (legal name, tax ID, sector). Independent of inventory submissions.

### Badge

A visual recognition issued when a submission is approved. Each badge is associated with a submission type (calculation, verification, accreditation) and is displayed on the organization's public traceability record.

### Reduction project

A GHG mitigation initiative (e.g., replacing diesel generators with solar panels) with quantified expected emission reductions. Follows a submission/verification flow parallel to carbon inventories.

### Reduction plan initiative

A pre-configured mitigation suggestion associated with a subcategory. Shown as recommendations when an organization is planning its reduction projects.

---

## Actors and Roles

### System roles

Defined on the `User` model:

| Role         | Capability                                                              |
| ------------ | ----------------------------------------------------------------------- |
| `USER`       | Default role; can belong to one or more organizations as a member       |
| `ADMIN`      | Platform administrator who reviews submissions                          |
| `SUPERADMIN` | Full administrative control, including user and organization management |

### Organization roles

Defined on the `UserOrganizationMembership` model (per-organization scope):

| Role          | Capability                                                           |
| ------------- | -------------------------------------------------------------------- |
| `VIEWER`      | Read-only access to the organization's data                          |
| `CONTRIBUTOR` | Can create and edit inventories, reduction projects, and submissions |
| `ADMIN`       | Organization admin; can manage members, submit for review            |

### External validator

Not a platform user — a third-party certification body operating outside the platform. Platform admins record validators' conclusions.

---

## Technical Terms

### IdP (Identity Provider)

The authentication provider issuing JWT tokens. In production, Azure Entra External ID (CIAM) or Azure Entra ID (organizational). Identified in the database by `idpName` and `idpUserId` on the `User` record.

### JWKS (JSON Web Key Set)

A standard endpoint exposing the public keys used to verify JWT signatures. The API fetches keys from the Entra ID JWKS endpoint to validate incoming tokens.

### MSAL (Microsoft Authentication Library)

Microsoft's client-side library for acquiring tokens from Entra ID. Used in the frontend to initiate login and obtain access tokens for the API.

### SAS URL (Shared Access Signature)

A time-limited, scope-restricted URL for uploading to or downloading from Azure Blob Storage. Generated by the API using a user-delegation key (no storage account key is ever exposed).

### Managed Identity

An Azure-managed credential assigned to a resource (e.g., the App Service). Allows the API to call Azure services without storing secrets. Used with `DefaultAzureCredential`.

### Key Vault reference

An App Service setting of the form `@Microsoft.KeyVault(SecretUri=...)`. At runtime, Azure resolves the reference and injects the secret value as an environment variable.

### OIDC federation

Used for GitHub Actions → Azure authentication. No client secret is stored in GitHub; Azure trusts short-lived tokens issued by GitHub per workflow run.

### Forced-user (auth provider)

Development-only auth mode. All requests are authenticated as a pre-configured test user, bypassing real authentication. Must never be enabled in Staging or Production.

### System parameter

Global platform configuration stored in the database. See [System Parameters Reference](./development/system-parameters.md).

### Country parameter

Per-country platform configuration (distinct from system parameters). Stored in the `CountryParameter` table.

---

## Document Types

### Inventory report (PDF)

A generated PDF summarizing an organization's carbon inventory. Created on demand by the API and delivered via SAS URL.

### Excel export

An XLSX download of inventory data for offline review or auditing. Generated in the frontend using `exceljs`.

---

## Acronyms Quick Reference

| Acronym   | Meaning                                                     |
| --------- | ----------------------------------------------------------- |
| GHG       | Greenhouse Gas                                              |
| tCO₂e     | Tonnes of CO₂ equivalent                                    |
| GWP       | Global Warming Potential                                    |
| IPCC      | Intergovernmental Panel on Climate Change                   |
| IEA       | International Energy Agency                                 |
| UNDP      | United Nations Development Programme                        |
| CIAM      | Customer Identity and Access Management (Entra External ID) |
| CMK       | Customer-Managed Key (encryption)                           |
| RPO       | Recovery Point Objective                                    |
| RTO       | Recovery Time Objective                                     |
| ZRS       | Zone-Redundant Storage                                      |
| WAF       | Web Application Firewall                                    |
| ACR       | Azure Container Registry                                    |
| VNet      | Virtual Network                                             |
| ISO 14064 | International standard for GHG inventories and verification |
