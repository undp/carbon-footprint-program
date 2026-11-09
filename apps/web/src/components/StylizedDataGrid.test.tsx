import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GridColDef } from "@mui/x-data-grid";
import { StylizedDataGrid } from "./StylizedDataGrid";

const columns: GridColDef[] = [{ field: "name", headerName: "Nombre" }];
const rows = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Fila ${index + 1}`,
}));

const noMatchFilter = {
  filter: {
    filterModel: {
      items: [{ field: "name", operator: "equals", value: "Inexistente" }],
    },
  },
};

const paginated = {
  hideFooter: false,
  pageSizeOptions: [5],
  initialState: { pagination: { paginationModel: { pageSize: 5, page: 1 } } },
};

describe("StylizedDataGrid locale", () => {
  it("shows the no-results overlay in Spanish when a filter matches nothing", async () => {
    render(
      <StylizedDataGrid
        rows={rows}
        columns={columns}
        initialState={noMatchFilter}
      />
    );

    expect(
      await screen.findByText("Resultados no encontrados")
    ).toBeInTheDocument();
    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
  });

  it("lets a caller noRowsLabel win over its own text", async () => {
    render(
      <StylizedDataGrid
        rows={[]}
        columns={columns}
        localeText={{ noRowsLabel: "No hay huellas disponibles" }}
      />
    );

    expect(
      await screen.findByText("No hay huellas disponibles")
    ).toBeInTheDocument();
  });

  it("keeps the Spanish pagination labels when the caller only sets noRowsLabel", async () => {
    render(
      <StylizedDataGrid
        rows={rows}
        columns={columns}
        localeText={{ noRowsLabel: "Sin filas" }}
        {...paginated}
      />
    );

    expect(
      await screen.findByRole("button", { name: "Ir a la página siguiente" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ir a la página anterior" })
    ).toBeInTheDocument();
  });
});
