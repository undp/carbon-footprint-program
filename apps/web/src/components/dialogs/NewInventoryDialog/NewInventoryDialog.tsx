import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import { FC, useCallback, useEffect, useState } from "react";
import { ApplicationFormIcon, CalculatorIcon } from "@/icons";
import { Close } from "@mui/icons-material";
import { UsageMode } from "@repo/types";
import { useMyOrganizations, useCreateCarbonInventory } from "@/api/query";
import type { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { OrganizationSelector } from "@/components/OrganizationSelector/OrganizationSelector";
import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useSnackbar } from "notistack";
import { InventoryOptionRow } from "./InventoryOptionRow";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

interface DialogContentProps {
  onClose: () => void;
  selectedOrganizationId?: string;
  defaultOrganizationId?: string;
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  isLoadingOrgs: boolean;
}

/**
 * The dialog content is intentionally split into a separate component so that
 * the `useState` for `orgId` re-initialises from `selectedOrganizationId` on
 * every mount.
 *
 * The outer `NewInventoryDialog` is always mounted in the parent (never
 * conditionally rendered). Because MUI's Dialog uses `keepMounted={false}`,
 * this inner component is unmounted when the dialog closes and remounted when
 * it opens, which naturally reflects any changes to `selectedOrganizationId`
 * that occurred while the dialog was closed. If the state lived in the outer
 * component it would persist stale values across opens.
 */
const NewInventoryDialogContent: FC<DialogContentProps> = ({
  onClose,
  selectedOrganizationId,
  defaultOrganizationId,
  organizations,
  isLoadingOrgs,
}) => {
  const [orgId, setOrgId] = useState<string | null>(
    selectedOrganizationId ?? defaultOrganizationId ?? null
  );

  // `useState` only runs once on mount. If the organizations query was still
  // loading when this component mounted, `defaultOrganizationId` was undefined
  // at that point. This effect applies it once loading finishes, but only when
  // the user hasn't already made an explicit selection.
  useEffect(() => {
    if (!selectedOrganizationId && orgId === null && defaultOrganizationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrgId(defaultOrganizationId);
    }
  }, [defaultOrganizationId, selectedOrganizationId, orgId]);

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
    <>
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
            value={orgId ?? "none"}
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
    </>
  );
};

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
  const { data: organizations = [], isLoading: isLoadingOrgs } =
    useMyOrganizations();

  return (
    <Dialog maxWidth="md" open={open} onClose={onClose}>
      <NewInventoryDialogContent
        onClose={onClose}
        selectedOrganizationId={selectedOrganizationId}
        defaultOrganizationId={
          organizations.length === 1 ? organizations[0].id : undefined
        }
        organizations={organizations}
        isLoadingOrgs={isLoadingOrgs}
      />
    </Dialog>
  );
};
