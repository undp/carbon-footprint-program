# Internationalization (i18n) Plan

> **Status: Not implemented.** This document is a forward-looking plan for adding translation support to Huella Latam. The current codebase ships with user-facing strings hardcoded in Spanish. This guide explains how to add i18n when a country deployment needs multiple languages (e.g., Spanish + Portuguese for a regional rollout, or English for donors/reviewers).

---

## Current State Assessment

Before planning the migration, it's important to understand where translatable text currently lives.

### Frontend: Hardcoded Spanish

All user-facing strings in `apps/web/src/` are hardcoded in Spanish. Examples:

| File | String |
|---|---|
| `apps/web/src/components/CreateInventoryCard.tsx` | `"No se pudo crear la huella"` |
| `apps/web/src/components/form/FormTextField.tsx` | `"Este campo es obligatorio"` |
| `apps/web/src/components/form/FormNumericField.tsx` | `"El valor es demasiado bajo"` / `"demasiado alto"` |
| `apps/web/src/screens/CarbonInventories/...` | `"No se pudo duplicar la huella"` |

### Frontend: No i18n Library Installed

`apps/web/package.json` has **zero** i18n dependencies. This is a greenfield migration — no existing setup to refactor.

### Frontend: Locale-Aware Formatting (Hardcoded to `"es"`)

`apps/web/src/utils/formatting.ts` uses `Intl.DateTimeFormat` and `toLocaleString()` but passes `"es"` as the locale directly:

```typescript
// Current
formatDate(date) // Intl.DateTimeFormat("es", { ... })
formatEmissions(value) // value.toLocaleString("es", { ... })
formatQuantity(value) // value.toLocaleString("es", { ... })
```

Numbers and dates will not auto-switch when the language changes — formatting helpers need to accept the current locale.

### Backend: Code-First Errors (Good)

API error messages in `apps/api/src/features/*/errors.ts` use English, but each error has a machine-readable `code`:

```typescript
{ code: "CARBON_INVENTORY_NOT_FOUND", message: "Carbon inventory %s not found" }
```

The `code` is intended for client-side translation — the `message` is a developer hint, not UI text. **The backend does not need to be translated**; the frontend looks up user-facing strings by `code`.

### Form Validation

Validation messages live in the generic form components (`FormTextField`, `FormNumericField`, `FormDateField`, `FormSelectField`). Defaults are in Spanish and can be overridden via props (`requiredMessage`, `minMessage`, etc.). Any i18n migration must route these defaults through the translation layer.

---

## Goals and Non-Goals

### Goals

- Enable country deployments to add languages without forking the codebase.
- Support at minimum: Spanish (`es`), Portuguese (`pt`), English (`en`).
- Externalize all user-facing strings from React components.
- Translate backend error codes on the frontend (one source of truth).
- Support locale-aware date/number formatting.
- Preserve developer ergonomics — adding a new string should remain a one-line change.

### Non-Goals

- Translating the API (no accept-language negotiation, no per-request locale). Error messages stay as developer hints; the frontend translates based on `code`.
- RTL (right-to-left) layout support — not required for the target languages.
- Server-side rendering / SSR locale routing — the frontend is a SPA; locale is client-side only.
- Translating internal admin endpoints or Swagger UI.

---

## Recommended Library: `react-i18next`

**Why:**
- Most mature i18n library for React (actively maintained, 8M+ weekly downloads).
- Plain JSON translation files — no custom build step required.
- Built-in interpolation, pluralization, namespaces, lazy loading.
- Works out of the box with Vite — no framework lock-in.
- Works with React Hook Form for validation messages.

**Alternatives considered:**

| Library | Why not |
|---|---|
| `next-intl` | Tied to Next.js; this project uses Vite + SPA |
| `@lingui/react` | Requires compile-time extraction; more complex setup |
| `react-intl` (FormatJS) | Verbose API; ICU messages harder to author than i18next |

---

## Implementation Plan

### Phase 1 — Install and Bootstrap

```bash
pnpm --filter web add react-i18next i18next i18next-browser-languagedetector
```

**Create the i18n config** at `apps/web/src/i18n/index.ts`:

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import es from "./locales/es.json";
import pt from "./locales/pt.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: "es",
    interpolation: { escapeValue: false },
  });

export default i18n;
```

**Import in entry point** (`apps/web/src/main.tsx`):

```typescript
import "./i18n";
```

### Phase 2 — Translation File Structure

```
apps/web/src/i18n/
├── index.ts
├── locales/
│   ├── es.json        (primary — reference)
│   ├── pt.json
│   └── en.json
└── types.d.ts         (TypeScript augmentation for autocomplete)
```

**Organize keys by domain/screen** to keep files maintainable:

```json
{
  "common": {
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar"
  },
  "validation": {
    "required": "Este campo es obligatorio",
    "tooLow": "El valor es demasiado bajo",
    "tooHigh": "El valor es demasiado alto"
  },
  "organizations": {
    "create": {
      "title": "Crear organización",
      "submitButton": "Crear"
    }
  },
  "errors": {
    "CARBON_INVENTORY_NOT_FOUND": "No se encontró la huella de carbono",
    "TAX_ID_ALREADY_USED": "Este RUT ya está en uso"
  }
}
```

> Mirror the same structure across all language files. Missing keys fall back to `fallbackLng` at runtime.

### Phase 3 — Migrate Components

**Before:**
```tsx
<Button>Cancelar</Button>
<Alert>No se pudo crear la huella</Alert>
```

**After:**
```tsx
import { useTranslation } from "react-i18next";

