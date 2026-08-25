import { FC } from "react";
import { alpha, Box, Link, Typography, useTheme } from "@mui/material";
import { useTermsConditionsFileLink } from "@/api/query/termsConditions";
import { BRAND } from "@/config/brand";
import { PUBLIC_CONTENT_MAX_WIDTH } from "./constants";

/**
 * Institutional footer of the public screens: the Gobierno de la República
 * Dominicana lockup, who administers the platform and the legal links.
 *
 * The link to the Términos y Condiciones only becomes a link when a current
 * document is uploaded; until then the label stays as plain text so the footer
 * never offers a dead end.
 */
export const PublicFooter: FC = () => {
  const theme = useTheme();
  const { href: termsHref, isAvailable: hasTerms } =
    useTermsConditionsFileLink();

  const renderTermsLink = () => {
    if (!hasTerms) {
      return (
        <Typography
          component="span"
          sx={{ fontSize: 14, color: alpha(theme.palette.common.white, 0.75) }}
        >
          Términos y Condiciones
        </Typography>
      );
    }

    return (
      <Link
        href={termsHref}
        target="_blank"
        rel="noopener noreferrer"
        color={theme.palette.common.white}
        underline="hover"
        sx={{ fontSize: 14 }}
      >
        Términos y Condiciones
      </Link>
    );
  };

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.common.deepNavy,
        boxShadow: `0 -2px 14px ${alpha(theme.palette.common.deepNavyDark, 0.28)}`,
      }}
    >
      <Box
        className="flex flex-wrap items-center gap-x-8 gap-y-4"
        sx={{
          width: "100%",
          maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2.5, md: 4, lg: 7 },
          py: 2.5,
        }}
      >
        <Box
          component="img"
          src={BRAND.administratorLogoSrc}
          alt={BRAND.administratorLogoAlt}
          sx={{ height: { xs: 64, md: 84 }, width: "auto", display: "block" }}
        />
        <Typography
          component="p"
          sx={{
            flex: "1 1 320px",
            fontSize: { xs: 14.5, md: 16 },
            lineHeight: 1.45,
            color: theme.palette.common.white,
          }}
        >
          {BRAND.administratorStatement}
        </Typography>
        {renderTermsLink()}
      </Box>
    </Box>
  );
};
