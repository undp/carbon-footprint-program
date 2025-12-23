import { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";

type StepHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export const StepHeader: FC<StepHeaderProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <Box className="flex flex-row justify-between items-center gap-4">
      <Box className="flex flex-col">
        <Typography variant="h6">{title}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {action ? <Box className="shrink-0">{action}</Box> : null}
    </Box>
  );
};

