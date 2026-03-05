import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

const ROW_COUNT = 3;

const TableRowSkeleton: FC = () => (
  <Box className="flex items-center gap-2 border-b border-gray-200 px-2 py-3">
    <Skeleton variant="text" width="33%" height={24} sx={{ flex: 1 }} />
    <Skeleton variant="text" width="33%" height={24} sx={{ flex: 1 }} />
    <Skeleton variant="text" width="16%" height={24} sx={{ flex: 0.5 }} />
    <Box sx={{ flex: 0.5, display: "flex", justifyContent: "center", gap: 1 }}>
      <Skeleton variant="rounded" width={28} height={28} />
      <Skeleton variant="rounded" width={28} height={28} />
    </Box>
  </Box>
);

export const OrganizationUsersTableSkeleton: FC = () => {
  return (
    <Box className="flex flex-col gap-4 rounded-lg bg-white p-4">
      {/* Section header */}
      <Box className="flex h-10 items-center justify-between">
        <Skeleton variant="text" width={100} height={32} />
        <Skeleton variant="rounded" width={200} height={40} />
      </Box>

      {/* Table */}
      <Box className="rounded-lg border border-gray-200">
        {/* Column headers */}
        <Box className="bg-background flex items-center gap-2 px-2 py-2">
          <Skeleton variant="text" height={20} sx={{ flex: 1 }} />
          <Skeleton variant="text" height={20} sx={{ flex: 1 }} />
          <Skeleton variant="text" height={20} sx={{ flex: 0.5 }} />
          <Skeleton variant="text" height={20} sx={{ flex: 0.5 }} />
        </Box>

        {/* Rows */}
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </Box>
    </Box>
  );
};
