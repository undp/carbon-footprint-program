import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

export const HeaderSkeleton: FC = () => (
  <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
    <Skeleton variant="text" width={200} height={36} />
    <Box className="flex flex-row gap-4">
      <Skeleton variant="rounded" width={120} height={40} />
      <Skeleton variant="rounded" width={216} height={40} />
    </Box>
  </Box>
);
