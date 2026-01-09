import { FC } from "react";
import { Box, Typography, Button, Chip } from "@mui/material";
import { Download } from "@mui/icons-material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { useEmissionSummaryNavigation } from "./hooks/useEmissionSummaryNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";

// Types
interface EmissionSource {
  source: string;
  unit: string;
  quantity: number;
  factor: number;
  factorSource: string;
  emissions: number;
  systemLabel?: string;
}

interface Subcategory {
  name: string;
  emissions: number;
  percentage: number;
  sources: EmissionSource[];
}

// Mock data - This should come from API/props in real implementation
const MOCK_DATA = {
  organizationName: "Cargo Express",
  country: "Chile",
  sector: "Transporte y logística",
  size: "Mediana",
  locations: 3,
  measurement: "Inventario Organizacional 2024",
  mainActivity: {
    name: "Paquetes enviados",
    quantity: "220.0000 al año",
  },
  totalEmissions: {
    value: 152.47,
    unit: "tCO₂e",
    equivalence: "0,69 kg CO₂e/paquete",
    scopes: "Alcances 1,2 y 3",
  },
  categories: [
    {
      id: 1,
      name: "Emisiones directas",
      scope: "Categoría 1 / Alcance 1",
      color: {
        bg: "rgba(255,183,77,0.1)",
        text: "#66491f",
        accent: "rgba(255,183,77,0.3)",
        light: "rgba(255,183,77,0.15)",
      },
      total: 33.0,
      percentage: 21.6,
      subcategories: [
        {
          name: "Combustión móvil",
          emissions: 33.0,
          percentage: 21.6,
          sources: [
            {
              source: "Diésel",
              unit: "Litros",
              quantity: 12000,
              factor: 2.75,
              factorSource: "DEFRA 2025",
              emissions: 33.0,
            } satisfies EmissionSource,
          ],
        } satisfies Subcategory,
      ],
    },
    {
      id: 2,
      name: "Emisiones indirectas por energía",
      scope: "Categoría 2 / Alcance 2",
      color: {
        bg: "rgba(100,181,246,0.1)",
        text: "#284862",
        accent: "rgba(100,181,246,0.3)",
        light: "rgba(100,181,246,0.15)",
      },
      total: 31.48,
      percentage: 20.6,
      subcategories: [
        {
          name: "Electricidad",
          emissions: 31.48,
          percentage: 20.6,
          sources: [
            {
              source: "SEN",
              unit: "kWh",
              quantity: 180000,
              factor: 0.17489,
              factorSource: "SEN Chile",
              emissions: 31.48,
              systemLabel: "Sistema Eléctrico",
            } satisfies EmissionSource,
          ],
        } satisfies Subcategory,
      ],
    },
    {
      id: 3,
      name: "Otras emisiones Indirectas",
      scope: "Categorías 3,4,5 y 6 / Alcance 3",
      color: {
        bg: "rgba(130,199,132,0.1)",
        text: "#345035",
        accent: "rgba(130,199,132,0.3)",
        light: "rgba(130,199,132,0.15)",
      },
      total: 88.1,
      percentage: 57.8,
      subcategories: [
        {
          name: "Transporte de bienes aguas abajo",
          emissions: 49.46,
          percentage: 32.5,
          sources: [
            {
              source: "Van con motor a comb...",
              unit: "t·k",
              quantity: 800000,
              factor: 0.06183,
              factorSource: "DEFRA 2025",
              emissions: 49.46,
            } satisfies EmissionSource,
          ],
        } satisfies Subcategory,
        {
          name: "Productos comprados",
          emissions: 38.64,
          percentage: 32.5,
          sources: [
            {
              source: "Papel y cartón primera ...",
              unit: "Toneladas",
              quantity: 30,
              factor: 1.288,
              factorSource: "DEFRA 2025",
              emissions: 38.64,
            } satisfies EmissionSource,
          ],
        } satisfies Subcategory,
      ],
    },
  ],
  ghgEmissions: [
    {
      category: "Combustión estacionaria",
      total: 0,
      co2: 0,
      ch4: 0,
      n2o: 0,
      hfc: 0,
      pfc: 0,
      sf6: 0,
      nf3: 0,
    },
    {
      category: "Combustión móvil",
      total: 33.0,
      co2: 32.85,
      ch4: 90,
      n2o: 60,
      hfc: 0,
      pfc: 0,
      sf6: 0,
      nf3: 0,
    },
    {
      category: "Emisiones fugitivas",
      total: 0,
      co2: 0,
      ch4: 0,
      n2o: 0,
      hfc: 0,
      pfc: 0,
      sf6: 0,
      nf3: 0,
    },
    {
      category: "Emisiones por uso de suelo",
      total: 0,
      co2: 0,
      ch4: 0,
      n2o: 0,
      hfc: 0,
      pfc: 0,
      sf6: 0,
      nf3: 0,
    },
    {
      category: "Procesos industriales",
      total: 0,
      co2: 0,
      ch4: 0,
      n2o: 0,
      hfc: 0,
      pfc: 0,
      sf6: 0,
      nf3: 0,
    },
  ],
  factors: [
    {
      categoryScope: "CATEGORÍA 1 / ALCANCE 1",
      categoryLabel: "Emisiones directas",
      subcategory: "Combustión móvil",
      activityParameter: "Diésel",
      factor: "2.570 kg CO₂e/m³",
      factorDetails: [
        "2.537 kg CO₂e of CO2/m³",
        "0,29 kg CO₂e of CH4/m³",
        "32,29 kg CO₂e of N2O/m³",
      ],
      source: "DEFRA 2025",
      sourceDetail: "Fuels - Diesel (Average biofuel blend) - liters",
      color: "rgba(255,183,77,0.3)",
    },
    {
      categoryScope: "CATEGORÍA 2 / ALCANCE 2",
      categoryLabel: "Emisiones indirectas por energía",
      subcategory: "Electricidad",
      activityParameter: "Electricidad kWh",
      factor: "0,17489 kg CO₂ / kWh",
      factorDetails: ["0,0009 kg CH4/ kWh", "0,00122 kg NO₂ / kWh"],
      source: "SEN Chile 2024",
      sourceDetail: "",
      color: "rgba(100,181,246,0.3)",
    },
    {
      categoryScope: "CATEGORÍA 3,4,5 Y 6 / ALCANCE 3",
      categoryLabel: "Otras emisiones indirectas",
      subcategory: "Transporte y distribución de bienes aguas abajo",
      activityParameter: "Van con motor a combustión t·km transportados",
      factor: "0,06183 kg CO₂e/t·km",
      factorDetails: [],
      source: "DEFRA 2025",
      sourceDetail: "Freighting goods – Vans – Average – Unknown fuel – t·km",
      color: "rgba(130,199,132,0.3)",
    },
    {
      categoryScope: "CATEGORÍA 3,4,5 Y 6 / ALCANCE 3",
      categoryLabel: "Otras emisiones indirectas",
      subcategory: "Productos comprados",
      activityParameter: "Papel y cartón primera mano toneladas",
      factor: "1.288 kg CO₂e/kg",
      factorDetails: [],
      source: "DEFRA 2025",
      sourceDetail:
        "Material use – Paper and board – Primary material production – tonnes",
      color: "rgba(130,199,132,0.3)",
    },
  ],
};

