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
import { useTransparencyData } from "@/api/query";
import { useBadgePreviews } from "@/api/query/badges";
import { VOCAB } from "@/config/vocab";

export const TransparencyScreen: FC = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  const { data: allData = [] } = useTransparencyData();
  const { data = [], isLoading } = useTransparencyData(selectedYear);
  const { data: badgePreviews = [] } = useBadgePreviews();

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    allData.forEach((org) => {
      org.years.forEach((y) => yearsSet.add(y));
    });
    return [...yearsSet].sort((a, b) => b - a);
  }, [allData]);

  const flatRows: TransparencyRow[] = useMemo(() => {
    let id = 0;
    if (selectedYear) {
      return data.map((org) => ({
        id: id++,
        organizationName: org.organizationName,
        sectorName: org.sectorName,
        subsectorName: org.subsectorName,
        recognitions: org.recognitions,
        year: selectedYear,
      }));
    }
    const rows: TransparencyRow[] = [];
    for (const org of data) {
      for (const y of [...org.years].sort((a, b) => b - a)) {
        rows.push({
          id: id++,
          organizationName: org.organizationName,
          sectorName: org.sectorName,
          subsectorName: org.subsectorName,
          recognitions: org.recognitions,
          year: y,
        });
      }
    }
    return rows;
  }, [data, selectedYear]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return flatRows;

    const fuse = new Fuse<TransparencyRow>(flatRows, {
      keys: ["organizationName", "sectorName", "subsectorName"],
      threshold: 0.3,
    });

    return fuse.search(searchQuery).map((result) => result.item);
  }, [flatRows, searchQuery]);

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

      <Box
        className="flex flex-1 flex-col"
        sx={{ backgroundColor: theme.palette.background.default }}
      >
        <Container maxWidth={false} sx={{ maxWidth: 1280, py: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {`Conoce ${VOCAB.organization.article.plural} que están comprometidas con la medición, verificación y reducción de su huella de carbono. La transparencia es fundamental para avanzar hacia un desarrollo sostenible en la región.`}
            </Typography>

            <TransparencyDataGrid
              data={filteredData}
              loading={isLoading}
              badgePreviews={badgePreviews}
            />
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};
