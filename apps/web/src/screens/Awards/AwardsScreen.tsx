import { FC, useState, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import { EmojiEventsOutlined, VisibilityOutlined } from "@mui/icons-material";
import { GridColDef, GridSortModel } from "@mui/x-data-grid";
import { StylizedDataGrid, OrganizationSelector } from "@/components";
import {
  useMyOrganizations,
  useOrganizationBadges,
  useBadgePreviews,
} from "@/api/query";
import { BadgeType, GetOrganizationBadgesResponse } from "@repo/types";

const AWARD_BADGE_TYPES = [
  BadgeType.CARBON_INVENTORY_CALCULATION,
  BadgeType.CARBON_INVENTORY_VERIFICATION,
  BadgeType.REDUCTION_PLAN_VERIFICATION,
  BadgeType.NEUTRALIZATION_PLAN_VERIFICATION,
];
import { RecognitionModal } from "./components/RecognitionModal";

const BADGE_LABELS: Record<string, string> = {
  [BadgeType.CARBON_INVENTORY_CALCULATION]: "Diploma Medición",
  [BadgeType.CARBON_INVENTORY_VERIFICATION]: "Sello Verificación",
  [BadgeType.REDUCTION_PLAN_VERIFICATION]: "Sello Reducción",
  [BadgeType.NEUTRALIZATION_PLAN_VERIFICATION]: "Sello Neutralización",
};

const DEFAULT_SORT_MODEL: GridSortModel = [
  { field: "measurementYear", sort: "desc" },
  { field: "badgeType", sort: "asc" },
];

export const AwardsScreen: FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>("");
  const [openModal, setOpenModal] = useState<{
    submissionId: string;
    badgeType: string;
  } | null>(null);

  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();

  const defaultOrgId = organizations[0]?.id ?? "";
  const effectiveOrgId = selectedOrganizationId || defaultOrgId;

  const { data: badges = [], isLoading: isLoadingBadges } =
    useOrganizationBadges(effectiveOrgId, selectedYear || undefined);

  const { data: badgePreviews = [] } = useBadgePreviews(AWARD_BADGE_TYPES);

  const availableYears = useMemo(() => {
    const years = new Set(badges.map((b) => b.measurementYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [badges]);

  const columns: GridColDef<GetOrganizationBadgesResponse[number]>[] = [
    {
      field: "earningDate",
      headerName: "Fecha otorgado",
      flex: 1,
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("es") : "-",
    },
    {
      field: "measurementYear",
      headerName: "Año medición",
      flex: 1,
    },
    {
      field: "badgeType",
      headerName: "Reconocimiento",
      flex: 1.5,
      valueFormatter: (value: string) => BADGE_LABELS[value] ?? value,
    },
    {
      field: "totalEmissions",
      headerName: "Huella tCO₂e",
      flex: 1,
      valueFormatter: (value: number) =>
        value != null ? value.toFixed(2) : "-",
    },
    {
      field: "actions",
      headerName: "Acciones",
      flex: 0.5,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() =>
            setOpenModal({
              submissionId: params.row.submissionId,
              badgeType: params.row.badgeType,
            })
          }
          title="Ver diploma"
        >
          <VisibilityOutlined fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const previewMap = useMemo(
    () => new Map(badgePreviews.map((p) => [p.badgeType, p.previewUrl])),
    [badgePreviews]
  );

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const badge of badges) {
      counts[badge.badgeType] = (counts[badge.badgeType] ?? 0) + 1;
    }
    return counts;
  }, [badges]);

  return (
    <Box className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
        <Box className="flex items-center gap-2">
          <EmojiEventsOutlined color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Reconocimientos
          </Typography>
        </Box>
        <Box className="flex flex-wrap gap-3">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="year-select-label">Año</InputLabel>
            <Select
              labelId="year-select-label"
              label="Año"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {availableYears.map((year) => (
                <MenuItem key={year} value={String(year)}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <OrganizationSelector
            organizations={organizations}
            value={effectiveOrgId}
            onChange={setSelectedOrganizationId}
            isLoading={isLoadingOrgs}
            size="small"
            minWidth={200}
          />
        </Box>
      </Box>

      {/* Summary cards */}
      <Box className="rounded-lg bg-white p-6">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 2,
          }}
        >
          {AWARD_BADGE_TYPES.map((badgeType) => {
            const previewUrl = previewMap.get(badgeType);
            const count = badgeCounts[badgeType] ?? 0;
            return (
              <Card key={badgeType} elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    py: 2,
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={BADGE_LABELS[badgeType]}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <EmojiEventsOutlined
                      sx={{ fontSize: 48, color: "text.disabled" }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {BADGE_LABELS[badgeType]}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {count}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      {/* Table */}
      <Box className="flex w-full flex-col gap-4 rounded-lg bg-white p-6">
        <StylizedDataGrid
          loading={isLoadingBadges}
          disableColumnSorting={false}
          columns={columns}
          rows={badges}
          getRowId={(row: GetOrganizationBadgesResponse[number]) =>
            `${row.submissionId}-${row.badgeType}`
          }
          initialState={{
            sorting: { sortModel: DEFAULT_SORT_MODEL },
          }}
        />
      </Box>

      {/* Recognition diploma modal */}
      <RecognitionModal
        submissionId={openModal?.submissionId ?? null}
        badgeType={openModal?.badgeType ?? null}
        onClose={() => setOpenModal(null)}
      />
    </Box>
  );
};
