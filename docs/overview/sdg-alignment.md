# Sustainable Development Goals Alignment

Huella Latam is a country-agnostic platform for measuring, managing, and reducing organizational
carbon footprints across Latin America and the Caribbean. Centrally developed and independently
deployed by each participating country, it enables governments and organizations to quantify
greenhouse gas (GHG) emissions, submit inventories for third-party verification, receive official
recognition, and plan concrete reductions — without requiring country-specific code forks. This
document maps the platform's features and intended outcomes to the United Nations 2030 Agenda for
Sustainable Development. It is prepared as the primary evidence for **Indicator 1 — SDG Relevance**
under the **Digital Public Goods Alliance (DPGA) Standard v1.1.6**, consistent with the definition
of a Digital Public Good set out in the **UN Secretary-General's Roadmap for Digital Cooperation
(June 2020)**: open-source software, open data, open AI models, open standards, or open content
that adhere to privacy and other applicable international and domestic laws and best practices and
do no harm.

---

## Project anchoring in the climate agenda

Huella Latam is grounded in the commitments established by the **Paris Agreement** (2015), which
calls on all parties to pursue efforts to limit the global average temperature increase to 1.5°C
above pre-industrial levels. Fulfilling that commitment requires countries to translate their
**Nationally Determined Contributions (NDCs)** — the principal national planning instrument under
the Agreement — into measurable, verifiable emission reductions. Doing so depends on robust
**Measurement, Reporting, and Verification (MRV)** systems that capture emission data at the
organizational level and aggregate it into national inventories submitted under the UNFCCC. The
platform is also designed to support participation in emerging carbon markets, where credible,
third-party-verified emission data is a prerequisite for project registration and credit issuance.

The project was initiated under **UNDP Project 01000983 — Climate Hub** in direct support of the
**UNDP Climate Promise** initiative, which works with more than 120 countries to enhance NDC
ambition and implementation. The Terms of Reference for that project identify **South-South
cooperation** — the sharing of tools, methodologies, and institutional knowledge among developing
countries — as the primary delivery channel for the platform. A single, maintained codebase
distributed across independently operated national deployments is the technical expression of that
cooperation model: each country contributes to and benefits from a common foundation without
surrendering data sovereignty.

---

## Primary SDG: SDG 13 — Climate Action

### Target 13.2 — Integrate climate change measures into national policies, strategies and planning

Countries that have ratified the Paris Agreement are obliged to maintain national GHG inventories
and to report progress against their NDCs on a regular basis. Doing so requires emission data
collected at a level of granularity — by organization, scope, category, and reporting year — that
feeds upward into national totals. Huella Latam directly supports this MRV obligation: the
**Carbon Inventory Management** feature (`project-overview.md`, Use Case 1) guides organizations
through structured data entry aligned to country-configured emission factor methodologies, produces
scope-disaggregated totals in tCO2e, and retains full auditability of all inputs and calculations.
Country administrators can configure and version the methodology (Use Case 2), ensuring that the
data collected is consistent with the national framework in force at the time of reporting. The
structured outputs are designed to feed national GHG inventories submitted under the UNFCCC and
NDC progress reporting cycles.

### Target 13.3 — Improve education, awareness-raising and human and institutional capacity on climate change

Institutional capacity on climate change is built not only through formal training but also through
the act of participating in a structured measurement and verification process. The platform's
**Submission and Review Workflow** (Use Case 4) and **Recognition and Badges** feature (Use Case 5)
create a learning loop: organizations engage with GHG accounting concepts as they prepare their
inventory, receive feedback from qualified reviewers during the review process, and earn publicly
visible recognition upon approval. The **Transparency Portal** (`transparency.md`) reinforces this
effect by exposing recognition outcomes — organization name, sector, subsector, reporting year, and
recognition flags — to any member of the public without requiring a login. This public record
raises awareness among peer organizations in the same sector and gives regulators, journalists, and
civil society a verifiable signal of which entities are actively engaging with their climate
commitments.

