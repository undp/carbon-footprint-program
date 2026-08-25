import { FC } from "react";
import { Link, type ToPathOption } from "@tanstack/react-router";
import { useTheme } from "@mui/material";

interface Props {
  to: ToPathOption;
  label: string;
}

/**
 * Link in the public navigation. The active page is marked with darker text
 * and a green underline, just as in the design.
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
          color: theme.palette.common.deepNavyDark,
          borderBottom: `2.5px solid ${theme.palette.primary.main}`,
        },
      }}
    >
      {label}
    </Link>
  );
};
