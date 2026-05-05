import { FC, useMemo, useEffect } from "react";
import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import { useMyOrganizations } from "@/api/query/organizations";
import { OrganizationSelector } from "@/components";
import { OrganizationHeaderSkeleton } from "./Skeletons";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

type OrganizationHeaderProps = {
  selectedOrganizationId?: string;
  onOrganizationChange: (organizationId: string) => void;
  onCreateOrganization: () => void;
};

export const OrganizationHeader: FC<OrganizationHeaderProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
  onCreateOrganization,
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

      <Box className="flex items-center gap-2">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreateOrganization}
        >
          {`Crear Nueva ${capitalize(VOCAB.organization.noun.singular)}`}
        </Button>
        <OrganizationSelector
          organizations={organizations}
          value={activeOrganization.id}
          onChange={onOrganizationChange}
          label={capitalize(VOCAB.organization.noun.plural)}
        />
      </Box>
    </Box>
  );
};