### Target 13.b — Promote mechanisms for raising capacity in least-developed countries and developing economies

Developing economies in Latin America and the Caribbean face a common challenge: building the
institutional infrastructure for carbon accounting from a low base, with limited resources and
fragmented regulatory frameworks. The platform's country-agnostic architecture addresses this
directly. The **Methodology Administration** feature (Use Case 2) allows any country to configure
its own emission factor framework — reflecting local energy grids, fuel mixes, and regulatory
standards — without modifying shared platform code. The **Organization Accreditation** workflow
(Use Case 3) creates a formal onboarding pathway that builds organizational capacity step by step,
from registration through data review to verified recognition. Because the platform is distributed
as open-source software under an MIT licence, smaller economies can adopt it without licensing fees
or vendor dependency.

---

## Secondary SDG: SDG 12 — Responsible Consumption and Production

### Target 12.6 — Encourage companies to adopt sustainable practices and integrate sustainability information into reporting cycles

Target 12.6 calls on companies — especially large and transnational ones — to adopt sustainable
practices and to integrate sustainability information into their reporting cycles. The
organization-level carbon inventory workflow is exactly such a reporting instrument. Organizations
register their GHG emissions for a defined reporting year, have their data reviewed by qualified
third parties, and receive a traceable badge upon approval. This creates an annual, auditable
sustainability reporting cycle anchored to a government-operated platform, giving corporate
disclosures a level of institutional credibility that self-reported figures lack. The reduction
planning features (Use Cases 6) extend this from retrospective measurement to prospective
commitment, enabling organizations to document reduction projects and neutralization plans that can
be tracked over successive reporting years.

### Target 12.8 — Universal access to information for sustainable development and sustainable lifestyles

The public **Transparency Portal** (see `transparency.md`) is the platform's direct contribution
to Target 12.8. It lists all organizations that have completed the accreditation and verification
workflow, grouped by sector and reporting year, with their recognition badges displayed publicly.
No authentication is required. Any individual — citizen, journalist, student, or regulator — can
visit the portal to verify which organizations in their country have measured and had their carbon
footprint independently validated. This public-facing output transforms what would otherwise be a
closed administrative database into a civic transparency resource.

---

## Secondary SDG: SDG 17 — Partnerships for the Goals

### Target 17.16 — Multi-stakeholder partnerships

The governance model for Huella Latam (`governance.md`) is explicitly multi-stakeholder: UNDP acts
as the platform steward and primary funder; country implementation teams adapt and deploy the
platform for their national context; external contributors may submit improvements via pull
requests subject to the core maintainers' review. The acceptance criteria require that all
contributions remain country-agnostic, ensuring that improvements made by one country's team
benefit all others. This structure operationalizes a multi-stakeholder partnership in which no
single country owns the platform and all participants share both the costs of development and the
benefits of the shared codebase.

### Target 17.17 — Encourage and promote effective public, public-private and civil-society partnerships

The platform is designed to accommodate verification by **certified third-party certifiers** — a
private-sector role — within a government-operated recognition workflow. Organizations submit their
carbon inventory data for review; country administrators may delegate parts of that review to
accredited external certifiers; the resulting recognition badge is issued by the government
platform. This hybrid model creates a formal channel for public-private cooperation on climate
accountability that would otherwise require bespoke arrangements in each country.

### Target 17.18 — High-quality, timely and reliable disaggregated data for developing countries

The platform's data model captures GHG emissions at a high level of granularity: per organization,
per reporting year, per scope (Scope 1, Scope 2, Scope 3), per emission category, and per
subcategory. This structured, disaggregated data is a prerequisite for the national GHG inventories
that developing countries must submit to the UNFCCC. Because the platform is independently deployed
by each country on its own infrastructure, the data remains under national sovereignty while still
conforming to a common schema that supports cross-country comparability when countries choose to
share or publish aggregates. Historical integrity is preserved: key entities are versioned and
meaningful deletions are soft-deletes, ensuring that time-series data remains reliable for
trend analysis and NDC progress reporting.

