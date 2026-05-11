import { FC, useMemo, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import { MaintainerDataGrid } from "./MaintainerDataGrid";
import { useRequestColumns } from "../hooks/useRequestColumns";
import { useAdminRequests } from "@/api/query/requests/useAdminRequests";
import { GetAllAdminRequestsResponse, SubmissionType } from "@repo/types";
import { ViewSubmissionDialog } from "@/components/dialogs";
import { REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/utils/submissions";

const TABLE_ROW_COUNT = 6;

type DialogState = {
  carbonInventoryId?: string;
  organizationId?: string;
  reductionProjectId?: string;
} | null;

const TableSkeleton: FC = () => (
  <Box
    sx={{
      backgroundColor: "background.paper",
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      p: 2,
    }}
  >
    {/* Header row */}
    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="text" width="16%" height={40} />
      ))}
    </Stack>
    {/* Data rows */}
    {Array.from({ length: TABLE_ROW_COUNT }).map((_, rowIdx) => (
      <Stack key={rowIdx} direction="row" spacing={2} sx={{ py: 1.5 }}>
        {Array.from({ length: 6 }).map((_, colIdx) => (
          <Skeleton key={colIdx} variant="text" width="16%" height={40} />
        ))}
      </Stack>
    ))}
  </Box>
);

export const RequestScreenTable: FC = () => {
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const { data: requests = [], isLoading } = useAdminRequests();

  const handleView = (row: GetAllAdminRequestsResponse[number]) => {
    if (
      row.type === SubmissionType.CARBON_INVENTORY_CALCULATION ||
      row.type === SubmissionType.CARBON_INVENTORY_VERIFICATION
    ) {
      setDialogState({
        carbonInventoryId: row.carbonInventoryId ?? undefined,
      });
    } else if (row.type === SubmissionType.REDUCTION_PROJECT_VERIFICATION) {
      setDialogState({
        reductionProjectId: row.reductionProjectId ?? undefined,
      });
    } else {
      setDialogState({ organizationId: row.organizationId });
    }
  };

  const columns = useRequestColumns({ onView: handleView });

  const fuseOptions = useMemo<
    IFuseOptions<GetAllAdminRequestsResponse[number]>
  >(
    () => ({
      keys: [
        "organizationName",
        { name: "type", getFn: (row) => REQUEST_TYPE_LABEL[row.type] },
        { name: "status", getFn: (row) => REQUEST_STATUS_LABEL[row.status] },
        {
          name: "year",
          getFn: (row) => (row.year != null ? String(row.year) : ""),
        },
      ],
      threshold: 0.3,
    }),
    []
  );

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <Box className="flex w-full rounded-sm bg-white p-3">
      <MaintainerDataGrid<GetAllAdminRequestsResponse[number]>
        editingRowId={null}
        searchable={{
          fuseOptions,
          placeholder: "Buscar solicitud...",
          downloadFileName: "solicitudes",
        }}
        disableColumnSorting={false}
        disableColumnMenu={false}
        disableColumnFilter={false}
        showToolbar
        columns={columns}
        rows={requests}
        rowHeight={65}
        getRowId={(row: GetAllAdminRequestsResponse[number]) => row.id}
        hideFooter={false}
        pagination
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
      />
      <ViewSubmissionDialog
        open={dialogState !== null}
        carbonInventoryId={dialogState?.carbonInventoryId}
        organizationId={dialogState?.organizationId}
        reductionProjectId={dialogState?.reductionProjectId}
        onClose={() => setDialogState(null)}
        isAdmin
      />
    </Box>
  );
};
