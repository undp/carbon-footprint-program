import { FC, useMemo, useState } from "react";
import { alpha, Box, Paper, Typography, useTheme } from "@mui/material";
import { Header } from "@/screens/Landing/components/Header";
import {
  TransparencyDataGrid,
  type TransparencyRow,
} from "./components/TransparencyDataGrid";
import { YearFilter } from "./components/YearFilter";
import { useTransparencyData } from "@/api/query";
import { useBadgePreviews } from "@/api/query/badges";
import { useFuzzySearch } from "@/hooks";
import { SearchBar } from "@/components";
import { TRANSPARENCY_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";
import { VOCAB } from "@/config/vocab";

export const TransparencyScreen: FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  const { data = [], isLoading } = useTransparencyData(selectedYear);
  const { data: badgePreviews = [] } = useBadgePreviews();

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: TRANSPARENCY_YEARS_RANGE_FROM_CURRENT },
      (_, i) => currentYear - i
    );
  }, []);

  const flatRows: TransparencyRow[] = useMemo(
    () => data.map((row, id) => ({ id, ...row })),
    [data]
  );

  const fuseOptions = useMemo(
    () => ({
      keys: ["organizationName", "sectorName", "subsectorName"],
      threshold: 0.3,
    }),
    []
  );

  const { results: filteredData } = useFuzzySearch(flatRows, {
    query: searchQuery,
    fuseOptions,
  });

  const alphaDeepForest = alpha(theme.palette.common.deepForest, 0.35);

  return (
    <Box component="main" className="flex min-h-screen flex-col">
      <Box
        sx={{
          position: "relative",
          background: `linear-gradient(0deg, ${alphaDeepForest} 0%, ${alphaDeepForest} 100%),
          linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`,
        }}
      >
        <Header />
      </Box>

      <Box className="flex flex-1 flex-col p-6">
        <Paper className="border p-6" elevation={0}>
          <Box className="mb-1 flex items-center justify-between gap-2">
            <Typography
              variant="h5"
              fontWeight={600}
              color="text.primary"
              className="shrink-0"
            >
              Transparencia
            </Typography>
            <Box className="center flex w-full max-w-[500px] gap-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={`Buscar por ${VOCAB.organization.noun.singular}, rubro o sub-rubro`}
              />

              <YearFilter
                years={availableYears}
                value={selectedYear}
                onChange={setSelectedYear}
              />
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {`Conoce ${VOCAB.organization.article.plural} que están comprometidas con la medición, verificación y reducción de su huella de carbono. La transparencia es fundamental para avanzar hacia un desarrollo sostenible en la región.`}
          </Typography>
          <Box className="flex w-full justify-end"></Box>
          <TransparencyDataGrid
            data={filteredData}
            loading={isLoading}
            badgePreviews={badgePreviews}
          />
        </Paper>
      </Box>
    </Box>
  );
};
