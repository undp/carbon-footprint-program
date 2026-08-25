import { FC, PropsWithChildren } from "react";
import { Box, AppBar, Toolbar, IconButton } from "@mui/material";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND } from "@/config/brand";

export const AuthenticationLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <Box className="flex min-h-screen">
      <Box className="flex w-1/2 flex-col items-center">
        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar>
            <IconButton
              sx={{
                p: 0,
              }}
              disableRipple
              disableTouchRipple
              disableFocusRipple
            >
              <BrandLockup
                markHeight={44}
                nameFontSize={17}
                territoryFontSize={8.5}
              />
            </IconButton>
          </Toolbar>
        </AppBar>

        {children}
      </Box>

      <Box className="flex w-1/2 flex-col items-center gap-6 bg-[url(@assets/mountains.webp)] bg-cover">
        <Box
          aria-hidden
          component="img"
          src={BRAND.markContrastSrc}
          alt=""
          sx={{
            position: "fixed",
            height: "70%",
            width: "auto",
            opacity: 0.25,
            pointerEvents: "none",
          }}
        />
      </Box>
    </Box>
  );
};
