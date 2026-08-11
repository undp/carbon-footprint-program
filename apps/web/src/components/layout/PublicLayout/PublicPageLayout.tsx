import { FC, PropsWithChildren, ReactNode } from "react";
import { Box, useTheme } from "@mui/material";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";
import { PUBLIC_CONTENT_MAX_WIDTH } from "./constants";

interface Props {
  /** Heading with brand gradient; normally a `<PublicPageHero />`. */
  hero: ReactNode;
  /** Vertical spacing between the content sections. */
  contentGap?: number;
}

/**
 * Shared structure of the public institutional screens ("Sobre la
 * iniciativa", "Material complementario" and "Agradecimientos"): header,
 * hero, centered content and partners footer.
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
