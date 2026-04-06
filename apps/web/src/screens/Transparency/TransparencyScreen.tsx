import { FC, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Container,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import Fuse from "fuse.js";
import { LatamFootprintIcon } from "@/icons";
import { Header } from "@/screens/Landing/components/Header";
import {
  TransparencyDataGrid,
  type TransparencyRow,
} from "./components/TransparencyDataGrid";
import { SearchBar } from "./components/SearchBar";
import { YearFilter } from "./components/YearFilter";
import type { TransparencyCompany } from "@repo/types";

// TODO: Replace mock data with useTransparencyData hook when API is available
// import { useTransparencyData } from "@/api/query";
const MOCK_DATA: TransparencyCompany[] = [
  {
    companyName: "Cementera del Valle",
    sectorName: "Industria Manufacturera",
    subsectorName: "Cemento y Hormigón",
    recognitions: { measurement: true, verification: true, reduction: true },
    years: [2022, 2023, 2024],
  },
  {
    companyName: "Viña Santa Elena",
    sectorName: "Agricultura y Ganadería",
    subsectorName: "Viticultura",
    recognitions: { measurement: true, verification: true, reduction: false },
    years: [2023, 2024],
  },
  {
    companyName: "Banco Continental",
    sectorName: "Servicios Financieros",
    subsectorName: "Banca Comercial",
    recognitions: { measurement: true, verification: false, reduction: false },
    years: [2024],
  },
  {
    companyName: "Minera Los Andes",
    sectorName: "Minería",
    subsectorName: "Minería del Cobre",
    recognitions: { measurement: true, verification: true, reduction: true },
    years: [2021, 2022, 2023, 2024],
  },
  {
    companyName: "Supermercados del Sur",
    sectorName: "Comercio",
    subsectorName: "Retail Alimentario",
    recognitions: { measurement: true, verification: true, reduction: false },
    years: [2023, 2024],
  },
  {
    companyName: "Transportes Pacífico",
    sectorName: "Transporte y Logística",
    subsectorName: "Transporte Terrestre",
    recognitions: { measurement: true, verification: false, reduction: false },
    years: [2024],
  },
  {
    companyName: "Hotel Patagonia",
    sectorName: "Turismo y Hotelería",
    subsectorName: "Hotelería",
    recognitions: { measurement: true, verification: true, reduction: true },
    years: [2022, 2023, 2024],
  },
  {
    companyName: "Farmacéutica del Norte",
    sectorName: "Industria Manufacturera",
    subsectorName: "Productos Farmacéuticos",
    recognitions: { measurement: true, verification: true, reduction: false },
    years: [2023, 2024],
  },
  {
    companyName: "Constructora Horizonte",
    sectorName: "Construcción",
    subsectorName: "Edificación Residencial",
    recognitions: { measurement: true, verification: false, reduction: false },
    years: [2024],
  },
  {
    companyName: "Energía Verde SpA",
    sectorName: "Energía",
    subsectorName: "Energías Renovables",
    recognitions: { measurement: true, verification: true, reduction: true },
    years: [2021, 2022, 2023, 2024],
  },
  {
    companyName: "Textiles Andina",
    sectorName: "Industria Manufacturera",
    subsectorName: "Textil y Confección",
    recognitions: { measurement: true, verification: false, reduction: false },
    years: [2023],
  },
  {
    companyName: "Pesquera Austral",
    sectorName: "Pesca y Acuicultura",
    subsectorName: "Pesca Industrial",
    recognitions: { measurement: true, verification: true, reduction: false },
    years: [2022, 2023, 2024],
  },
  {
    companyName: "Universidad del Pacífico",
    sectorName: "Educación",
    subsectorName: "Educación Superior",
    recognitions: { measurement: true, verification: true, reduction: true },
    years: [2023, 2024],
  },
  {
    companyName: "Clínica Las Condes",
    sectorName: "Salud",
    subsectorName: "Servicios Hospitalarios",
    recognitions: { measurement: true, verification: true, reduction: false },
    years: [2024],
  },
  {
    companyName: "Agrícola Los Robles",
    sectorName: "Agricultura y Ganadería",
    subsectorName: "Fruticultura",
    recognitions: { measurement: true, verification: false, reduction: false },
    years: [2023, 2024],
  },
];

export const TransparencyScreen: FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  // TODO: Replace with real API call when backend is available
  // const { data = [], isLoading } = useTransparencyData(selectedYear);
  const isLoading = false;

  // Extract all unique years from the full dataset for the filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    MOCK_DATA.forEach((company) => {
      company.years.forEach((y) => yearsSet.add(y));
    });
    return [...yearsSet].sort((a, b) => b - a);
  }, []);

  // Flatten companies into rows (one row per company per year)
  const flatRows: TransparencyRow[] = useMemo(() => {
    let id = 0;
    if (selectedYear) {
      return MOCK_DATA.filter((c) => c.years.includes(selectedYear)).map(
        (c) => ({
          id: id++,
          companyName: c.companyName,
          sectorName: c.sectorName,
          subsectorName: c.subsectorName,
          recognitions: c.recognitions,
          year: selectedYear,
        })
      );
    }
    // "Todos": one row per year per company
    const rows: TransparencyRow[] = [];
    for (const c of MOCK_DATA) {
      for (const y of [...c.years].sort((a, b) => b - a)) {
        rows.push({
          id: id++,
          companyName: c.companyName,
          sectorName: c.sectorName,
          subsectorName: c.subsectorName,
          recognitions: c.recognitions,
          year: y,
        });
      }
    }
    return rows;
  }, [selectedYear]);

  // Client-side search with Fuse.js
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return flatRows;

    const fuse = new Fuse<TransparencyRow>(flatRows, {
      keys: ["companyName", "sectorName", "subsectorName"],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [flatRows, searchQuery]);

  const alphaDeepForest = alpha(theme.palette.common.deepForest, 0.35);

  return (
    <Box component="main" className="flex min-h-screen flex-col">
      {/* Header with green gradient background */}
      <Box
        sx={{
          position: "relative",
          background: `linear-gradient(0deg, ${alphaDeepForest} 0%, ${alphaDeepForest} 100%),
          linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`,
        }}
      >
        <LatamFootprintIcon
          sx={{
            fill: theme.palette.common.white,
            opacity: 0.06,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
        <Header />
      </Box>

      {/* Content */}
      <Box
        className="flex flex-1 flex-col"
        sx={{ backgroundColor: theme.palette.background.default }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1280, py: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
            {/* Title row with controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mb: 0.5,
              }}
            >
              <Typography
                variant="h5"
                fontWeight={600}
                color="text.primary"
                sx={{ flexShrink: 0 }}
              >
                Transparencia
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "32px",
                  flexGrow: 1,
                  maxWidth: 500,
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </Box>
                <YearFilter
                  years={availableYears}
                  value={selectedYear}
                  onChange={setSelectedYear}
                />
              </Box>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Conoce las empresas que están comprometidas con la medición,
              verificación y reducción de su huella de carbono. La transparencia
              es fundamental para avanzar hacia un desarrollo sostenible en la
              región.
            </Typography>

            {/* Data Grid */}
            <TransparencyDataGrid data={filteredData} loading={isLoading} />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};
