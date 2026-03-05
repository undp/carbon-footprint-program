import { FC, useMemo, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useOrganizations } from "@/api/query/organizations";
import { OrganizationHeaderSkeleton } from "./Skeletons";

type OrganizationHeaderProps = {
  selectedOrganizationId?: string;
  onOrganizationChange: (organizationId: string) => void;
};

export const OrganizationHeader: FC<OrganizationHeaderProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: organizations, isLoading, error } = useOrganizations();

  useEffect(() => {
    if (error) {
      enqueueSnackbar("No se pudo cargar la lista de organizaciones", {
        variant: "error",
      });
    }
  }, [error, enqueueSnackbar]);

  const activeOrganization = useMemo(() => {
    return organizations?.find((org) => org.id === selectedOrganizationId);
  }, [organizations, selectedOrganizationId]);

  if (isLoading) return <OrganizationHeaderSkeleton />;

  if (!organizations?.length || !activeOrganization) return null;

  return (
    <Box className="flex items-center justify-between rounded-lg bg-white p-4">
      <Typography variant="h5" fontWeight={700}>
        {activeOrganization.name}
      </Typography>

      <FormControl sx={{ minHeight: 40, minWidth: 240 }} size="small">
        <InputLabel id="organization-select-label">Organizaciones</InputLabel>
        <Select
          labelId="organization-select-label"
          id="organization-select"
          value={activeOrganization.id}
          label="Organizaciones"
          onChange={(e) => onOrganizationChange(e.target.value)}
        >
          {organizations.map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
