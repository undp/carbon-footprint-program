import React, { FC, PropsWithChildren } from "react";
import { AppBar, AppBarProps, Box, Toolbar } from "@mui/material";
import { BrandLockup } from "@/components/BrandLockup";

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
            <Box sx={{ mr: 5 }}>
              <BrandLockup
                markHeight={40}
                nameFontSize={15.5}
                territoryFontSize={7.5}
              />
            </Box>
          </Box>
        )}
        <Box className="flex min-w-0 flex-1 gap-12">{titleComponent}</Box>
        {children}
      </Toolbar>
    </AppBar>
  );
};
