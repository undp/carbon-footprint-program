import { FC } from "react";
import {
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";
import { OrganizationProfileView } from "@/screens/MyOrganization/components/OrganizationProfileView";
import { useOrganization } from "@/api/query/organizations/useOrganization";
import { VOCAB } from "@/config/vocab";

type Props = {
  open: boolean;
  organizationId: string | null;
  onClose: () => void;
};

export const OrganizationProfileDialog: FC<Props> = ({
  open,
  organizationId,
  onClose,
}) => {
  const theme = useTheme();
  const {
    data: profile,
    isLoading,
    isError,
  } = useOrganization(organizationId ?? undefined);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { overflow: "hidden" } } }}
    >
      <DialogTitle component="div" sx={{ pb: 0.5, pr: 6, minHeight: 46 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ color: theme.palette.text.primary, fontSize: 18 }}
        >
          Perfil {VOCAB.organization.noun.singular}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: "absolute", right: 12, top: 12, opacity: 0.7 }}
        >
          <CloseOutlined fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {isLoading && (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}
        {!isLoading && (isError || !profile) && (
          <Typography color="error.main">
            No se pudo cargar el perfil de la organización.
          </Typography>
        )}
        {!isLoading && !isError && profile && (
          <Stack spacing={2}>
            <OrganizationProfileView profile={profile} />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
