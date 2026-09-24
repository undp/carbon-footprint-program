import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { AppHttpError } from "@/api/http/errors";
import type { ApiErrorBody, NormalizedError } from "@/api/http/errors";
import { useEmissionCaptureSubmit } from "./useEmissionCaptureSubmit";
import type {
  EmissionCaptureFormLine,
  EmissionCaptureFormValues,
} from "../types/EmissionCaptureTypes";

// The hook reaches the API through the sync mutation and reports through
// notistack; nothing else about them is exercised here.
const { mutateAsyncMock, enqueueSnackbarMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  enqueueSnackbarMock: vi.fn(),
}));

vi.mock(
  "@/api/query/carbonInventories/lines/useSyncCarbonInventoryLines",
  () => ({
    useSyncCarbonInventoryLines: () => ({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    }),
  })
);

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar: enqueueSnackbarMock }),
}));

const apiError = (code: string): AppHttpError => {
  const body: ApiErrorBody = {
    code,
    message: "developer-facing message",
    details: { reason: "YEAR_MISMATCH" },
  };
  const detail: NormalizedError = {
    kind: "unknown",
    message: body.message,
    status: 422,
    request: { url: "https://api.test/lines/sync", method: "POST" },
    body,
  };
  return new AppHttpError(detail);
};

const line: EmissionCaptureFormLine = {
  id: "temp-1",
  lineId: "temp-1",
  subcategoryId: "10",
  isManualTotalEmissions: false,
  dimensionValue1Id: null,
  dimensionValue2Id: null,
  quantity: 5,
  measurementUnitId: null,
  factorSource: "DEFRA 2025",
  factorValue: 2.5,
  factorRateMeasurementUnitId: "1",
  comment: null,
  manualTotalEmissions: null,
  baseFactorId: "99",
  isNew: true,
  isDeleted: false,
  files: [],
  removedFileIds: [],
};

const formValues = {
  subcategories: {
    "10": {
      categoryId: "1",
      lines: { [line.lineId]: line },
      isTotalManualEmissionsModeActive: false,
      isTotalManualEmissionsModeAvailable: false,
    },
  },
} as unknown as EmissionCaptureFormValues;

const submitOnce = async () => {
  const { result } = renderHook(() =>
    useEmissionCaptureSubmit({ inventoryId: "inv-1", isDirty: true })
  );
  await act(() => result.current.submit(formValues));
};

beforeEach(() => {
  mutateAsyncMock.mockReset();
  enqueueSnackbarMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("useEmissionCaptureSubmit", () => {
  it("tells the user the catalogue changed when the sync refuses a factor", async () => {
    mutateAsyncMock.mockRejectedValue(
      apiError("INVALID_EMISSION_FACTOR_REFERENCE")
    );

    await submitOnce();

    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      "El catálogo de factores cambió mientras editabas. Recarga la página para ver los factores disponibles.",
      { variant: "error" }
    );
  });

  it("keeps the generic message for an error the API does not name", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("network down"));

    await submitOnce();

    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      "Error al guardar la huella",
      { variant: "error" }
    );
  });
});
