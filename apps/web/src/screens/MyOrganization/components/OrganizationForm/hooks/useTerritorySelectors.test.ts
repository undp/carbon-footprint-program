import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { TerritoryLevel, type GetAllTerritoriesResponse } from "@repo/types";
import { useTerritorySelectors } from "./useTerritorySelectors";

const { useTerritories, useTerritoryLevels } = vi.hoisted(() => ({
  useTerritories: vi.fn(),
  useTerritoryLevels: vi.fn(),
}));

vi.mock("@/api/query", () => ({ useTerritories, useTerritoryLevels }));

const REGIONS: GetAllTerritoriesResponse = [
  { id: "1", name: "Cibao Norte", level: TerritoryLevel.PLANNING_REGION },
];
const PROVINCES: GetAllTerritoriesResponse = [
  { id: "2", name: "Santiago", level: TerritoryLevel.PROVINCE },
  { id: "9", name: "Distrito Nacional", level: TerritoryLevel.PROVINCE },
];
const MUNICIPALITIES: GetAllTerritoriesResponse = [
  { id: "3", name: "Tamboril", level: TerritoryLevel.MUNICIPALITY },
];

/** The catalog as the migration loads it: three levels, two still empty. */
const LOADED_LEVELS = [
  TerritoryLevel.PLANNING_REGION,
  TerritoryLevel.PROVINCE,
  TerritoryLevel.MUNICIPALITY,
];

/** Children by parent id, `null` standing for the roots. */
const CHILDREN: Record<string, GetAllTerritoriesResponse> = {
  null: REGIONS,
  "1": PROVINCES,
  "2": MUNICIPALITIES,
  // The Distrito Nacional is itself the municipal level, so it branches no
  // further and its child query resolves to an empty list.
  "9": [],
};

beforeEach(() => {
  vi.clearAllMocks();
  useTerritoryLevels.mockReturnValue({
    data: LOADED_LEVELS,
    isLoading: false,
  });
  useTerritories.mockImplementation((parentId: string | null) => ({
    data: CHILDREN[String(parentId)] ?? [],
    isLoading: false,
  }));
});

const render = (territoryIds?: string[]) =>
  renderHook(() => useTerritorySelectors(territoryIds)).result.current;

describe("useTerritorySelectors — which selectors render", () => {
  it("renders one selector per level the catalog holds rows for", () => {
    const selectors = render();

    expect(selectors.filter((s) => s.visible)).toHaveLength(3);
  });

  it("hides the levels still waiting on an official source", () => {
    // Distritos municipales and parajes are modelled but not loaded. A selector
    // for them would be a control the registrant can never fill.
    const selectors = render();

    expect(selectors[3]?.visible).toBe(false);
    expect(selectors[4]?.visible).toBe(false);
  });

  it("renders nothing until the catalog answers", () => {
    // The section fills in one step rather than growing a selector at a time.
    useTerritoryLevels.mockReturnValue({ data: undefined, isLoading: true });

    expect(render().some((s) => s.visible)).toBe(false);
  });

  it("shows a level that lands later without a code change", () => {
    useTerritoryLevels.mockReturnValue({
      data: [...LOADED_LEVELS, TerritoryLevel.MUNICIPAL_DISTRICT],
      isLoading: false,
    });

    expect(render()[3]?.visible).toBe(true);
  });
});

describe("useTerritorySelectors — locking", () => {
  it("leaves the outermost selector actionable with nothing answered", () => {
    const selectors = render();

    expect(selectors[0]?.disabled).toBe(false);
    expect(selectors[0]?.label).toBe("Región de planificación (Opcional)");
  });

  it("locks a selector whose parent is unanswered", () => {
    const selectors = render();

    expect(selectors[1]?.disabled).toBe(true);
    expect(selectors[2]?.disabled).toBe(true);
  });

  it("labels a locked selector with the answer that unlocks it", () => {
    // Same behaviour as the economic activity while its sector is unanswered:
    // the control stays on screen and says what it is waiting for.
    const selectors = render();

    expect(selectors[1]?.label).toBe("Selecciona la región de planificación");
    expect(selectors[2]?.label).toBe("Selecciona la provincia");
  });

  it("unlocks the next selector once its parent is answered", () => {
    const selectors = render(["1", "", "", "", ""]);

    expect(selectors[1]?.disabled).toBe(false);
    expect(selectors[1]?.label).toBe("Provincia (Opcional)");
    expect(selectors[1]?.options).toEqual([
      { label: "Santiago", value: "2" },
      { label: "Distrito Nacional", value: "9" },
    ]);
  });

  it("keeps a selector locked when the branch chosen has no rows", () => {
    // The Distrito Nacional ends the chain. Its municipio selector stays on
    // screen and stays locked rather than offering an empty list.
    const selectors = render(["1", "9", "", "", ""]);

    expect(selectors[2]?.visible).toBe(true);
    expect(selectors[2]?.disabled).toBe(true);
    expect(selectors[2]?.options).toEqual([]);
  });

  it("offers the municipios of a province that has them", () => {
    const selectors = render(["1", "2", "", "", ""]);

    expect(selectors[2]?.disabled).toBe(false);
    expect(selectors[2]?.options).toEqual([{ label: "Tamboril", value: "3" }]);
  });
});

describe("useTerritorySelectors — level indexes", () => {
  it("numbers the selectors by their position in the form's territoryIds", () => {
    expect(render().map((s) => s.level)).toEqual([0, 1, 2, 3, 4]);
  });

  it("only queries the levels whose parent is answered", () => {
    render(["1", "", "", "", ""]);

    expect(useTerritories).toHaveBeenCalledWith(null);
    expect(useTerritories).toHaveBeenCalledWith("1", { enabled: true });
    expect(useTerritories).toHaveBeenCalledWith(null, { enabled: false });
  });
});
