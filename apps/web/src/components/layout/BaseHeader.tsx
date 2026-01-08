import React, { FC, PropsWithChildren } from "react";
import { AppBar, AppBarProps, Box, Toolbar } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import clsx from "clsx";

interface Props extends AppBarProps {
  showLogo?: boolean;
  titleComponent?: React.ReactNode;
}

export const BaseHeader: FC<PropsWithChildren<Props>> = ({
  showLogo,
  titleComponent,
  children,
  className,
  ...props
}) => {
  return (
    <AppBar
      {...props}
      color="transparent"
      className={clsx("bg-white", className)}
      position="static"
    >
      <Toolbar className="px-6 py-4">
        {showLogo && (
          <HuellaLatamLogo
            sx={{
              width: 116,
              height: 50,
              mr: 5,
            }}
          />
        )}
        <Box className="flex flex-1 gap-12">{titleComponent}</Box>
        {children}
      </Toolbar>
    </AppBar>
  );
};
