import { FC } from "react";
import { Box } from "@mui/material";
import {
  PublicHeaderRoutes,
  PublicHeaderRoutesTranslations,
} from "@/interfaces";
import { PublicNavLink } from "./PublicNavLink";

const pages = Object.values(PublicHeaderRoutes).map((route) => ({
  route,
  label: PublicHeaderRoutesTranslations[route],
}));

/** Navigation between the platform's public pages. */
export const PublicHeaderNav: FC = () => (
  <Box
    component="nav"
    className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap md:flex-nowrap lg:gap-x-6"
  >
    {pages.map((page) => (
      <PublicNavLink key={page.route} to={page.route} label={page.label} />
    ))}
  </Box>
);
