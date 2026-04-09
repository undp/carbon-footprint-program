import { FC, useMemo, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useMyOrganizations } from "@/api/query/organizations";
import { OrganizationSelector } from "@/components";
import { OrganizationHeaderSkeleton } from "./Skeletons";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

type OrganizationHeaderProps = {
  selectedOrganizationId?: string;
  onOrganizationChange: (organizationId: string) => void;
};

export const OrganizationHeader: FC<OrganizationHeaderProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: organizations, isLoading, error } = useMyOrganizations();

  useEffect(() => {
    if (error) {
      enqueueSnackbar(
        `No se pudo cargar la lista de ${VOCAB.organization.noun.plural}`,
        {
          variant: "error",
        }
      );
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

      <OrganizationSelector
        organizations={organizations}
        value={activeOrganization.id}
        onChange={onOrganizationChange}
        label={capitalize(VOCAB.organization.noun.plural)}
      />
    </Box>
  );
};
