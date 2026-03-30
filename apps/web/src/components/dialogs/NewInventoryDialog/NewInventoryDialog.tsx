import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import { FC, useCallback, useState } from "react";
import { ApplicationFormIcon, CalculatorIcon } from "@/icons";
import { Close } from "@mui/icons-material";
import { UsageMode } from "@repo/types";
import { useMyOrganizations, useCreateCarbonInventory } from "@/api/query";
import { OrganizationSelector } from "@/components/OrganizationSelector/OrganizationSelector";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useSnackbar } from "notistack";
import { InventoryOptionRow } from "./InventoryOptionRow";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedOrganizationId?: string;
}

export const NewInventoryDialog: FC<Props> = ({
  open,
  onClose,
  selectedOrganizationId,
}) => {
  const [orgId, setOrgId] = useState<string>(selectedOrganizationId ?? "none");
  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();
  const createInventory = useCreateCarbonInventory();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleCreate = useCallback(
    async (usageMode: UsageMode) => {
      try {
        const created = await createInventory.mutateAsync({
          usageMode,
          organizationId: orgId === "none" ? null : orgId,
        });
        if (created) {
          void navigate({
            to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
            params: { inventoryId: created.id },
          });
        }
      } catch {
        enqueueSnackbar("No se pudo crear la huella", { variant: "error" });
      }
    },
    [createInventory, orgId, navigate, enqueueSnackbar]
  );

  return (
    <Dialog
      maxWidth="md"
      open={open}
      onClose={onClose}
      disablePortal={false}
      keepMounted={false}
      disableAutoFocus={false}
      disableEnforceFocus={false}
      aria-labelledby="newInventoryDialog-title"
      aria-describedby="newInventoryDialog-description"
    >
      <DialogTitle id="newInventoryDialog-title">Crear huella</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          right: 8,
          top: 8,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>
      <DialogContent id="newInventoryDialog-description">
        <Box className="flex flex-col gap-4" sx={{ minWidth: 480 }}>
          <Typography variant="body2" color="text.secondary">
            Selecciona {VOCAB.organization.article.singular} y el tipo de huella
            que deseas crear
          </Typography>
          <OrganizationSelector
            organizations={organizations}
            value={orgId}
            onChange={setOrgId}
            isLoading={isLoadingOrgs}
            showNoneOption
            label={capitalize(VOCAB.organization.noun.singular)}
            minWidth={0}
          />
          <Box>
            <InventoryOptionRow
              Icon={CalculatorIcon}
              title="Quiero calcular mi huella"
              actionLabel="Usar calculadora"
              description="Usa nuestra calculadora con factores de emisión incluidos. Cálculo inmediato y fácil."
              onClick={() => void handleCreate(UsageMode.SIMPLIFIED)}
              disabled={createInventory.isPending}
              loading={
                createInventory.isPending &&
                createInventory.variables?.usageMode === UsageMode.SIMPLIFIED
              }
            />
            <Divider />
            <InventoryOptionRow
              Icon={ApplicationFormIcon}
              title="Ya tengo mis cálculos"
              actionLabel="Subir emisiones"
              description="Carga directamente tus emisiones calculadas y genera tu reporte al instante."
              onClick={() => void handleCreate(UsageMode.EXPERT)}
              disabled={createInventory.isPending}
              loading={
                createInventory.isPending &&
                createInventory.variables?.usageMode === UsageMode.EXPERT
              }
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
