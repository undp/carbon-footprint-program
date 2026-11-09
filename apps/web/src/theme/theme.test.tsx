import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { theme } from "./theme";

// Same provider order as the root route: the theme outside, so that
// LocalizationProvider reads the picker locale from it.
const renderWithAppProviders = (ui: ReactNode) =>
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        {ui}
      </LocalizationProvider>
    </ThemeProvider>
  );

describe("theme locale", () => {
  it("renders an empty DatePicker in Spanish", () => {
    renderWithAppProviders(<DatePicker label="Fecha" value={null} />);

    const group = screen.getByRole("group", { name: "Fecha" });
    expect(group).toHaveTextContent("DD/MM/AAAA");
    expect(
      screen.getByRole("button", { name: "Elige fecha" })
    ).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Día" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Mes" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Año" })).toBeInTheDocument();
  });

  it("names the Autocomplete popup button «Abrir»", () => {
    renderWithAppProviders(
      <Autocomplete
        options={["DEFRA 2025", "IPCC"]}
        renderInput={(params) => <TextField {...params} label="Fuente" />}
      />
    );

    expect(screen.getByRole("button", { name: "Abrir" })).toBeInTheDocument();
  });
});
