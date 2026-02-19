import { FC } from "react";
import { Box, Card, Skeleton } from "@mui/material";

export const RequestScreenKpiCardSkeleton: FC = () => (
  <Card
    sx={{
      minHeight: "130px",
      flex: 1,
      p: 2,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      borderRadius: "12px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    }}
  >
    <Box className="flex w-full justify-between">
      <Skeleton variant="text" width={80} height={20} />
      <Skeleton variant="rounded" width={40} height={40} />
    </Box>
    <Skeleton variant="text" width={60} height={40} sx={{ mt: 1 }} />
  </Card>
);
