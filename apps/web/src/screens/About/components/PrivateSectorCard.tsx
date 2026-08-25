import { FC } from "react";
import { FactoryOutlined } from "@mui/icons-material";
import { alpha, Box, Chip, Paper, Typography, useTheme } from "@mui/material";
import { PRIVATE_SECTOR_CARD } from "../constants";

/** "El desafío" card about the private sector's role in the NDCs. */
export const PrivateSectorCard: FC = () => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        px: 3.75,
        py: 3.5,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        className="flex h-11 w-11 items-center justify-center"
        sx={{
          borderRadius: 3,
          mb: 2.25,
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        <FactoryOutlined
          sx={{ fontSize: 22, color: theme.palette.primary.main }}
        />
      </Box>
      <Typography
        variant="subtitle1"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{
          fontSize: 17,
          color: theme.palette.common.deepNavyDark,
          mb: 1.5,
        }}
      >
        {PRIVATE_SECTOR_CARD.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {PRIVATE_SECTOR_CARD.body}
      </Typography>
      <Box className="mt-auto flex flex-wrap gap-2" sx={{ pt: 2.5 }}>
        {PRIVATE_SECTOR_CARD.tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            sx={{
              fontSize: 11.5,
              fontWeight: "fontWeightMedium",
              color: theme.palette.primary.dark,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};
