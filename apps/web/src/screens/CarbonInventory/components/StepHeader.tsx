import { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";

type StepHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  explanationSlug?: string;
};

export const StepHeader: FC<StepHeaderProps> = ({
  title,
  description,
  action,
  explanationSlug,
}) => {
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Box className="flex flex-row items-center justify-between gap-4">
      <Box className="flex flex-col">
        <Box className="flex items-center gap-1">
          <Typography variant="h6">{title}</Typography>
          {explanationSlug && (
            <InfoButton
              label="Más información"
              onClick={() => openExplanationBySlug(explanationSlug)}
            />
          )}
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {action ? <Box className="shrink-0">{action}</Box> : null}
    </Box>
  );
};
