import { FC } from "react";
import { alpha, Box, Link, Typography, useTheme } from "@mui/material";
import { useTermsConditionsFileLink } from "@/api/query/termsConditions";
import { PRIVACY_POLICY_URL } from "@/config/constants";

/**
 * Landing footer: a glass surface over the gradient, with the invitation
 * to replicate the platform and the legal links.
 */
export const LandingFooter: FC = () => {
  const theme = useTheme();
  const { href: termsHref, isAvailable: hasTerms } =
    useTermsConditionsFileLink();

  const linkColor = alpha(theme.palette.common.white, 0.9);

  const renderTermsLink = () => {
    if (!hasTerms) {
      return (
        <Typography component="span" sx={{ fontSize: 12.5, color: linkColor }}>
          Términos y Condiciones
        </Typography>
      );
    }

    return (
      <Link
        href={termsHref}
        target="_blank"
        rel="noopener noreferrer"
        color={linkColor}
        underline="hover"
        sx={{ fontSize: 12.5 }}
      >
        Términos y Condiciones
      </Link>
    );
  };

  return (
    <Box
      component="footer"
      className="flex flex-wrap items-center justify-between gap-6"
      sx={{
        px: { xs: 2.5, md: 4, lg: 7 },
        py: 2.25,
        backgroundColor: alpha(theme.palette.common.white, 0.14),
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${alpha(theme.palette.common.white, 0.28)}`,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 12.5,
          fontWeight: "fontWeightMedium",
          color: theme.palette.common.white,
        }}
      >
        Bien público digital · ¿Te interesa implementarlo en tu país? Contacta
        al PNUD
      </Typography>
      <Box className="flex items-center gap-6">
        {renderTermsLink()}
        <Link
          href={PRIVACY_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          color={linkColor}
          underline="hover"
          sx={{ fontSize: 12.5 }}
        >
          Privacidad
        </Link>
      </Box>
    </Box>
  );
};
