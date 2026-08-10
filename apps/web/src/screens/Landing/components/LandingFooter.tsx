import { FC } from "react";
import { alpha, Box, Link, Typography, useTheme } from "@mui/material";
import { useCurrentTermsConditions } from "@/api/query/termsConditions";
import {
  PRIVACY_POLICY_URL,
  TERMS_CONDITIONS_FILE_URL,
} from "@/config/constants";

/**
 * Pie de página de la landing: superficie de vidrio sobre el degradado, con la
 * invitación a replicar la plataforma y los enlaces legales.
 */
export const LandingFooter: FC = () => {
  const theme = useTheme();
  const { data, isLoading } = useCurrentTermsConditions();

  const hasTerms = !!data?.fileName;
  const linkColor = alpha(theme.palette.common.white, 0.9);

  const renderTermsLink = () => {
    if (isLoading || !hasTerms) {
      return (
        <Typography component="span" sx={{ fontSize: 12.5, color: linkColor }}>
          Términos y Condiciones
        </Typography>
      );
    }

    return (
      <Link
        href={TERMS_CONDITIONS_FILE_URL}
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
