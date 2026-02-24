import { FC, useCallback, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import { StylizedDataGrid } from "@components";
import { useOrganizationColumns } from "../hooks/useOrganizationColumns";
import { useAdminOrganizations } from "@/api/query/organizations/useAdminOrganizations";
import { useBlockOrganization } from "@/api/query/organizations/useBlockOrganization";
import { BlockOrganizationDialog } from "./BlockOrganizationDialog";
import { GetAllOrganizationsResponse } from "@repo/types";

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

export const OrganizationScreenTable: FC = () => {
  const { data, isLoading } = useAdminOrganizations();
  const blockMutation = useBlockOrganization();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const organizations = data?.data ?? [];
  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);

  const handleBlockClick = useCallback((id: string) => {
    setSelectedOrgId(id);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedOrgId(null);
  }, []);

  const handleConfirmBlock = useCallback(() => {
    if (!selectedOrgId) return;
    blockMutation.mutate(selectedOrgId, {
      onSettled: () => setSelectedOrgId(null),
    });
  }, [selectedOrgId, blockMutation]);

  const columns = useOrganizationColumns({ onBlock: handleBlockClick });

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <Box>
      <StylizedDataGrid
        sx={(theme) => ({
          backgroundColor: "background.paper",
          border: "none",
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          "& .MuiDataGrid-main": {
            padding: "16px !important",
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: theme.palette.background.default,
          },
          "& .MuiDataGrid-cell": {
            minHeight: "65px",
            padding: "10px",
          },
        })}
        columns={columns}
        rows={organizations}
        rowHeight={65}
        getRowId={(row: GetAllOrganizationsResponse["data"][number]) => row.id}
      />
      <BlockOrganizationDialog
        open={selectedOrgId !== null}
        organizationName={selectedOrg?.name ?? ""}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmBlock}
        isLoading={blockMutation.isPending}
      />
    </Box>
  );
};
