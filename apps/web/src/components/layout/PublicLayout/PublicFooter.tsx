import { FC } from "react";
import { Box, useTheme } from "@mui/material";
import { PartnerLockupStrip } from "./PartnerLockupStrip";
import { PUBLIC_FOOTER_PARTNERS } from "./constants";

/**
 * Footer of the public institutional screens: who funds, who drives and who
 * develops the platform.
 */
export const PublicFooter: FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.common.white,
        borderTop: `1px solid ${theme.palette.divider}`,
        px: { xs: 2.5, md: 4, lg: 7 },
        py: 2.75,
      }}
    >
      <PartnerLockupStrip
        items={PUBLIC_FOOTER_PARTNERS}
        captionColor={theme.palette.text.secondary}
        dividerHeight={40}
        gap={{ xs: 3.5, md: 5, lg: 7.5 }}
      />
    </Box>
  );
};
