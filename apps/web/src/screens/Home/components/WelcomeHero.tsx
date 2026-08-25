import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { BRAND } from "@/config/brand";

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
        // Solid institutional navy on the left (where the copy sits, for
        // strong contrast) easing into the leaf green on the right.
        background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 62%, ${theme.palette.secondary.main} 100%)`,
        color: "common.white",
      }}
    >
      <Box
        aria-hidden
        component="img"
        src={BRAND.markContrastSrc}
        alt=""
        className="pointer-events-none absolute top-1/2 right-[-30px] -translate-y-1/2"
        sx={{ height: 260, width: "auto", opacity: 0.14 }}
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
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};