export const EmissionSummaryScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
  });

  const handleDownload = () => {
    // TODO: Implement download functionality
  };

  const { goBack, goNext } = useEmissionSummaryNavigation(inventoryId);

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        buttons: [
          {
            text: "Volver",
            align: "right",
            buttonProps: {
              startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
              onClick: goBack,
            },
          },
          {
            text: "Siguiente",
            align: "right",
            buttonProps: {
              endIcon: <ArrowRightAltRounded />,
              variant: "contained",
              onClick: goNext,
            },
          },
        ],
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-scroll rounded-lg bg-white p-6">
        {/* Header Section */}
        <Box className="flex items-center justify-between">
          <StepHeader
            title="Paso 4: Resumen Inventario Organizacional 2024"
            description="Verifica tus datos antes de calcular"
          />
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Download />}
            onClick={handleDownload}
            sx={{ minHeight: "40px", textTransform: "uppercase" }}
          >
            Descargar
          </Button>
        </Box>

        {/* Organization Info Section */}
        <Box
          className="flex items-start justify-between rounded-lg p-4"
          sx={{ bgcolor: "rgba(65,64,70,0.03)" }}
        >
          {/* Left Column */}
          <Box className="flex flex-col gap-4">
            <Box className="flex items-start gap-4">
              <Typography variant="body1" className="w-32">
                Nombre empresa:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.organizationName}
              </Typography>
            </Box>
            <Box className="flex items-start gap-4">
              <Typography variant="body1" className="w-32">
                País:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.country}
              </Typography>
            </Box>
            <Box className="flex items-start gap-4">
              <Typography variant="body1" className="w-32">
                Rubro:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.sector}
              </Typography>
            </Box>
          </Box>

          {/* Middle Column */}
          <Box className="flex flex-col gap-4">
            <Box className="flex items-start gap-4">
              <Typography variant="body1" className="w-20">
                Tamaño:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.size}
              </Typography>
            </Box>
            <Box className="flex items-start gap-4">
              <Typography variant="body1" className="w-20">
                Sedes:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.locations}
              </Typography>
            </Box>
            <Box className="flex items-start gap-4">
              <Typography variant="body1">Medición:</Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.measurement}
              </Typography>
            </Box>
          </Box>

          {/* Right Column - Main Activity */}
          <Box
            className="flex w-72 items-center justify-between rounded-lg px-4 py-0"
            sx={{ bgcolor: "rgba(65,64,70,0.03)" }}
          >
            <Box className="flex flex-col gap-1">
              <Typography variant="caption" color="text.primary">
                Actividad principal
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {MOCK_DATA.mainActivity.name}
              </Typography>
              <Typography variant="caption" color="text.primary">
                {MOCK_DATA.mainActivity.quantity}
              </Typography>
            </Box>
            {/* TODO: Add capinaut icon here */}
          </Box>
        </Box>

        {/* Total Emissions Section */}
        <Box
          className="flex items-center justify-between rounded-lg px-4 py-3"
          sx={{ bgcolor: "rgba(28,64,58,0.1)" }}
        >
          <Box>
            <Typography
              variant="body1"
              fontWeight="semibold"
              sx={{ color: "#1c403a" }}
            >
              Total emisiones
            </Typography>
            <Typography variant="caption" sx={{ color: "#1c403a" }}>
              {MOCK_DATA.totalEmissions.scopes}
            </Typography>
          </Box>
          <Box className="flex flex-col items-center gap-1">
            <Typography
              variant="body1"
              fontWeight="bold"
              align="right"
              sx={{ color: "#1c403a" }}
            >
              {MOCK_DATA.totalEmissions.value} {MOCK_DATA.totalEmissions.unit}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              className="w-54"
            >
              Equivalencia: {MOCK_DATA.totalEmissions.equivalence}
            </Typography>
          </Box>
        </Box>

        {/* Categories Sections */}
        {MOCK_DATA.categories.map((category) => (
          <Box
            key={category.id}
            className="flex flex-col gap-3 rounded-lg px-4 py-3"
            sx={{ bgcolor: category.color.bg }}
          >
            {/* Category Header */}
            <Box className="flex items-center justify-between">
              <Box>
                <Typography
                  variant="body1"
                  fontWeight="semibold"
                  sx={{ color: category.color.text }}
                >
                  {category.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: category.color.text }}
                >
                  {category.scope}
                </Typography>
              </Box>
              <Box className="flex items-center gap-4">
                <Typography
                  variant="body1"
                  fontWeight="semibold"
                  sx={{ color: category.color.text }}
                >
                  {category.total} tCO₂e
                </Typography>
                <Box
                  className="flex h-8 items-center justify-center rounded px-1"
                  sx={{ bgcolor: category.color.accent }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: category.color.text }}
                  >
                    {category.percentage}%
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                height: "0.5px",
                opacity: 0.2,
                background: `linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.6) 100%)`,
              }}
            />

            {/* Subcategories */}
            {category.subcategories.map((subcategory, idx) => (
              <Box key={idx} className="flex flex-col gap-3">
                <Typography
                  variant="body2"
                  fontWeight="semibold"
                  sx={{ color: category.color.text }}
                >
                  {subcategory.name}
                </Typography>

                <Box className="flex items-center justify-between gap-54">
                  {/* Emission Sources Table */}
                  <Box
                    className="overflow-hidden rounded border"
                    sx={{ borderColor: category.color.accent }}
                  >
                    <Box className="flex">
                      {/* Source Column */}
                      <Box className="flex w-48 flex-col">
                        <Box
                          className="flex h-6 items-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            {(
                              subcategory.sources[0] as
                                | EmissionSource
                                | undefined
                            )?.systemLabel || "Fuente de emisión"}
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: category.color.text, width: "100%" }}
                            >
                              {source.source}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Unit Column */}
                      <Box className="flex w-30 flex-col">
                        <Box
                          className="flex h-6 items-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            Unidad
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4 py-2"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: category.color.text, width: "100%" }}
                            >
                              {source.unit}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Quantity Column */}
                      <Box className="flex w-29 flex-col">
                        <Box
                          className="flex h-6 items-center justify-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            {(
                              subcategory.sources[0] as
                                | EmissionSource
                                | undefined
                            )?.systemLabel
                              ? "Consumo"
                              : "Cantidad"}
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body2"
                              align="right"
                              sx={{ color: category.color.text, width: "100%" }}
                            >
                              {source.quantity.toLocaleString("es-ES")}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Factor Column */}
                      <Box className="flex w-40 flex-col">
                        <Box
                          className="flex h-6 items-center justify-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            Factor kgCO₂e/
                            {(
                              subcategory.sources[0] as
                                | EmissionSource
                                | undefined
                            )?.systemLabel
                              ? "kWh"
                              : "unidad"}
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body1"
                              align="right"
                              color="text.primary"
                              sx={{ width: "100%" }}
                            >
                              {source.factor.toLocaleString("es-ES")}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Factor Source Column */}
                      <Box className="flex w-31 flex-col">
                        <Box
                          className="flex h-6 items-center justify-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            Fuente factor
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ color: category.color.text, width: "100%" }}
                            >
                              {source.factorSource}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Emissions Column */}
                      <Box className="flex w-34 flex-col">
                        <Box
                          className="flex h-6 items-center justify-center border-b px-4"
                          sx={{
                            bgcolor: category.color.accent,
                            borderColor: category.color.accent,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ color: category.color.text }}
                          >
                            Emisiones tCO₂e
                          </Typography>
                        </Box>
                        {subcategory.sources.map((source, sourceIdx) => (
                          <Box
                            key={sourceIdx}
                            className="flex h-6 items-center justify-center border-b px-4"
                            sx={{ borderColor: category.color.accent }}
                          >
                            <Typography
                              variant="body2"
                              align="right"
                              sx={{ color: category.color.text, width: "100%" }}
                            >
                              {source.emissions.toLocaleString("es-ES")}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  {/* Total for Subcategory */}
                  <Box className="flex flex-1 items-center justify-end gap-4">
                    <Typography
                      variant="body2"
                      sx={{ color: category.color.text }}
                    >
                      {subcategory.emissions.toLocaleString("es-ES")} tCO₂e
                    </Typography>
                    <Box
                      className="flex h-8 items-center justify-center rounded px-1"
                      sx={{ bgcolor: category.color.light }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ color: category.color.text }}
                      >
                        {subcategory.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Add divider between subcategories */}
                {idx < category.subcategories.length - 1 && (
                  <Box
                    sx={{
                      height: "0.5px",
                      opacity: 0.2,
                      background: `linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.6) 100%)`,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        ))}

        {/* GHG Emissions Table */}
        <Box className="flex flex-col gap-4">
          <Typography variant="h5" fontWeight="semibold" color="text.primary">
            Emisiones directas por GEI
          </Typography>
          <Box
            className="overflow-hidden rounded border"
            sx={{ borderColor: "grey.300" }}
          >
            <Box className="flex">
              {/* Category Column */}
              <Box className="flex w-66 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Categoría de fuente
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography variant="body2" className="w-full">
                      {row.category}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Total Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="semibold">
                    Total tCO₂e
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4 py-2"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      fontWeight={row.total > 0 ? "semibold" : "regular"}
                      className="w-full"
                    >
                      {row.total.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* CO2 Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    CO₂ fósil
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.co2.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* CH4 Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    CH4
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.ch4.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* N2O Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    N₂O
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.n2o.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* HFC Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    HFC
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.hfc.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* PFC Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    PFC
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.pfc.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* SF6 Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    SF6
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.sf6.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* NF3 Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center justify-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    NF3
                  </Typography>
                </Box>
                {MOCK_DATA.ghgEmissions.map((row, idx) => (
                  <Box
                    key={idx}
                    className="flex h-14 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography
                      variant="body2"
                      align="right"
                      className="w-full"
                    >
                      {row.nf3.toLocaleString("es-ES")}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Factors Table */}
        <Box className="flex flex-col gap-4">
          <Typography variant="h5" fontWeight="semibold" color="text.primary">
            Factores utilizados
          </Typography>
          <Box
            className="overflow-hidden rounded border"
            sx={{ borderColor: "grey.300" }}
          >
            <Box className="flex">
              {/* Category/Scope Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Categoría / Alcance
                  </Typography>
                </Box>
                {MOCK_DATA.factors.map((factor, idx) => (
                  <Box
                    key={idx}
                    className="flex h-23 flex-col items-start justify-center gap-2 border-b bg-white p-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Chip
                      label={factor.categoryScope}
                      size="small"
                      sx={{
                        bgcolor: factor.color,
                        borderColor: factor.color,
                        fontSize: "0.625rem",
                        height: "14px",
                      }}
                    />
                    <Typography variant="body2" className="w-full">
                      {factor.categoryLabel}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Subcategory Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Sub-categoría
                  </Typography>
                </Box>
                {MOCK_DATA.factors.map((factor, idx) => (
                  <Box
                    key={idx}
                    className="flex h-23 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography variant="body2" className="w-full">
                      {factor.subcategory}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Activity Parameters Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Parámetros de actividad
                  </Typography>
                </Box>
                {MOCK_DATA.factors.map((factor, idx) => (
                  <Box
                    key={idx}
                    className="flex h-23 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Typography variant="body2" className="w-full">
                      {factor.activityParameter}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Factor Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Factor (Kg CO₂e/unidad)
                  </Typography>
                </Box>
                {MOCK_DATA.factors.map((factor, idx) => (
                  <Box
                    key={idx}
                    className="flex h-23 items-center justify-center border-b bg-white px-4 py-2"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Box className="flex w-full flex-col gap-0">
                      <Typography
                        variant="body2"
                        fontWeight="semibold"
                        className="w-full"
                      >
                        {factor.factor}
                      </Typography>
                      {factor.factorDetails.map((detail, detailIdx) => (
                        <Typography
                          key={detailIdx}
                          variant="body2"
                          className="w-full"
                        >
                          {detail}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Source Column */}
              <Box className="flex flex-1 flex-col">
                <Box
                  className="flex h-10 items-center border-b px-4"
                  sx={{
                    bgcolor: "rgba(65,64,70,0.03)",
                    borderColor: "grey.300",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    Fuente
                  </Typography>
                </Box>
                {MOCK_DATA.factors.map((factor, idx) => (
                  <Box
                    key={idx}
                    className="flex h-23 items-center justify-center border-b bg-white px-4"
                    sx={{ borderColor: "grey.300" }}
                  >
                    <Box className="flex w-full flex-col gap-0">
                      <Typography variant="body2">{factor.source}</Typography>
                      {factor.sourceDetail && (
                        <Typography
                          variant="body2"
                          fontStyle="italic"
                          className="w-full"
                        >
                          {factor.sourceDetail}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
