import React, { FC, PropsWithChildren } from "react";
import { AppBar, AppBarProps, Box, Toolbar } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";

interface Props extends AppBarProps {
  showLogo?: boolean;
  onLogoClick?: () => void;
  titleComponent?: React.ReactNode;
}

export const BaseHeader: FC<PropsWithChildren<Props>> = ({
  showLogo,
  onLogoClick,
  titleComponent,
  children,
  className,
  ...props
}) => {
  return (
    <AppBar
      {...props}
      color="transparent"
      className={className}
      position="static"
    >
      <Toolbar className="bg-white px-6 py-4">
        {showLogo && (
          <Box
            sx={{
              cursor: onLogoClick ? "pointer" : "default",
            }}
            className="flex items-center"
            onClick={onLogoClick}
          >
            <HuellaLatamLogo
              sx={{
                width: 116,
                height: 50,
                mr: 5,
              }}
            />
          </Box>
        )}
        <Box className="flex min-w-0 flex-1 gap-12">{titleComponent}</Box>
        {children}
      </Toolbar>
    </AppBar>
  );
};