function Component() {
  const { t } = useTranslation();
  return (
    <>
      <Button>{t("common.cancel")}</Button>
      <Alert>{t("errors.CARBON_INVENTORY_CREATE_FAILED")}</Alert>
    </>
  );
}
```

**Migration strategy:**

1. **Extract strings screen by screen** — start with high-traffic screens (login, inventory list, inventory edit).
2. **Use a consistent key naming convention**: `<domain>.<screen>.<element>` (e.g. `organizations.list.createButton`).
3. **Add a helper for API error translation:**

```typescript
// apps/web/src/i18n/useApiError.ts
import { useTranslation } from "react-i18next";

export function useApiErrorMessage() {
  const { t } = useTranslation();
  return (error: { code?: string; message?: string }) => {
    if (error.code) return t(`errors.${error.code}`, { defaultValue: error.message });
    return error.message ?? t("common.unknownError");
  };
}
```

4. **Update form components** to accept translated messages via hooks rather than prop defaults:

```tsx
// FormTextField.tsx
const { t } = useTranslation();
const defaultRequiredMessage = t("validation.required");
```

### Phase 4 — Locale-Aware Formatting

Update `apps/web/src/utils/formatting.ts` to read the current locale from i18n:

```typescript
import i18n from "@/i18n";

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatEmissions(value: number): string {
  return value.toLocaleString(i18n.language, {
    maximumFractionDigits: 2,
  });
}
```

**Number formatting by locale:**
- `es`: `1.234,56` (dot thousand separator, comma decimal)
- `pt`: `1.234,56` (same as `es`)
- `en`: `1,234.56` (comma thousand, dot decimal)

`Intl.NumberFormat` handles this automatically once the locale is dynamic.

### Phase 5 — Language Switcher UI

Add a language selector to the app header or user settings:

```tsx
import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <Select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
      <MenuItem value="es">Español</MenuItem>
      <MenuItem value="pt">Português</MenuItem>
      <MenuItem value="en">English</MenuItem>
    </Select>
  );
}
```

The `i18next-browser-languagedetector` plugin persists the choice in `localStorage`.

### Phase 6 — TypeScript Autocomplete

Add type augmentation so `t("...")` gets autocomplete:

```typescript
// apps/web/src/i18n/types.d.ts
import "react-i18next";
import type es from "./locales/es.json";

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof es };
  }
}
```

### Phase 7 — Translation Workflow

For country deployments that want to translate:

1. Copy `es.json` → `<locale>.json` (e.g., `pt.json`).
2. Translate values — keep all keys identical.
3. Register the new locale in `apps/web/src/i18n/index.ts`.
4. Optionally: use a translation service (Lokalise, Crowdin, Weblate) to manage files collaboratively.

**Tooling suggestions:**
- `i18next-parser` — scans source files for `t("key")` calls and generates a baseline translation file.
- `i18next-resources-for-ts` — generates TypeScript types from translation JSON.

---

## Migration Checklist (for each screen/component)

- [ ] Extract user-facing strings to `es.json` under a meaningful key
- [ ] Replace literal strings with `t("key")` calls
- [ ] Replace hardcoded `"es"` in `Intl.*` / `toLocaleString` with `i18n.language`
- [ ] Add translations to `pt.json` and `en.json` (or mark with `__TODO__`)
- [ ] Run the app with each locale and verify no untranslated text remains
- [ ] Add a Cypress/Playwright test that switches language and verifies key text

---

## Backend Considerations (Minimal Changes)

No backend changes are strictly required if the frontend maps error codes to translated messages. However:

**Optional improvement — structured error payload:**

```typescript
{
  "code": "TAX_ID_ALREADY_USED",
  "message": "Tax ID already in use",       // Developer hint (English, unchanged)
  "details": { "field": "taxId" }            // Optional context for the frontend
}
```

The frontend uses `code` + `details` to build a user message in the current locale, ignoring `message`.

---

## Effort Estimate

| Phase | Effort | Notes |
|---|---|---|
| Phase 1 — Install & bootstrap | 2 hours | One-time setup |
| Phase 2 — JSON file structure | 1 hour | Decide key convention |
| Phase 3 — Migrate strings | 2–3 weeks | Depends on app size; work screen by screen |
| Phase 4 — Locale-aware formatting | 4 hours | Single utility file |
| Phase 5 — Language switcher | 2 hours | Small UI component |
| Phase 6 — TypeScript augmentation | 1 hour | One-time setup |
| Phase 7 — Additional language | 1–2 weeks per language | Translation work (can be parallelized with native speakers) |

**Total (first language, plus plumbing):** ~3–4 weeks of focused work.
**Each additional language:** ~1–2 weeks (mostly translation, assuming the plumbing is already in place).

---

## Recommended Priority Order

1. **Decide scope** — which languages are actually needed? Start with 2 if possible (e.g., `es` + `en`).
2. **Bootstrap** (Phases 1, 2, 6) — plumbing first, before migrating any strings.
3. **Migrate one high-traffic screen as a pilot** — validates the approach; produces reusable patterns.
4. **Migrate remaining screens incrementally** — one screen per PR keeps review manageable.
5. **Locale-aware formatting** (Phase 4) — do early so new screens use it from the start.
6. **Language switcher UI** (Phase 5) — ship once at least two locales are fully translated.
7. **Add additional languages** — now that the infrastructure is solid.
