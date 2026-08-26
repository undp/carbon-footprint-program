# Number Formatting (Web)

Every number the web app renders goes through one object: the `Formatter` singleton exported from `apps/web/src/utils/formatting.ts`. This page is the practical reference — which method to call, what each one guarantees, and the two rules that are easy to get wrong.

> For where precision comes from and where it is lost between PostgreSQL and the browser, see [Display Precision](../architecture/emission-calculation.md#display-precision). For what "intensity" means, see the [Glossary](../glossary.md#emission-intensity).

---

## The one rule

**Never call `toFixed`, `toLocaleString` or a bare `Intl.NumberFormat` in a component.** The formatter is instantiated once with `APP_LOCALE` (`es-ES`) and a shared set of `Intl` instances; ad-hoc formatting produces a number that looks subtly different from the one in the next column, and silently ignores the thresholds below.

```ts
import { formatter } from "@/utils/formatting";

formatter.emissions(1096.30800964); // "1.096,31 tCO₂e"
```

---

## Picking a method

| Method                    | Use for                                               | Output                                                                     |
| ------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `emissions(v)`            | Any tCO₂e figure: line, subtotal, category, total     | `"1.096,31 tCO₂e"` — pass `{ withSuffix: false }` inside a labelled column |
| `quantity(v)`             | An activity quantity the user typed                   | `"21.600"`                                                                 |
| `emissionFactor(v)`       | An emission factor, always                            | `"0,05694"`                                                                |
| `emissionIntensity(rate)` | Emissions per unit of main activity                   | `{ value: "59,26", unit: "gCO₂e" }`                                        |
| `exact(v)`                | Audit affordances only — tooltips, calculation chains | `"0,0569444444"`                                                           |
| `percentage(f)`           | A fraction rendered as a percentage                   | `"17,9 %"`                                                                 |

All of them accept `null` / `undefined` / `NaN` and return a placeholder, overridable with `{ ifEmpty }`.

### Why factors have their own method

`emissions()` and `quantity()` round to **2 decimals** above `0,01`. Applied to a factor, that turns `0,056944` into `0,06` — and the user who multiplies the displayed factor by the displayed quantity no longer arrives at the displayed emissions. Since almost every combustion and electricity factor lives in exactly that range, `emissionFactor()` targets **4 significant digits** instead, bounded by a floor of 2 and a ceiling of 6 decimals.

The bounds take precedence over the significant-digit target, on purpose:

| Value       | Rendered    | Why                                                       |
| ----------- | ----------- | --------------------------------------------------------- |
| `0,0569444` | `0,05694`   | 4 significant digits                                      |
| `2,68`      | `2,68`      | already exact                                             |
| `1164,4894` | `1.164,49`  | floor of 2 decimals wins — never less precise than before |
| `0,0000005` | `<0,000001` | below the ceiling of 6 decimals                           |

### Why intensity returns an object

`emissionIntensity()` picks the mass unit that keeps the number in `[1, 1000)` — `tCO₂e` above 1 t, `kgCO₂e` above 1 kg, `gCO₂e` below — and returns value and unit **separately**, because the equivalence card renders the number in a hero typography and the unit in its own element, and each consumer appends the activity name differently.

```tsx
const intensity = formatter.emissionIntensity(equivalence.rate);
// { value: "59,26", unit: "gCO₂e" }
<Typography>
  {intensity.value} {intensity.unit}/{equivalence.activityName}
</Typography>;
```

Its scope is deliberately narrow: **only** the equivalence card (step 5 and home) and the step-4 caption. Inventory totals, rankings and the transparency portal stay in tCO₂e — a unit that changes with magnitude cannot be compared across inventories.

---

## Audit affordances

Rounding for legibility is safe only if the underlying number stays reachable. Two components do that, and both follow the same rule.

Use `DetailTooltipText` (`@/components`), which renders a dotted underline and opens on hover, **keyboard focus and tap** — an audit trail reachable only with a mouse is no audit trail on a tablet.

```tsx
const displayed = formatter.emissionFactor(value);
const exact = formatter.exact(value);

<DetailTooltipText
  detail={
    displayed === exact ? "" : `Valor usado en el cálculo: ${exact} ${unit}`
  }
  tabIndex={tabIndex}
>
  {displayed} {unit}
</DetailTooltipText>;
```

Two things that are not optional:

- **`detail` must be empty when the rounding hides nothing.** A tooltip repeating the cell verbatim teaches users that the affordance is noise, and they stop opening the ones that matter. `DetailTooltipText` renders plain text when `detail` is falsy, so the comparison above is the whole guard.
- **Inside a DataGrid, forward `GridRenderCellParams.tabIndex`.** The component defaults to `tabIndex={0}` for standalone use; leaving that default in a grid cell adds one fixed tab stop per rendered row instead of joining the grid's roving-tabindex model.

For a calculation chain, every operand must come from `exact()` — a rounded operand produces a line that does not multiply out, which defeats the point:

```
21.600 h × 0,057 kg/h = 1.231,2 kg = 1,2312 t
```

---

## Input precision

Display precision and input precision are separate settings, and they intentionally differ:

| Constant                     | Value | Applies to                                          |
| ---------------------------- | ----- | --------------------------------------------------- |
| `INPUT_DECIMAL_SCALE`        | 4     | Default for every decimal `NumericInput` in the app |
| `FACTOR_INPUT_DECIMAL_SCALE` | 10    | The emission-factor cell only (own factors)         |
| `DB_DECIMAL_SCALE`           | 10    | What `Decimal(28,10)` preserves                     |

A factor input must accept everything the database can store, otherwise an official factor pasted by the user is truncated on the way in with no warning. Raising the global scale instead would change quantities, reduction scenarios and every other numeric form — so the two coexist. `FormNumericField` forces `0` when `onlyInteger` is set; that is the other deliberate exception.

---

## Exports

Excel has no tooltip to compensate a rounded display, so `exportCarbonInventoryToExcel.ts` writes the factor as a **numeric** cell with a number format derived from the constants above, out to the database's 10 decimals — never as a preformatted string. The rate unit travels inside the cell's number format, because it varies per row and a single column header cannot carry it.

---

## Where the numbers live

| Concern                 | Path                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Formatter               | `apps/web/src/utils/formatting.ts`                                                      |
| Thresholds and scales   | `apps/web/src/config/constants.ts`                                                      |
| Audit tooltip component | `apps/web/src/components/DetailTooltipText.tsx`                                         |
| Formatter tests         | `apps/web/src/utils/formatting.test.ts`                                                 |
| Pinned acceptance case  | [Manual Testing — Emission Capture](./manual-testing-emission-capture.md)               |
| Normative rules         | `openspec/specs/emission-factor-precision/`, `openspec/specs/emission-intensity-units/` |
