import { FC } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { OrganizationSelector } from "@/components";
import { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

interface RecognitionScreenHeaderProps {
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  isLoadingOrgs: boolean;
  selectedOrganizationId: string;
  onOrganizationChange: (id: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  availableYears: number[];
}

export const RecognitionScreenHeader: FC<RecognitionScreenHeaderProps> = ({
  organizations,
  isLoadingOrgs,
  selectedOrganizationId,
  onOrganizationChange,
  selectedYear,
  onYearChange,
  availableYears,
}) => {
  const orgName =
    organizations.find((o) => o.id === selectedOrganizationId)?.name ?? "";

  return (
    <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white px-6 py-4">
      <Typography variant="h5" fontWeight={600}>
        {orgName}
      </Typography>
      <Box className="flex flex-wrap gap-3">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="year-select-label">Año</InputLabel>
          <Select
            labelId="year-select-label"
            label="Año"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
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
          value={selectedOrganizationId}
          onChange={onOrganizationChange}
          isLoading={isLoadingOrgs}
          size="small"
          minWidth={200}
          label={capitalize(VOCAB.organization.noun.singular)}
        />
      </Box>
    </Box>
  );
};
