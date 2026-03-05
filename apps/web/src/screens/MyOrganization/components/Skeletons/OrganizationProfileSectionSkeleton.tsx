import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

const InfoRowSkeleton: FC<{ labelWidth?: number; valueWidth?: number }> = ({
  labelWidth = 200,
  valueWidth = 300,
}) => (
  <Box className="flex gap-6 px-0 py-2">
    <Skeleton variant="text" width={labelWidth} height={24} />
    <Skeleton variant="text" width={valueWidth} height={24} />
  </Box>
);

export const OrganizationProfileSectionSkeleton: FC = () => {
  return (
    <Box className="flex flex-col gap-4 rounded-lg bg-white p-4">
      {/* Section header */}
      <Box className="flex h-10 items-center justify-between">
        <Skeleton variant="text" width={160} height={32} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Box>

      {/* Company InfoCard */}
      <Box className="bg-background flex flex-col gap-4 rounded p-4">
        <Skeleton variant="text" width={240} height={28} />
        <Box className="flex flex-col">
          <InfoRowSkeleton valueWidth={180} />
          <InfoRowSkeleton valueWidth={280} />
          <InfoRowSkeleton valueWidth={220} />
          <InfoRowSkeleton valueWidth={160} />
          <InfoRowSkeleton valueWidth={200} />
          <InfoRowSkeleton valueWidth={260} />
          <InfoRowSkeleton valueWidth={300} />
          <InfoRowSkeleton valueWidth={180} />
          <InfoRowSkeleton labelWidth={200} valueWidth={60} />
        </Box>
      </Box>

      {/* Representative heading */}
      <Skeleton variant="text" width={140} height={28} />

      {/* Representative InfoCard */}
      <Box className="bg-background flex flex-col gap-4 rounded p-4">
        <Skeleton variant="text" width={260} height={28} />
        <Box className="flex flex-col">
          <InfoRowSkeleton valueWidth={160} />
          <InfoRowSkeleton valueWidth={360} />
          <InfoRowSkeleton valueWidth={260} />
          <InfoRowSkeleton valueWidth={180} />
        </Box>
      </Box>
    </Box>
  );
};
