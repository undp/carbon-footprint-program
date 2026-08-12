import { FC } from "react";
import { ArrowRightAltRounded } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import type { SupportingResource } from "../constants";
import { ResourceCover } from "./ResourceCover";

interface Props {
  resource: SupportingResource;
}

/** Card for a supplementary resource: cover, description and access. */
export const ResourceCard: FC<Props> = ({ resource }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      className="flex flex-wrap gap-7"
      sx={{ borderRadius: 3.5, px: 4, py: 3.75 }}
    >
      <ResourceCover resource={resource} />
      <Box
        className="flex flex-col items-start"
        sx={{ flex: 1, minWidth: 240 }}
      >
        <Chip
          label={resource.typeLabel}
          size="small"
          sx={{
            borderRadius: 1,
            mb: 1.5,
            fontSize: 10.5,
            fontWeight: "fontWeightBold",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: theme.palette.primary.dark,
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
          }}
        />
        <Typography
          variant="h6"
          component="h2"
          fontWeight="fontWeightBold"
          sx={{
            fontSize: 18,
            lineHeight: 1.35,
            color: theme.palette.common.deepForestDark,
            mb: 1.25,
          }}
        >
          {resource.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{ fontSize: 14, lineHeight: 1.7, mb: 2.5 }}
        >
          {resource.description}
        </Typography>
        <Button
          variant="contained"
          href={resource.href}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowRightAltRounded />}
          sx={{
            mt: "auto",
            backgroundColor: theme.palette.common.deepForest,
            borderRadius: 1.25,
            px: 2.5,
            py: 1.375,
            fontSize: 12.5,
            letterSpacing: "1.1px",
          }}
        >
          {resource.ctaLabel}
        </Button>
      </Box>
    </Paper>
  );
};
