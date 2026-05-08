import { FC, ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { AddOutlined } from "@mui/icons-material";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";

interface Props {
  title: string;
  subtitle?: string;
  onAddRow?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  extra?: ReactNode;
  explanationSlug?: string;
}

export const MaintainerPageHeader: FC<Props> = ({
  title,
  subtitle,
  onAddRow,
  addLabel = "Agregar",
  addDisabled,
  extra,
  explanationSlug,
}) => {
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Paper
      elevation={0}
      sx={{
        px: 4,
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 2,
      }}
    >
      <Box
        className="flex items-center justify-between gap-4"
        sx={{ width: "100%" }}
      >
        <Box className="flex flex-col gap-0.5" sx={{ flex: 1, minWidth: 0 }}>
          <Box className="flex items-center gap-1">
            <Typography variant="h5" fontWeight={600}>
              {title}
            </Typography>
            {explanationSlug && (
              <InfoButton
                label="Más información"
                onClick={() => openExplanationBySlug(explanationSlug)}
              />
            )}
          </Box>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          {extra}
          {onAddRow && (
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={onAddRow}
              disabled={addDisabled}
              size="small"
            >
              {addLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
