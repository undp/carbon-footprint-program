# Editing Public-Page Content

The public, unauthenticated screens — the landing, **Sobre la iniciativa**
(About), **Material complementario** (Resources) and **Agradecimientos**
(Acknowledgements) — are content-driven. All of their editorial copy, figures,
partners and lists live in plain data files, **not** hard-coded inside the
components, so a country deployment can rewrite them without touching React.

This guide shows where each piece of content lives. Start with the
Acknowledgements list, which is the most frequently edited.

> All user-facing text is in Spanish (the app has no i18n). Keep the accents.
> After editing, run `pnpm --filter=web type-check` — the data files are typed,
> so a malformed entry fails the build instead of shipping broken.

---

## Acknowledgements list ("Agradecimientos")

**File:** [`apps/web/src/screens/Acknowledgements/participants.ts`](../../apps/web/src/screens/Acknowledgements/participants.ts)

The credited people live in a single exported array, `PARTICIPANT_GROUPS`, one
entry per group (consultants, national programs, companies, UNDP offices,
project team). Each person is a compact `[name, organization]` tuple.

The per-group counters (the "N personas" chip), the grand total and the
"personas participantes" figure in the stats band are **derived** from these
lists. Adding or removing a person updates all of them automatically — there is
no counter to bump by hand.

### Add or correct a person

Append (or edit) a tuple in the right group:

```ts
{
  title: "Consultores y expertos",
  Icon: LightbulbOutlined,
  participants: toParticipants([
    ["Pablo Zúñiga", "Consultor independiente"],
    // ...
    ["Nombre Apellido", "Su organización"], // ← new person
  ]),
},
```

### Add a new group

Add another object to `PARTICIPANT_GROUPS` with a `title`, an `Icon` (any
[`@mui/icons-material`](https://mui.com/material-ui/material-icons/) icon,
imported at the top of the file) and its `participants` list:

```ts
{
  title: "Nuevo grupo",
  Icon: SomeOutlinedIcon, // add the import
  participants: toParticipants([["Nombre Apellido", "Organización"]]),
},
```

### Related copy and figures

The list is data; the surrounding copy is not derivable and lives in
[`apps/web/src/screens/Acknowledgements/constants.ts`](../../apps/web/src/screens/Acknowledgements/constants.ts):

| What                                                           | Constant                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Hero title and lead                                            | `ACKNOWLEDGEMENTS_HERO`                                                               |
| Stats band figures (sessions, countries, organizations)        | `RESEARCH_SESSIONS_LABEL`, `RESEARCH_COUNTRIES_LABEL`, `RESEARCH_ORGANIZATIONS_LABEL` |
| Closing footnote (origin of the list, how to request a change) | `ACKNOWLEDGEMENTS_FOOTNOTE`                                                           |

Only the people-count figure is derived from `participants.ts`; the sessions,
countries and organizations figures are project-log numbers, so they are edited
here as plain strings.

---

## Other public-page content

Every other public screen follows the same "edit a typed data file" pattern:

| Page                                      | Content lives in                                                                                         | Notable exports                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Platform name, wordmark and administrator | [`apps/web/src/config/brand.ts`](../../apps/web/src/config/brand.ts)                                     | `BRAND` (full and clipped names, the two-line wordmark, the ministry statement, the artwork)        |
| Landing (welcome, the two doors)          | [`apps/web/src/screens/Landing/constants.ts`](../../apps/web/src/screens/Landing/constants.ts)           | `LANDING_COPY`                                                                                      |
| Institutional partners (About)            | [`apps/web/src/config/partners.ts`](../../apps/web/src/config/partners.ts)                               | `PARTNERS` (names and logos; what each contributes is editorial copy in the About constants)        |
| Brand and partner logos                   | [`apps/web/src/assets/logos/`](../../apps/web/src/assets/logos)                                          | the Huella de Carbono RD mark, the government lockup and the partner logos — replace per deployment |
| Sobre la iniciativa (About)               | [`apps/web/src/screens/About/constants.ts`](../../apps/web/src/screens/About/constants.ts)               | `ABOUT_HERO`, `ABOUT_BENEFITS`, `ABOUT_SUPPORTERS`, `ABOUT_FOUNDATION_NOTE`                         |
| Material complementario (Resources)       | [`apps/web/src/screens/Resources/constants.ts`](../../apps/web/src/screens/Resources/constants.ts)       | `SUPPORTING_RESOURCES`                                                                              |
| Terms and conditions link (public footer) | [`apps/web/src/config/constants.ts`](../../apps/web/src/config/constants.ts)                             | `TERMS_CONDITIONS_FILE_URL`                                                                         |
| Public header navigation (links + labels) | [`apps/web/src/interfaces/routes/publicRoutes.ts`](../../apps/web/src/interfaces/routes/publicRoutes.ts) | `PublicHeaderRoutes`, `PublicHeaderRoutesTranslations`                                              |

## Brand and palette

The public screens are dressed by two files, not by the components:

- [`apps/web/src/config/brand.ts`](../../apps/web/src/config/brand.ts) — the
  `BRAND` object: how the platform names itself (full name, the two lines of the
  wordmark, the clipped form used in running text), who administers it, and the
  three pieces of artwork under `src/assets/logos/` (the full-color mark for
  light surfaces, the white mark for the brand gradient and the dark surfaces,
  and the government lockup that signs the footer).
- [`apps/web/src/theme/palette.ts`](../../apps/web/src/theme/palette.ts) — the
  colors. `primary` is the institutional navy, `secondary` the green of the leaf
  inside the mark, and `common.sunflower` the attention yellow. The brand
  gradient that backs the landing and the institutional heros is derived from
  them in [`apps/web/src/utils/brandGradient.ts`](../../apps/web/src/utils/brandGradient.ts).

Both are shared by the whole app, not just the public pages: the sidebar, the
app header and the authentication screens read the same `BRAND` lockup and the
same palette, so a deployment that retunes either gets a consistent platform
rather than a repainted landing.

Retuning a color is not free: `apps/web/src/theme/palette.test.ts` pins each
brand pairing to the WCAG AA floor it has to clear (white on navy, dark text on
the yellow, the pale green figures on the dark cards). Change a token and that
test tells you which pairing you broke.

---

> **Why TS and not JSON?** These files reference React icon components and
> derive values (counters, totals) at import time, which a plain JSON file
> can't express. They are still just data — no logic beyond the derivations.

For deploying the platform in a new country end-to-end (seed data, methodology,
auth, infrastructure), see the
[Country Onboarding Guide](./country-onboarding.md).
