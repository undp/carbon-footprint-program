import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import type {
  DuplicateEmissionFactorYearRequest,
  GetAllEmissionFactorsResponse,
  GetEmissionFactorDimensionsResponse,
} from "@repo/types";
import { AppHttpError } from "@/api/http/errors";
import { EmissionFactorYearCopyScreen } from "./EmissionFactorYearCopyScreen";

type Factor = GetAllEmissionFactorsResponse[number];

// The year window slides with the clock, so the years follow it too.
const SOURCE_YEAR = new Date().getFullYear();
const TARGET_YEAR = SOURCE_YEAR + 1;
const OLDER_YEAR = SOURCE_YEAR - 1;

const state = vi.hoisted(() => ({
  factors: [] as GetAllEmissionFactorsResponse,
  dimensions: [] as GetEmissionFactorDimensionsResponse,
  status: "UNPUBLISHED",
  mutateAsync: vi.fn(),
  navigate: vi.fn(),
  enqueueSnackbar: vi.fn(),
}));

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar: state.enqueueSnackbar }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
  useBlocker: () => ({ status: "idle" }),
}));
vi.mock("@/contexts", () => ({
  useExplanationDialog: () => ({ openExplanationBySlug: vi.fn() }),
}));
vi.mock("@/api/query/maintainer", () => ({
  useEmissionFactors: () => ({
    data: state.factors,
    isLoading: false,
    isError: false,
  }),
  useEmissionFactorDimensions: () => ({ data: state.dimensions }),
  useDuplicateEmissionFactorYear: () => ({
    mutateAsync: state.mutateAsync,
    isPending: false,
  }),
}));
vi.mock("../hooks/useMaintainerMethodologyScope", () => ({
  useMaintainerMethodologyScope: () => ({
    methodologyVersionId: "1",
    targetMethodology: { id: "1", name: "Versión 2", status: state.status },
    methodologySelector: null,
  }),
}));

const GAS_DETAILS = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

let nextId = 100;
const factor = (overrides: Partial<Factor> = {}): Factor => {
  nextId += 1;
  return {
    id: String(nextId),
    value: "2.5",
    source: "DEFRA 2026",
    year: SOURCE_YEAR,
    subcategoryId: "10",
    subcategoryName: "Combustiones estacionarias",
    dimensionValue1Id: "101",
    dimensionValue1Name: "Biodiésel",
    dimensionValue2Id: null,
    dimensionValue2Name: null,
    rateMeasurementUnitId: "1",
    rateMeasurementUnitName: "kg/GJ",
    gasDetails: GAS_DETAILS,
    referencedLineCount: 0,
    unclaimedReferencedLineCount: 0,
    ...overrides,
  };
};

const electricity = (overrides: Partial<Factor> = {}) =>
  factor({
    subcategoryId: "20",
    subcategoryName: "Electricidad",
    dimensionValue1Id: "201",
    dimensionValue1Name: "Sistema nacional",
    rateMeasurementUnitId: "4",
    rateMeasurementUnitName: "kg/kWh",
    value: "0.177",
    ...overrides,
  });

const rowOf = (text: string): HTMLElement => {
  const row = screen
    .getAllByText(text)[0]
    ?.closest<HTMLElement>('[role="row"]');
  if (!row) throw new Error(`No row with ${text}`);
  return row;
};
const valueInputOf = (text: string) =>
  within(rowOf(text)).getByRole("textbox", { name: "Valor de destino" });
const sourceInputOf = (row: HTMLElement) =>
  within(row).getByRole("combobox", { name: "Fuente de destino" });
const copyButton = () => screen.getByRole("button", { name: /^Copiar \d+/ });

const typeValue = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};

/** Picks an option of a MUI select, which is not a native one. */
const pick = (combobox: HTMLElement, option: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(screen.getByRole("option", { name: option }));
};

const selectYear = (label: string, year: number) =>
  pick(screen.getByRole("combobox", { name: label }), String(year));

const postedRequest = (): DuplicateEmissionFactorYearRequest =>
  state.mutateAsync.mock.calls[0]?.[0] as DuplicateEmissionFactorYearRequest;

const conflictError = () =>
  new AppHttpError({
    kind: "unknown",
    message: "conflict",
    status: 409,
    request: { url: "https://api.test/emission-factors", method: "POST" },
    body: {
      code: "EMISSION_FACTOR_YEAR_COPY_CONFLICT",
      message: "conflict",
    },
  });

