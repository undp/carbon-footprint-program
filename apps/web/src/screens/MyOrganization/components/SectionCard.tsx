import { FC, ReactNode } from "react";
import { Box, Button, Tooltip, Typography } from "@mui/material";
import {
  onboardingTargetProps,
  OnboardingFocus,
} from "@/utils/onboardingHighlight";

export type ActionConfig = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "text" | "outlined" | "contained";
  /** Tags this action for the home onboarding highlight (optional). */
  onboardingId?: OnboardingFocus;
};

type SectionCardProps = {
  title: string;
  action?: ActionConfig;
  actions?: ActionConfig[];
  children: ReactNode;
};

export const SectionCard: FC<SectionCardProps> = ({
  title,
  action,
  actions,
  children,
}) => {
  const actionsToRender = actions || (action ? [action] : []);

  return (
    <Box className="flex flex-col gap-4 rounded-lg bg-white p-4">
      <Box className="flex h-10 items-center justify-between">
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {actionsToRender.length > 0 && (
          <Box className="flex gap-2">
            {actionsToRender.map((actionItem, index) => (
              <Tooltip key={index} title={actionItem.title}>
                <span>
                  <Button
                    key={index}
                    variant={actionItem.variant ?? "outlined"}
                    color="primary"
                    startIcon={actionItem.icon}
                    onClick={actionItem.onClick}
                    sx={{ minWidth: 100, height: 40 }}
                    disabled={actionItem.disabled}
                    title={actionItem.title}
                    {...(actionItem.onboardingId
                      ? onboardingTargetProps(actionItem.onboardingId)
                      : {})}
                  >
                    {actionItem.label}
                  </Button>
                </span>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
};