---

## Secondary SDG: SDG 11 — Sustainable Cities and Communities

### Target 11.6 — Reduce the adverse per-capita environmental impact of cities

Municipal governments and other public-sector organizations are first-class users of the platform.
A city government can register as an organization, complete a carbon inventory covering its
municipal operations (fleet, buildings, waste, water), submit that inventory for third-party
verification, and receive an official recognition badge. The resulting data feeds both the city's
own sustainability reporting and the national GHG inventory. By giving municipalities a structured,
low-barrier pathway to measuring and publishing their environmental impact, the platform supports
the evidence base that Target 11.6 calls for and provides the public accountability signal that
incentivizes urban emission reductions over successive reporting cycles.

---

## Cross-cutting: SDG 9 — Industry, Innovation and Infrastructure

### Targets 9.1 and 9.4 — Resilient infrastructure and clean technologies

SDG 9 is an enabling goal for the platform's deployment model. Target 9.1 (develop quality,
reliable, sustainable, and resilient infrastructure) is supported by the platform's cloud-native,
infrastructure-as-code architecture: each country deploys on managed Azure services with automated
migrations, stateless API design, and time-limited credential management, reducing the operational
burden on national IT teams that may have limited capacity. Target 9.4 (upgrade infrastructure and
retrofit industries to make them sustainable) is supported by the open-source nature of the
platform: any country can inspect, audit, adapt, and extend the codebase without licensing costs
or proprietary lock-in, lowering the barrier to adopting clean-technology measurement
infrastructure across the region.

---

## Evidence and key performance indicators

Adopting countries are encouraged to track the following metrics and to report them to UNDP as part
of the Climate Promise monitoring framework. DPGA evaluators may request this data as evidence of
real-world impact:

- Number of organizations actively reporting through the platform (accredited and with at least one
  approved inventory).
- Total tCO2e reported, disaggregated by Scope 1, Scope 2, and Scope 3.
- Number of organizations that progressed from measurement (approved carbon inventory calculation)
  to reduction commitment (at least one active reduction project).
- Number of countries with a live deployment and at least one accredited organization.
- Number of public datasets exported and reused under the open-data licence (once an open-data
  export feature is available).
- Volume of capacity-building events and number of users trained on the platform per country per
  year.

---

## How country deployments report on SDG progress

Adopting governments are the data controllers for their own national instance. The platform does
not aggregate data across deployments or share data between countries. The structured outputs
produced by each deployment are designed to feed:

- **National greenhouse-gas inventories** submitted to the UNFCCC under the Paris Agreement's
  transparency framework.
- **NDC progress reporting**, where organization-level data provides the granular evidence base
  for sector-level aggregates reported by national governments.
- **Voluntary corporate reporting frameworks** including the GHG Protocol Corporate Standard,
  ISO 14064-1, the Global Reporting Initiative (GRI) Standards, the European Sustainability
  Reporting Standards (ESRS), the Science Based Targets initiative (SBTi), and CDP (formerly the
  Carbon Disclosure Project).

The detailed mapping of platform data fields to each of these reporting standards, including scope
definitions, boundary rules, and uncertainty guidance, is planned for a later sprint and will be
documented in `docs/architecture/standards-compliance.md`.

---

## References

- UN — _The 17 Goals_ (https://sdgs.un.org/goals).
- UN Secretary-General — _Roadmap for Digital Cooperation_ (June 2020)
  (https://www.un.org/en/content/digital-cooperation-roadmap/).
- UNDP — _Climate Promise_ (https://climatepromise.undp.org/).
- UNFCCC — _Paris Agreement_ (https://unfccc.int/process-and-meetings/the-paris-agreement).
- UNFCCC — _NDC Registry_ (https://unfccc.int/NDCREG).
- DPGA — _Digital Public Goods Standard v1.1.6_
  (https://digitalpublicgoods.net/standard/).
- Internal: `docs/overview/project-overview.md`.
- Internal: `docs/overview/transparency.md`.
- Internal: `docs/governance.md`.