describe("EmissionFactorYearCopyScreen", () => {
  beforeEach(() => {
    state.factors = [electricity(), factor({ value: "1720" })];
    state.dimensions = [];
    state.status = "UNPUBLISHED";
    state.mutateAsync.mockReset();
    state.mutateAsync.mockResolvedValue({
      copiedCount: 2,
      editedCount: 0,
      excludedCount: 0,
      skipped: { existingCount: 0 },
    });
    state.navigate.mockReset();
    state.enqueueSnackbar.mockReset();
  });

  it("starts from the latest year into the next one", () => {
    render(<EmissionFactorYearCopyScreen />);

    expect(screen.getByRole("combobox", { name: "Origen" })).toHaveTextContent(
      String(SOURCE_YEAR)
    );
    expect(screen.getByRole("combobox", { name: "Destino" })).toHaveTextContent(
      String(TARGET_YEAR)
    );
    expect(copyButton()).toHaveTextContent(
      `Copiar 2 factores a ${TARGET_YEAR}`
    );
  });

  describe("numbers", () => {
    it("posts 1000 for «1.000» and 0.207 for «0,207»", async () => {
      render(<EmissionFactorYearCopyScreen />);

      typeValue(valueInputOf("Combustiones estacionarias"), "1.000");
      typeValue(valueInputOf("Electricidad"), "0,207");
      fireEvent.click(copyButton());

      await waitFor(() => expect(state.mutateAsync).toHaveBeenCalled());
      const values = Object.fromEntries(
        postedRequest().changes.map(({ sourceFactorId, value }) => [
          sourceFactorId,
          value,
        ])
      );
      expect(Object.values(values).sort()).toEqual([0.207, 1000]);
    });

    it("shows a stored 1000000 as «1.000.000»", () => {
      state.factors = [factor({ value: "1000000" })];
      render(<EmissionFactorYearCopyScreen />);

      expect(
        within(rowOf("Combustiones estacionarias")).getByText("1.000.000")
      ).toBeInTheDocument();
    });

    it("blocks the copy on an emptied value", () => {
      render(<EmissionFactorYearCopyScreen />);

      typeValue(valueInputOf("Electricidad"), "");

      expect(copyButton()).toBeDisabled();
      expect(valueInputOf("Electricidad")).toHaveAttribute(
        "aria-invalid",
        "true"
      );
    });

    it("tints a row whose value changed", () => {
      render(<EmissionFactorYearCopyScreen />);

      typeValue(valueInputOf("Electricidad"), "0,207");

      expect(rowOf("Electricidad")).toHaveClass("row--edited");
      expect(rowOf("Combustiones estacionarias")).not.toHaveClass(
        "row--edited"
      );
    });

    it("warns about a ÷1000 change without blocking", () => {
      render(<EmissionFactorYearCopyScreen />);

      typeValue(valueInputOf("Combustiones estacionarias"), "1,72");

      expect(
        within(rowOf("Combustiones estacionarias")).getByText("÷1000")
      ).toBeInTheDocument();
      expect(screen.getByText("1 alerta")).toBeInTheDocument();
      expect(copyButton()).toBeEnabled();
    });
  });

  describe("sources", () => {
    it("copies a second source in a subcategory", async () => {
      state.factors = [
        factor({
          rateMeasurementUnitId: "1",
          rateMeasurementUnitName: "kg/GJ",
        }),
        factor({
          rateMeasurementUnitId: "2",
          rateMeasurementUnitName: "kg/kg",
        }),
      ];
      render(<EmissionFactorYearCopyScreen />);

      const source = sourceInputOf(rowOf("kg/GJ"));
      fireEvent.change(source, { target: { value: "DEFRA 2027" } });
      fireEvent.blur(source);
      fireEvent.click(copyButton());

      await waitFor(() => expect(state.mutateAsync).toHaveBeenCalled());
      expect(postedRequest().changes).toEqual([
        { sourceFactorId: state.factors[0].id, source: "DEFRA 2027" },
      ]);
    });

    it("blocks two alternatives of one row that end with one source", () => {
      state.factors = [
        factor({ source: "DEFRA 2026" }),
        factor({ source: "IPCC 2006" }),
      ];
      render(<EmissionFactorYearCopyScreen />);

      const ipccRow = rowOf("IPCC 2006");
      const source = sourceInputOf(ipccRow);
      fireEvent.change(source, { target: { value: "defra 2026" } });
      fireEvent.blur(source);

      expect(copyButton()).toBeDisabled();
      expect(
        screen.getByText(/2 factores quedarían duplicados/)
      ).toBeInTheDocument();
      for (const row of screen
        .getAllByRole("combobox", { name: "Fuente de destino" })
        .map((input) => input.closest<HTMLElement>('[role="row"]')!)) {
        expect(sourceInputOf(row)).toHaveAttribute("aria-invalid", "true");
      }
    });
  });

  it("shows a factor already in the target year as read-only", () => {
    state.factors = [
      electricity(),
      factor(),
      electricity({ year: TARGET_YEAR, value: "0.3", source: "Red 2027" }),
    ];
    render(<EmissionFactorYearCopyScreen />);
    // The latest year with factors is now the target one.
    selectYear("Origen", SOURCE_YEAR);

    const row = rowOf("Electricidad");
    expect(within(row).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(row).getByText("Red 2027")).toBeInTheDocument();
    expect(within(row).getByText("0,3")).toBeInTheDocument();
    expect(copyButton()).toHaveTextContent(`Copiar 1 factor a ${TARGET_YEAR}`);
    expect(screen.getByText(/1 ya existe/)).toBeInTheDocument();
  });

  it("disables the copy when nothing would be copied", () => {
    state.factors = [
      electricity(),
      electricity({ year: TARGET_YEAR, value: "0.3" }),
    ];
    render(<EmissionFactorYearCopyScreen />);
    selectYear("Origen", SOURCE_YEAR);

    expect(copyButton()).toBeDisabled();
  });

  describe("years", () => {
    beforeEach(() => {
      state.factors = [
        electricity(),
        electricity({ year: OLDER_YEAR, value: "0.15" }),
      ];
    });

    it("asks before changing «Origen» with edits, and discards them", async () => {
      render(<EmissionFactorYearCopyScreen />);
      typeValue(valueInputOf("Electricidad"), "0,207");

      selectYear("Origen", OLDER_YEAR);
      expect(
        screen.getByText(/Se descartarán los cambios/)
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Cambiar y descartar" })
      );
      await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));

      expect(
        screen.getByRole("combobox", { name: "Origen" })
      ).toHaveTextContent(String(OLDER_YEAR));
      expect(valueInputOf("Electricidad")).toHaveValue("0,15");
      expect(screen.getByText("0 de 1 con cambios")).toBeInTheDocument();
    });

    it("keeps the edits when «Destino» changes", () => {
      render(<EmissionFactorYearCopyScreen />);
      typeValue(valueInputOf("Electricidad"), "0,207");

      selectYear("Destino", OLDER_YEAR - 1);

      expect(valueInputOf("Electricidad")).toHaveValue("0,207");
      expect(screen.getByText("1 de 1 con cambios")).toBeInTheDocument();
    });
  });

  it("keeps the edits when the copy answers 409", async () => {
    state.mutateAsync.mockRejectedValue(conflictError());
    render(<EmissionFactorYearCopyScreen />);

    typeValue(valueInputOf("Electricidad"), "0,207");
    fireEvent.click(copyButton());

    await waitFor(() =>
      expect(state.enqueueSnackbar).toHaveBeenCalledWith({
        message:
          "Otra persona creó factores en el año de destino mientras copiabas. No se copió nada: vuelve a intentarlo.",
        variant: "error",
      })
    );
    expect(valueInputOf("Electricidad")).toHaveValue("0,207");
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("returns to the grid with a summary after a copy", async () => {
    render(<EmissionFactorYearCopyScreen />);

    fireEvent.click(copyButton());

    await waitFor(() => expect(state.navigate).toHaveBeenCalled());
    expect(state.enqueueSnackbar).toHaveBeenCalledWith({
      message: `Se copiaron 2 factores a ${TARGET_YEAR}, 0 con cambios.`,
      variant: "success",
    });
  });

  it("says the copy is live at once over the published version", () => {
    state.status = "PUBLISHED";
    render(<EmissionFactorYearCopyScreen />);

    expect(
      screen.getByText(
        new RegExp(
          `lo que copies queda disponible de inmediato para las huellas de ${TARGET_YEAR}`
        )
      )
    ).toBeInTheDocument();
  });

  describe("grid filters", () => {
    it("names the dimensions when the subcategory column is filtered to one", async () => {
      state.dimensions = [
        {
          subcategoryId: "20",
          subcategoryName: "Electricidad",
          subcategoryHasEmissionFactors: true,
          dimensions: [
            {
              id: "1",
              code: "grid",
              name: "Red eléctrica",
              position: 1,
              isRequired: true,
              values: [],
            },
          ],
        },
      ];
      render(<EmissionFactorYearCopyScreen />);
      expect(
        screen.getByRole("columnheader", { name: "Variable 1" })
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
      pick(
        await screen.findByRole("combobox", { name: "Columnas" }),
        "Sub-categoría"
      );
      pick(
        await screen.findByRole("combobox", { name: "Valor" }),
        "Electricidad"
      );

      expect(
        await screen.findByRole("columnheader", { name: "Red eléctrica" })
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByText("Combustiones estacionarias", {
            selector: '[role="gridcell"] *, [role="gridcell"]',
          })
        ).not.toBeInTheDocument()
      );
    });

    it("narrows the rows with the quick search", async () => {
      render(<EmissionFactorYearCopyScreen />);

      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "Biodiésel" },
      });

      await waitFor(() =>
        expect(screen.queryByText("Electricidad")).not.toBeInTheDocument()
      );
      expect(
        screen.getByText("Combustiones estacionarias")
      ).toBeInTheDocument();
    });
  });
});
