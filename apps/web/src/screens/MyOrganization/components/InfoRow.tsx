import { FC, memo } from "react";
import { Box, Typography } from "@mui/material";

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRowComponent: FC<InfoRowProps> = ({ label, value }) => {
  return (
    <Box className="flex gap-6 px-0 py-2">
      <Typography
        variant="body1"
        fontWeight={500}
        sx={{ width: 200, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography variant="body1" sx={{ flex: 1 }}>
        {value}
      </Typography>
    </Box>
  );
};

export const InfoRow = memo(InfoRowComponent);
