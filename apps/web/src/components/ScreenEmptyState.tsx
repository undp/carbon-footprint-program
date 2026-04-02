import { FC, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface ScreenEmptyStateAction {
  label: string;
  onClick: () => void;
}

interface ScreenEmptyStateProps {
  title: string;
  description: string;
  action?: ScreenEmptyStateAction;
  icon?: ReactNode;
}

export const ScreenEmptyState: FC<ScreenEmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <Box className="flex flex-1 items-center justify-center p-6">
      <Box className="flex flex-col items-center justify-center gap-4 rounded-lg bg-white p-8 text-center">
        {icon}
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
        <Typography className="max-w-sm" variant="body2" color="text.secondary">
          {description}
        </Typography>
        {action && (
          <Button variant="contained" color="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Box>
    </Box>
  );
};
