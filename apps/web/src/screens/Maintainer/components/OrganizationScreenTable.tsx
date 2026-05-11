import { FC, useCallback, useMemo, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import type { IFuseOptions } from "fuse.js";
import type { GridValidRowModel } from "@mui/x-data-grid";
import { MaintainerDataGrid } from "./MaintainerDataGrid";
import { useOrganizationColumns } from "../hooks/useOrganizationColumns";
import { useOrganizationDisplayStatus } from "../hooks/useOrganizationDisplayStatus";
import { useAdminOrganizations } from "@/api/query/organizations/useAdminOrganizations";
import { useBlockOrganization } from "@/api/query/organizations/useBlockOrganization";
import { useUnblockOrganization } from "@/api/query/organizations/useUnblockOrganization";
import { BlockOrganizationDialog } from "./BlockOrganizationDialog";
import { UnblockOrganizationDialog } from "./UnblockOrganizationDialog";
import {
  OrganizationProfileDialog,
  ViewSubmissionDialog,
} from "@/components/dialogs";
import { GetAllOrganizationsResponse } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

const TABLE_ROW_COUNT = 6;

const TableSkeleton: FC = () => (
  <Box
    sx={{
      backgroundColor: "background.paper",
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      p: 2,
    }}
  >
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="text" width="12.5%" height={40} />
      ))}
    </Stack>
    {Array.from({ length: TABLE_ROW_COUNT }).map((_, rowIdx) => (
      <Stack key={rowIdx} direction="row" spacing={2} sx={{ py: 1.5 }}>
        {Array.from({ length: 8 }).map((_, colIdx) => (
          <Skeleton key={colIdx} variant="text" width="12.5%" height={40} />
        ))}
      </Stack>
    ))}
  </Box>
);

type OrganizationRow = GetAllOrganizationsResponse["data"][number];

export const OrganizationScreenTable: FC = () => {
  const { data, isLoading } = useAdminOrganizations();
  const { getDisplayStatus, STATUS_LABEL } = useOrganizationDisplayStatus();
  const blockMutation = useBlockOrganization();
  const unblockMutation = useUnblockOrganization();
  const [blockOrgId, setBlockOrgId] = useState<string | null>(null);
  const [unblockOrgId, setUnblockOrgId] = useState<string | null>(null);
  const [viewOrgId, setViewOrgId] = useState<string | null>(null);
  const [historyOrgId, setHistoryOrgId] = useState<string | null>(null);
  const organizations = data?.data ?? [];
  const blockOrg = organizations.find((org) => org.id === blockOrgId);
  const unblockOrg = organizations.find((org) => org.id === unblockOrgId);

  const handleViewClick = useCallback((id: string) => {
    setViewOrgId(id);
  }, []);

  const handleViewHistoryClick = useCallback((id: string) => {
    setHistoryOrgId(id);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewOrgId(null);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryOrgId(null);
  }, []);

  const handleBlockClick = useCallback((id: string) => {
    setBlockOrgId(id);
  }, []);

  const handleUnblockClick = useCallback((id: string) => {
    setUnblockOrgId(id);
  }, []);

  const handleCloseBlockDialog = useCallback(() => {
    setBlockOrgId(null);
  }, []);

  const handleCloseUnblockDialog = useCallback(() => {
    setUnblockOrgId(null);
  }, []);

  const handleConfirmBlock = useCallback(() => {
    if (!blockOrgId) return;
    blockMutation.mutate(blockOrgId, {
      onSuccess: () => {
        setBlockOrgId(null);
        enqueueSnackbar(
          `${capitalize(VOCAB.organization.noun.singular)} bloqueada exitosamente`,
          {
            variant: "success",
          }
        );
      },
      onError: () => {
        enqueueSnackbar(
          `No se pudo bloquear ${VOCAB.organization.article.singular}`,
          { variant: "error" }
        );
      },
    });
  }, [blockOrgId, blockMutation]);

  const handleConfirmUnblock = useCallback(() => {
    if (!unblockOrgId) return;
    unblockMutation.mutate(unblockOrgId, {
      onSuccess: () => {
        setUnblockOrgId(null);
        enqueueSnackbar(
          `${capitalize(VOCAB.organization.noun.singular)} desbloqueada exitosamente`,
          {
            variant: "success",
          }
        );
      },
      onError: () => {
        enqueueSnackbar(
          `No se pudo desbloquear ${VOCAB.organization.article.singular}`,
          {
            variant: "error",
          }
        );
      },
    });
  }, [unblockOrgId, unblockMutation]);

  const columns = useOrganizationColumns({
    onView: handleViewClick,
    onViewHistory: handleViewHistoryClick,
    onBlock: handleBlockClick,
    onUnblock: handleUnblockClick,
  });

  const fuseOptions = useMemo<IFuseOptions<OrganizationRow>>(
    () => ({
      keys: [
        { name: "name", getFn: (row) => row.name },
        { name: "sectorName", getFn: (row) => row.sectorName ?? "" },
        { name: "subsectorName", getFn: (row) => row.subsectorName ?? "" },
        { name: "sizeName", getFn: (row) => row.sizeName ?? "" },
        {
          name: "status",
          getFn: (row) =>
            STATUS_LABEL[
              getDisplayStatus(
                row.status,
                row.isAccredited,
                row.hasCarbonInventories
              )
            ],
        },
      ],
      threshold: 0.3,
    }),
    [STATUS_LABEL, getDisplayStatus]
  );

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <Box className="rounded-sm bg-white p-3">
      <Box className="flex w-full">
        <MaintainerDataGrid
          editingRowId={null}
          searchable={{
            fuseOptions: fuseOptions as IFuseOptions<GridValidRowModel>,
            placeholder: "Buscar organización...",
            fileName: "organizaciones",
          }}
          disableColumnMenu={false}
          disableColumnFilter={false}
          showToolbar
          columns={columns}
          rows={organizations}
          rowHeight={65}
          getRowId={(row: OrganizationRow) => row.id}
          disableColumnSorting={false}
          hideFooter={false}
          pagination
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
        <BlockOrganizationDialog
          open={blockOrgId !== null}
          organizationName={blockOrg?.name ?? ""}
          onClose={handleCloseBlockDialog}
          onConfirm={handleConfirmBlock}
          isLoading={blockMutation.isPending}
        />
        <UnblockOrganizationDialog
          open={unblockOrgId !== null}
          organizationName={unblockOrg?.name ?? ""}
          onClose={handleCloseUnblockDialog}
          onConfirm={handleConfirmUnblock}
          isLoading={unblockMutation.isPending}
        />
        <OrganizationProfileDialog
          open={viewOrgId !== null}
          organizationId={viewOrgId}
          onClose={handleCloseView}
        />
        <ViewSubmissionDialog
          open={historyOrgId !== null}
          organizationId={historyOrgId ?? undefined}
          onClose={handleCloseHistory}
        />
      </Box>
    </Box>
  );
};
