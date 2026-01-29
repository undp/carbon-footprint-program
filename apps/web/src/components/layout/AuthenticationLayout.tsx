import { FC, PropsWithChildren } from "react";
import { Box, AppBar, Toolbar, IconButton, useTheme } from "@mui/material";
import { HuellaLatamLogo, LatamFootprintIcon } from "@/icons";

export const AuthenticationLayout: FC<PropsWithChildren> = ({ children }) => {
  const theme = useTheme();

  return (
    <Box className="flex min-h-screen">
      <Box className="flex flex-col items-center w-1/2">
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
              <HuellaLatamLogo
                sx={{
                  width: 116,
                  height: 50,
                }}
              />
            </IconButton>
          </Toolbar>
        </AppBar>

        {children}
      </Box>

      <Box className="flex flex-col gap-6 items-center w-1/2 bg-[url(@assets/mountains.webp)] bg-cover">
        <LatamFootprintIcon
          sx={{
            position: "fixed",
            width: "100%",
            height: "100%",
            fill: theme.palette.common.white,
            opacity: 0.25,
            pointerEvents: "none",
          }}
        />
      </Box>
    </Box>
  );
};
