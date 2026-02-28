import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

export const OrganizationHeaderSkeleton: FC = () => {
  return (
    <Box className="flex items-center justify-between rounded-lg bg-white p-4">
      <Skeleton variant="text" width={260} height={40} />
      <Skeleton variant="rounded" width={240} height={40} />
    </Box>
  );
};
