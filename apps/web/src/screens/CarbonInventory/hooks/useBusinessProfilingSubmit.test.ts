import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import { useBusinessProfilingSubmit } from "./useBusinessProfilingSubmit";
import type { BusinessProfilingFormValues } from "./useBusinessProfilingForm";

// The hook reaches the API through these two query hooks and notistack; nothing
// else about them is exercised here. `vi.hoisted` gives the mocks a stable
// identity the hoisted `vi.mock` factories can close over.
const { inventoryQueryMock, mutateAsyncMock, enqueueSnackbarMock } = vi.hoisted(
  () => ({
    inventoryQueryMock: vi.fn(),
    mutateAsyncMock: vi.fn(),
    enqueueSnackbarMock: vi.fn(),
  })
);

vi.mock("@/api/query", () => ({
  useCarbonInventory: inventoryQueryMock,
  useUpdateCarbonInventory: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar: enqueueSnackbarMock }),
}));

type Inventory = GetCarbonInventoryByIdResponse;

// Only `year` and the factor fields of each line are read; the rest of the
// response is never touched, so it is left out rather than faked. The lines
// have to be real shapes rather than empty slots: the hook asks each one
// whether it is catalogue-backed, which is what decides if a year change is
// worth warning about at all.
const catalogueLine = {
  baseFactorId: "1",
  factorValue: 2.5,
  factorSource: "DEFRA 2025",
};
const manualLine = {
  baseFactorId: null,
  factorValue: 9.9,
  factorSource: "Otro",
};

const inventory = (
  year: number | null,
  lines: object[] = [catalogueLine]
): Inventory =>
  ({
    year,
    subcategories: [{ lines }],
  }) as unknown as Inventory;

const formValues = (year: string): BusinessProfilingFormValues => ({
  year,
  name: "Huella 2025",
  companyName: "Acme",
  sector: "1",
  subSector: "2",
  companySize: "3",
  activity: "4",
  usageMode: "EXPERT",
  quantity: 10,
});

const setUp = (onKeepYear = vi.fn(), onSuccess = vi.fn()) => {
  const { result } = renderHook(() =>
    useBusinessProfilingSubmit({
      inventoryId: "inv-1",
      onSuccess,
      onKeepYear,
    })
  );
  return { result, onKeepYear, onSuccess };
};

beforeEach(() => {
  inventoryQueryMock.mockReset();
  mutateAsyncMock.mockReset();
  enqueueSnackbarMock.mockReset();
  inventoryQueryMock.mockReturnValue({ data: inventory(2025) });
  mutateAsyncMock.mockResolvedValue(undefined);
});

describe("useBusinessProfilingSubmit", () => {
  it("holds the save back when the year changes on a catalogue-backed footprint", async () => {
    const { result } = setUp();

    await act(() => result.current.submit(formValues("2026"), true));

    expect(result.current.yearChangeConfirmation.isOpen).toBe(true);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("saves straight away when every line carries a hand-typed factor", async () => {
    inventoryQueryMock.mockReturnValue({ data: inventory(2025, [manualLine]) });
    const { result } = setUp();

    await act(() => result.current.submit(formValues("2026"), true));

    // A year change clears the catalogue factors and nothing else, so a
    // footprint captured by hand loses nothing to it. Warning anyway would ask
    // the user to weigh a cost that is not there.
    expect(result.current.yearChangeConfirmation.isOpen).toBe(false);
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026 })
    );
  });

  it("saves without the year when only the other fields changed", async () => {
    const { result } = setUp();

    await act(() => result.current.submit(formValues("2025"), true));

    expect(result.current.yearChangeConfirmation.isOpen).toBe(false);
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ year: undefined, name: "Huella 2025" })
    );
  });

  it("restores the stored year when the change is declined", async () => {
    const { result, onKeepYear, onSuccess } = setUp();

    await act(() => result.current.submit(formValues("2026"), true));
    act(() => result.current.yearChangeConfirmation.cancel());

    // Declining closes the dialog, drops the save and hands the year back to
    // the form — otherwise the field would keep contradicting the button, the
    // dialog would reopen on the next attempt, and the edits that travelled in
    // the same request would be lost with it.
    expect(result.current.yearChangeConfirmation.isOpen).toBe(false);
    expect(onKeepYear).toHaveBeenCalledTimes(1);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("keeps the year the user picked when the change is confirmed", async () => {
    const { result, onKeepYear, onSuccess } = setUp();

    await act(() => result.current.submit(formValues("2026"), true));
    // `confirm` fires the mutation without returning it — the dialog stays open
    // until it settles — so the act callback is what waits for the microtasks.
    await act(async () => {
      result.current.yearChangeConfirmation.confirm();
      await Promise.resolve();
    });

    expect(onKeepYear).not.toHaveBeenCalled();
    expect(mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026 })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
