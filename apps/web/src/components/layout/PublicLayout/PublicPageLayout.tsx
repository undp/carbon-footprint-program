import { FC, PropsWithChildren, ReactNode } from "react";
import { Box, useTheme } from "@mui/material";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { PUBLIC_CONTENT_MAX_WIDTH } from "./constants";

interface Props {
  /** Encabezado con degradado de marca; normalmente un `<PublicPageHero />`. */
  hero: ReactNode;
  /** Separación vertical entre las secciones del contenido. */
  contentGap?: number;
}

/**
 * Estructura común de las pantallas institucionales públicas ("Sobre la
 * iniciativa", "Material complementario" y "Agradecimientos"): header, hero,
 * contenido centrado y pie de página de socios.
 */
export const PublicPageLayout: FC<PropsWithChildren<Props>> = ({
  hero,
  contentGap = 7,
  children,
}) => {
  const theme = useTheme();

  return (
    <Box
      className="flex min-h-screen flex-col"
      sx={{ backgroundColor: theme.palette.background.default }}
    >
      <PublicHeader />
      {hero}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2.5, md: 4, lg: 7 },
          pb: 7,
          display: "flex",
          flexDirection: "column",
          gap: contentGap,
        }}
      >
        {children}
      </Box>
      <PublicFooter />
    </Box>
  );
};
