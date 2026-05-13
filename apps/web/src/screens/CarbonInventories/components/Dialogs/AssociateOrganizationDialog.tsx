import { FC, FormEvent, useCallback, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";
import { useMyOrganizations } from "@/api/query/organizations/useMyOrganizations";
import { useAssignOrganizationToCarbonInventory } from "@/api/query/carbonInventories/useAssignOrganizationToCarbonInventory";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { VOCAB } from "@/config/vocab";

const orgSingular = VOCAB.organization.noun.singular;
const orgSingularCapitalized =
  orgSingular.charAt(0).toUpperCase() + orgSingular.slice(1);

interface Props {
  open: boolean;
  onClose: () => void;
  carbonInventory: GetAllCarbonInventoriesResponse[number];
}

export const AssociateOrganizationDialog: FC<Props> = ({
  open,
  onClose,
  carbonInventory,
}) => {
  const { data: myOrganizations, isLoading: isLoadingOrgs } =
    useMyOrganizations();
  const { mutateAsync: assignOrganization, isPending: isSubmitting } =
    useAssignOrganizationToCarbonInventory();

  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const handleClose = useCallback(() => {
    setSelectedOrganizationId("");
    onClose();
  }, [onClose]);

  const organizationOptions = useMemo(
    () =>
      (myOrganizations ?? []).map((org) => ({
        label: org.name,
        value: String(org.id),
      })),
    [myOrganizations]
  );

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      try {
        await assignOrganization({
          inventoryId: String(carbonInventory.id),
          organizationId: selectedOrganizationId,
        });
        enqueueSnackbar(`${orgSingularCapitalized} asociada`, {
          variant: "success",
        });
        handleClose();
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, `No se pudo asociar la ${orgSingular}`),
          { variant: "error" }
        );
      }
    },
    [assignOrganization, carbonInventory.id, handleClose, selectedOrganizationId]
  );

  const submitDisabled = isSubmitting || !selectedOrganizationId;

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="associate-organization-dialog-title"
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle
        id="associate-organization-dialog-title"
        sx={{ pr: 6, fontWeight: 600 }}
      >
        Asociar {orgSingular} a la huella
        <IconButton
          aria-label="cerrar"
          onClick={handleClose}
          disabled={isSubmitting}
          sx={(theme) => ({
            position: "absolute",
            right: 16,
            top: 16,
            color: theme.palette.grey[500],
          })}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit} noValidate>
        <DialogContent sx={{ pt: 0 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selecciona una {orgSingular} para asociarla a esta huella de
            carbono.
          </Typography>

          <FormControl fullWidth required>
            <InputLabel id="associate-organization-select-label">
              {orgSingularCapitalized}
            </InputLabel>
            <Select
              labelId="associate-organization-select-label"
              label={orgSingularCapitalized}
              value={selectedOrganizationId}
              onChange={(event) =>
                setSelectedOrganizationId(event.target.value)
              }
              disabled={isSubmitting || isLoadingOrgs}
            >
              {organizationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitDisabled}
            loading={isSubmitting}
          >
            Asociar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
