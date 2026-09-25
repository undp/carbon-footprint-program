# 3. Configuration and branding

Whatever is not in the seed lives in typed TypeScript configuration files in the frontend and the
API. The content team decides the copy and supplies the artwork; a developer edits the files and
rebuilds the images, because these values are compiled into them. Each country keeps its own branch
or fork with these values. We estimate 1–2 weeks, in parallel with [phase 2](./02-seed-content.md)
and 4A,
and it must be finished before the first production build
([phase 4B](./04-infrastructure.md#first-production-deploy-sequence)).

← [2. Seed content](./02-seed-content.md) · [Index](./README.md) · Next: [4. Infrastructure](./04-infrastructure.md) →

---

## Institutional identity and public pages

| What                                                           | File                                                                                                                                          | What to change                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Institutional partners (header, footer, "Sobre la iniciativa") | [`apps/web/src/config/partners.ts`](../../apps/web/src/config/partners.ts) + [`apps/web/src/assets/logos/`](../../apps/web/src/assets/logos/) | Names, role caption ("Una iniciativa de"), color and official logo of each partner |
| Demo-environment notice on the landing page                    | [`apps/web/src/screens/Landing/components/LandingHero.tsx`](../../apps/web/src/screens/Landing/components/LandingHero.tsx)                    | Always shown today; a developer removes or replaces it before production           |
| "Sobre la iniciativa" (About)                                  | [`apps/web/src/screens/About/constants.ts`](../../apps/web/src/screens/About/constants.ts)                                                    | Figures, challenge, pillars, alliance actors, roadmap                              |
| "Material complementario" (Resources)                          | [`apps/web/src/screens/Resources/constants.ts`](../../apps/web/src/screens/Resources/constants.ts)                                            | Guides and courses; add national regulations and guides                            |
| "Agradecimientos" (Acknowledgements)                           | [`apps/web/src/screens/Acknowledgements/participants.ts`](../../apps/web/src/screens/Acknowledgements/participants.ts) and `constants.ts`     | People and institutions that took part in the country                              |
| Name, browser tab and icons                                    | [`apps/web/index.html`](../../apps/web/index.html), [`apps/web/public/`](../../apps/web/public/) (`favicon*`)                                 | Title and favicon, if the country uses its own brand                               |
| Colors and typography                                          | [`apps/web/src/theme/palette.ts`](../../apps/web/src/theme/palette.ts), `typography.ts`                                                       | Only if the national brand requires it; check contrast                             |

The guide [`../development/public-pages-content.md`](../development/public-pages-content.md)
details every constant behind the public pages.

## Per-country values

| Constant                                          | File                                                                                     | Current value                       | What to decide                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPPORT_EMAIL`                                   | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | `contacto@huellalatam.com`          | The country's support address                                                                                                                                                                                                                      |
| `REPLICATION_CONTACT_EMAIL`                       | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | UNDP regional contact               | Keep, or replace with the national focal point                                                                                                                                                                                                     |
| `APP_LOCALE`                                      | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | `es-ES`                             | The country's own locale; see the formatting table below                                                                                                                                                                                           |
| `TAX_ID_LABEL`, `TAX_ID_LABEL_SHORT`              | [`packages/constants/src/organization.ts`](../../packages/constants/src/organization.ts) | "RUT / RUC / ID Tributario", "RUT"  | Local name of the tax identifier (RNC, NIT, RUC, RFC…)                                                                                                                                                                                             |
| `VOCAB`                                           | [`apps/web/src/config/vocab.ts`](../../apps/web/src/config/vocab.ts)                     | "organización", "huella de carbono" | Only if the national program uses other terms                                                                                                                                                                                                      |
| `CALCULATOR_YEARS_RANGE_FROM_CURRENT`             | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | 5                                   | The factor form offers years from the current year minus 4 to the current year plus 1, and expert mode offers the current year and the four before it even without factors. Raise it to load factors for older years or to widen the expert window |
| `DASHBOARD_YEARS_RANGE_FROM_CURRENT`              | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | 10                                  | Years offered in the admin dashboard                                                                                                                                                                                                               |
| `TRANSPARENCY_YEARS_RANGE_FROM_CURRENT`           | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | 5                                   | Years offered on the public transparency screen                                                                                                                                                                                                    |
| `MEASURING_ORGANIZATIONS_YEAR_RANGE`              | [`apps/api/src/config/constants.ts`](../../apps/api/src/config/constants.ts)             | 2                                   | "Measuring organizations" window in the admin dashboard. Keep the default: changing it also needs a new database migration, outside the files listed here                                                                                          |
| `CHATBOT_AI_DISCLAIMER`, `CHATBOT_PRIVACY_NOTICE` | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)             | Generic text                        | Legal review if the chatbot is enabled                                                                                                                                                                                                             |

### Number formatting by locale

| Locale  | 1234.56    | 12345.67    |
| ------- | ---------- | ----------- |
| `es-ES` | `1234,56`  | `12.345,67` |
| `es-CL` | `1.234,56` | `12.345,67` |
| `es-MX` | `1,234.56` | `12,345.67` |
| `es-DO` | `1,234.56` | `12,345.67` |

`es-ES` does not group four-digit numbers, so set the country's own locale rather than keeping the
default.

## Keep country changes easy to merge

Limit the country branch to the files listed in this document and to the seed data
([phase 2](./02-seed-content.md)). Every other file stays identical to upstream, so each new
release merges with few conflicts ([phase 5](./05-validation-and-go-live.md#upstream-releases)).

## What does not need changing

- **Language.** The whole UI is in Spanish and there is no i18n. A Portuguese- or English-speaking
  country needs a separate project (see [`../development/i18n-plan.md`](../development/i18n-plan.md)).
- **Calculation logic.** The formulas are the same for every country; what changes are the factors
  and the catalogue structure ([phase 2](./02-seed-content.md)).

---

← [2. Seed content](./02-seed-content.md) · [Index](./README.md) · Next: [4. Infrastructure](./04-infrastructure.md) →
