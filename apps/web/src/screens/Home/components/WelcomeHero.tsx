import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { LatamFootprintIcon } from "@/icons";

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export const WelcomeHero: FC<Props> = ({ eyebrow, title, subtitle }) => {
  const theme = useTheme();

  return (
    <Box
      className="relative overflow-hidden rounded-2xl p-6 md:p-8"
      sx={{
        // Solid brand green on the left (where the copy sits, for strong
        // contrast) easing into the aqua accent on the right.
        background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 62%, ${theme.palette.secondary.main} 100%)`,
        color: "common.white",
      }}
    >
      <LatamFootprintIcon
        className="pointer-events-none absolute top-1/2 right-[-40px] -translate-y-1/2"
        sx={{ width: 360, height: 314, opacity: 0.12, color: "common.white" }}
      />

      <Box
        className="relative min-w-0"
        sx={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)" }}
      >
        <Typography
          variant="overline"
          sx={{ letterSpacing: "0.14em", opacity: 0.9 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
          {title}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 1, maxWidth: "52ch" }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};
