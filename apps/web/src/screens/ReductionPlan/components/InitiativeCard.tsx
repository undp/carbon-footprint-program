import { FC } from "react";
import { Box, Typography } from "@mui/material";

interface InitiativeCardProps {
  title: string;
  description: string;
}

export const InitiativeCard: FC<InitiativeCardProps> = ({
  title,
  description,
}) => {
  return (
    <Box
      className="flex flex-col gap-1 rounded-lg bg-white p-4"
      sx={{ minHeight: 0 }}
    >
      <Typography variant="body1" fontWeight="medium" color="#414046">
        {title}
      </Typography>
      <Typography variant="caption" color="rgba(65,64,70,0.6)">
        {description}
      </Typography>
    </Box>
  );
};
