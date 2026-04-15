import { FC, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import { StylizedDataGrid } from "@components";
import { useRequestColumns } from "../hooks/useRequestColumns";
import { useAdminRequests } from "@/api/query/requests/useAdminRequests";
import { GetAllAdminRequestsResponse, SubmissionType } from "@repo/types";
import { ViewSubmissionDialog } from "@/components/dialogs";

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

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <>
      <Box className="flex w-full">
        <StylizedDataGrid
          sx={(theme) => ({
            backgroundColor: "background.paper",
            border: "none",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: theme.palette.background.default,
            },
            "& .MuiDataGrid-cell": {
              minHeight: "65px",
              padding: "10px",
            },
          })}
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
      </Box>
      <ViewSubmissionDialog
        open={dialogState !== null}
        carbonInventoryId={dialogState?.carbonInventoryId}
        organizationId={dialogState?.organizationId}
        reductionProjectId={dialogState?.reductionProjectId}
        onClose={() => setDialogState(null)}
        isAdmin
      />
    </>
  );
};
