# Project Overview

## Goal

Huella Latam is a **digital public good for Latin America**: a country-agnostic platform for measuring, managing, and reducing organizational carbon footprints.

The system is designed to be centrally developed but independently deployed by each participating country on its own infrastructure. Each national deployment can adapt the platform to its local regulatory frameworks, emission factor methodologies, and business logic through configuration and extension—without modifying the shared core.

The platform integrates GHG measurement and recognition into a single continuous workflow, enabling organizations to go from self-assessment through third-party validation to official recognition.

---

## Main Use Cases

### 1. Carbon Inventory Management
Organizations register their GHG emissions for a given reporting year using a methodology selected by the country. The system guides them through selecting emission categories, subcategories, and inputting activity data. Calculations are performed automatically based on emission factors defined in the methodology.

### 2. Methodology Administration
Country administrators configure and version emission factor methodologies, defining the category hierarchy, emission factor dimensions, and factor values. A single methodology version is active at any time per country.

### 3. Organization Accreditation
Organizations go through a formal registration and accreditation workflow where their data is reviewed and approved by platform administrators. Accreditation establishes the organization as a legitimate participant on the platform.

### 4. Submission and Review Workflow
Carbon inventories and organization data are submitted for review through a structured submission process. Reviewers (administrators) can approve or reject submissions, with full auditability of all decisions.

### 5. Recognition and Badges
Approved carbon inventories can receive official recognition. The platform manages badge issuance, linking awards directly to approved submissions to ensure traceability.

### 6. Reduction Planning
Organizations can access reduction recommendations tailored to their inventory profile and create reduction projects and neutralization plans that represent commitments to future emissions reductions.

### 7. Transparency and Rankings
The platform provides sector-level and cross-organization transparency views, enabling benchmarking and public reporting of emissions data.

### 8. User and Role Management
The system supports multiple user roles at both the system level (superadmin, admin, user) and organization level (owner, member), with fine-grained access control.

### 9. Document and File Management
Organizations and administrators can attach supporting documents (certifications, evidence) to submissions, with files stored securely in Azure Blob Storage and accessed via time-limited SAS URLs.

---

## Scope

**In scope:**
- GHG emissions measurement aligned to country-specific methodologies
- Organization lifecycle management (registration, accreditation, updates)
- Carbon inventory creation, calculation, and submission for external verification by certified third parties
- Submission and review workflows
- Recognition and badge issuance
- Reduction and neutralization planning
- User management and role-based access control
- Secure document attachment and storage
- Country configuration (sectors, organization sizes, emission factors, parameters)
- Transparency and public rankings
- Multi-environment deployments (each country/team deploys independently)

**Out of scope (current version):**
- Real-time carbon tracking or IoT integrations
- Financial calculations or carbon credit trading
- Cross-country data federation or shared registries
- Mobile applications (web-only)
- Internationalization / multi-language UI (not yet implemented)
- Frontend automated testing (partially implemented)

---

## Key Assumptions

1. **One deployment per country.** Each national instance is deployed and operated independently. There is no shared cloud infrastructure between countries.

2. **Single active methodology per country.** At any given time, only one methodology version is active per country deployment. Organizations must use the active version.

3. **PostgreSQL 15 or higher is required.** The database schema uses `NULLS NOT DISTINCT` syntax introduced in PostgreSQL 15. PostgreSQL 14 or earlier will fail migrations.

4. **Azure is the reference cloud provider.** The infrastructure-as-code is written for Azure (Bicep). Deploying to other cloud providers would require rewriting the IaC layer.

5. **Authentication via Azure Entra ID.** The default authentication setup uses Azure Entra External ID (CIAM) or Azure Entra ID (organizational). Alternative OIDC/JWKS providers are supported via generic JWKS configuration, but Azure is the primary tested path.

6. **Stateless API.** The API does not maintain session state. All requests are authenticated via JWT tokens validated on each request.

7. **Organizations own their inventory data.** Carbon inventories are scoped to organizations. Individual users interact with inventories through their organization membership.

8. **Historical integrity is preserved.** The data model is designed for auditability. Key entities are versioned (organization data, inventory inputs) and meaningful deletions are soft-deletes. No critical data is overwritten.

9. **Country-level configurability via data, not code.** Country-specific adaptation (emission factors, sector taxonomies, organization categories, system parameters) is handled through database configuration, not code branching.

---

## Domain Glossary

| Term | Definition |
|---|---|
| **Carbon Inventory** | A structured record of an organization's GHG emissions for a specific reporting year, calculated using a defined methodology. |
| **Methodology** | A versioned set of emission categories, subcategories, factor dimensions, and factor values approved by the country. |
| **Emission Factor** | A coefficient that converts activity data (e.g., liters of fuel) into equivalent CO₂ emissions (tCO₂e). |
| **Category / Subcategory** | The hierarchical classification of emission sources within a methodology (e.g., Scope 1 → Fuel Combustion → Diesel). |
| **Submission** | A formal request for review submitted by an organization, linked to either organization data or a carbon inventory. |
| **Accreditation** | The status granted to an organization after its registration data is reviewed and approved by a platform administrator. |
| **Badge** | A digital recognition artifact issued to an organization upon successful review of a carbon inventory or other achievement. |
| **Reduction Project** | A documented commitment by an organization to reduce emissions through a specific initiative. |
| **Neutralization Plan** | A plan to offset unavoidable residual emissions through neutralization mechanisms. |
| **SAS URL** | A Shared Access Signature URL—a time-limited, cryptographically signed URL granting temporary access to a specific Azure Blob Storage resource. |
| **Managed Identity** | An Azure feature that allows services to authenticate to other Azure services without storing credentials. |
| **tCO₂e** | Tonnes of CO₂ equivalent—the standard unit for expressing greenhouse gas emissions. |
| **GHG** | Greenhouse Gas. |
