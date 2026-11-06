import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  GetOrganizationRecognitionsResponse,
  SubmissionType,
} from "@repo/types";
import { RecognitionsScreen } from "./RecognitionsScreen";

type Recognition = GetOrganizationRecognitionsResponse[number];

interface ScreenState {
  organizations: { id: string; name: string }[];
  isLoadingOrgs: boolean;
  recognitionsByOrg: Record<string, Recognition[]>;
  isPendingRecognitions: boolean;
  isErrorRecognitions: boolean;
}

const state = vi.hoisted((): ScreenState => ({
  organizations: [],
  isLoadingOrgs: false,
  recognitionsByOrg: {},
  isPendingRecognitions: false,
  isErrorRecognitions: false,
}));

const enqueueSnackbar = vi.hoisted(() => vi.fn());

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock("@/api/query", () => ({
  useMyOrganizations: () => ({
    data: state.organizations,
    isLoading: state.isLoadingOrgs,
  }),
  useOrganizationRecognitions: (organizationId: string) => ({
    data:
      state.isPendingRecognitions || state.isErrorRecognitions
        ? undefined
        : state.recognitionsByOrg[organizationId],
    isPending: state.isPendingRecognitions || !organizationId,
    isError: state.isErrorRecognitions,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components", () => ({
  ScreenEmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

// The header stub exposes the props the screen derives and lets the test pick
// an organization or a year without going through MUI's Select.
vi.mock("./RecognitionScreenHeader", () => ({
  RecognitionScreenHeader: ({
    organizations,
    selectedOrganizationId,
    onOrganizationChange,
    availableYears,
    selectedYear,
    onYearChange,
  }: {
    organizations: { id: string; name: string }[];
    selectedOrganizationId: string;
    onOrganizationChange: (id: string) => void;
    availableYears: number[];
    selectedYear: string;
    onYearChange: (year: string) => void;
  }) => (
    <div data-testid="header">
      <span data-testid="selected-org">{selectedOrganizationId}</span>
      <span data-testid="years">{availableYears.join(",")}</span>
      <span data-testid="selected-year">{selectedYear || "Todos"}</span>
      {organizations.map((o) => (
        <button key={o.id} onClick={() => onOrganizationChange(o.id)}>
          {`org-${o.id}`}
        </button>
      ))}
      {availableYears.map((y) => (
        <button key={y} onClick={() => onYearChange(String(y))}>
          {`year-${y}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./RecognitionsKpis", () => ({
  RecognitionsKpis: ({ recognitions }: { recognitions: Recognition[] }) => (
    <div data-testid="kpis">{recognitions.length}</div>
  ),
}));

vi.mock("./RecognitionsTable", () => ({
  RecognitionsTable: ({ rows }: { rows: Recognition[] }) => (
    <div data-testid="rows">{rows.map((r) => r.submissionId).join(",")}</div>
  ),
}));

const recognition = (
  submissionId: string,
  measurementYear: number,
  submissionType: Recognition["submissionType"] = SubmissionType.CARBON_INVENTORY_CALCULATION
): Recognition => ({
  submissionId,
  earningDate: null,
  measurementYear,
  submissionType,
  totalEmissions: null,
  recognitionFileUrl: null,
});

const NO_RECOGNITIONS_TITLE = "Aún no tienes huellas con reconocimientos";

describe("RecognitionsScreen", () => {
  beforeEach(() => {
    state.organizations = [
      { id: "1", name: "Org 1" },
      { id: "2", name: "Org 2" },
      { id: "3", name: "Org 3" },
    ];
    state.isLoadingOrgs = false;
    state.isPendingRecognitions = false;
    state.isErrorRecognitions = false;
    enqueueSnackbar.mockClear();
    state.recognitionsByOrg = {
      "1": [
        recognition(
          "v-2025",
          2025,
          SubmissionType.CARBON_INVENTORY_VERIFICATION
        ),
        recognition("m-2025", 2025),
      ],
      // Only the automatic measurement recognition of a self-declared footprint.
      "2": [recognition("m-2026", 2026)],
      "3": [],
    };
  });

  it("lists an automatic measurement recognition and offers its year", () => {
    state.organizations = [{ id: "2", name: "Org 2" }];

    render(<RecognitionsScreen />);

    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("years")).toHaveTextContent("2026");
    expect(screen.getByTestId("rows")).toHaveTextContent("m-2026");
    expect(screen.getByTestId("kpis")).toHaveTextContent("1");
  });

  it("shows the empty state below the header when there are no recognitions", () => {
    render(<RecognitionsScreen />);
    fireEvent.click(screen.getByText("org-3"));

    expect(screen.getByTestId("empty-state")).toHaveTextContent(
      NO_RECOGNITIONS_TITLE
    );
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.queryByTestId("rows")).not.toBeInTheDocument();

    // The organization selector is still there to leave the empty state.
    fireEvent.click(screen.getByText("org-1"));
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("rows")).toHaveTextContent("v-2025,m-2025");
  });

  it("does not show the empty state while the organizations load", () => {
    state.organizations = [];
    state.isLoadingOrgs = true;

    render(<RecognitionsScreen />);

    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show the empty state while the recognitions load", () => {
    state.isPendingRecognitions = true;

    render(<RecognitionsScreen />);

    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("reports a failed request instead of showing the empty state or zeroed KPIs", () => {
    state.isErrorRecognitions = true;

    render(<RecognitionsScreen />);

    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kpis")).not.toBeInTheDocument();
    expect(screen.queryByTestId("rows")).not.toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      "Error al cargar los reconocimientos",
      { variant: "error" }
    );
  });

  it("filters the rows by the selected year", () => {
    state.recognitionsByOrg["1"] = [
      recognition("m-2026", 2026),
      recognition("m-2025", 2025),
    ];

    render(<RecognitionsScreen />);
    expect(screen.getByTestId("years")).toHaveTextContent("2026,2025");

    fireEvent.click(screen.getByText("year-2025"));

    expect(screen.getByTestId("selected-year")).toHaveTextContent("2025");
    expect(screen.getByTestId("rows")).toHaveTextContent("m-2025");
    expect(screen.getByTestId("rows")).not.toHaveTextContent("m-2026");
    expect(screen.getByTestId("kpis")).toHaveTextContent("1");
  });

  it("resets the year to all years when switching organization", () => {
    state.recognitionsByOrg["2"] = [
      recognition("m-2026", 2026),
      recognition("o2-2025", 2025),
    ];

    render(<RecognitionsScreen />);
    fireEvent.click(screen.getByText("year-2025"));
    fireEvent.click(screen.getByText("org-2"));

    expect(screen.getByTestId("selected-year")).toHaveTextContent("Todos");
    expect(screen.getByTestId("rows")).toHaveTextContent("m-2026,o2-2025");

    fireEvent.click(screen.getByText("org-1"));
    expect(screen.getByTestId("selected-year")).toHaveTextContent("Todos");
    expect(screen.getByTestId("rows")).toHaveTextContent("v-2025,m-2025");
  });

  it("falls back to all years when a refetch no longer returns the selected year", () => {
    state.recognitionsByOrg["1"] = [
      recognition("m-2026", 2026),
      recognition("m-2025", 2025),
    ];

    const { rerender } = render(<RecognitionsScreen />);
    fireEvent.click(screen.getByText("year-2025"));

    state.recognitionsByOrg["1"] = [recognition("m-2026", 2026)];
    rerender(<RecognitionsScreen />);

    expect(screen.getByTestId("selected-year")).toHaveTextContent("Todos");
    expect(screen.getByTestId("rows")).toHaveTextContent("m-2026");
  });
});
