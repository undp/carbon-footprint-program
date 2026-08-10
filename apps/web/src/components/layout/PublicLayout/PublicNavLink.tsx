import { FC } from "react";
import { Link, type ToPathOption } from "@tanstack/react-router";
import { useTheme } from "@mui/material";

interface Props {
  to: ToPathOption;
  label: string;
}

/**
 * Enlace de la navegación pública. La página activa se marca con texto más
 * oscuro y un subrayado verde, tal como en el diseño.
 */
export const PublicNavLink: FC<Props> = ({ to, label }) => {
  const theme = useTheme();

  return (
    <Link
      to={to}
      style={{
        fontSize: 15,
        fontWeight: theme.typography.fontWeightRegular,
        color: theme.palette.text.secondary,
        padding: "6px 0",
        textDecoration: "none",
        borderBottom: "2.5px solid transparent",
      }}
      activeProps={{
        style: {
          fontWeight: theme.typography.fontWeightMedium,
          color: theme.palette.common.deepForestDark,
          borderBottom: `2.5px solid ${theme.palette.primary.main}`,
        },
      }}
    >
      {label}
    </Link>
  );
};
