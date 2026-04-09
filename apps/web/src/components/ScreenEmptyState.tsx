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
    <Box className="flex flex-1 items-center justify-center">
      <Box className="flex h-1/3 w-2/3 flex-col items-center justify-center gap-6 rounded-lg bg-white p-50">
        {icon}
        <Typography variant="h6" color="text.primary">
          {title}
        </Typography>
        <Typography
          className="max-w-md"
          variant="body2"
          color="text.secondary"
          align="center"
        >
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
