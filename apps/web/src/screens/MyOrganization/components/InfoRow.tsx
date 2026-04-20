import { FC, memo } from "react";
import { Box, Typography } from "@mui/material";

type InfoRowProps = {
  label: string;
  value: React.ReactNode;
};

const InfoRowComponent: FC<InfoRowProps> = ({ label, value }) => {
  return (
    <Box className="flex gap-6 px-0 py-2">
      <Typography
        variant="body1"
        fontWeight={500}
        sx={{ width: 200, flexShrink: 0, fontSize: "0.75rem" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        component="div"
        sx={{ flex: 1, fontSize: "0.75rem" }}
      >
        {value}
      </Typography>
    </Box>
  );
};

export const InfoRow = memo(InfoRowComponent);
