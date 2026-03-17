import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

interface MaintainerTableSkeletonProps {
  /** Number of skeleton columns to render (default: 5) */
  columns?: number;
  /** Number of skeleton rows to render (default: 5) */
  rows?: number;
  /** Row height in pixels (default: 60) */
  rowHeight?: number;
}

export const MaintainerTableSkeleton: FC<MaintainerTableSkeletonProps> = ({
  columns = 5,
  rows = 5,
  rowHeight = 60,
}) => (
  <Box
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: "8px",
      overflow: "hidden",
      width: "100%",
    }}
  >
    {/* Header row */}
    <Box
      sx={{
        display: "flex",
        gap: 1,
        px: 2,
        py: 1.5,
        bgcolor: "grey.200",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={24}
          sx={{ flex: i === 0 ? 2 : 1 }}
        />
      ))}
    </Box>

    {/* Body rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <Box
        key={rowIdx}
        sx={{
          display: "flex",
          gap: 1,
          px: 2,
          alignItems: "center",
          height: rowHeight,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            variant="rounded"
            height={20}
            sx={{ flex: colIdx === 0 ? 2 : 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);
