import { FC } from "react";
import { Link, Paper, Typography, useTheme } from "@mui/material";
import type { OrganizationProfile } from "../constants";

interface Props {
  profile: OrganizationProfile;
}

/**
 * Institutional card for the "Quiénes están detrás" section.
 *
 * The cards carry no logo, figure or funding badge: the section sat right below
 * the funder acknowledgement, so repeating the Sweden logo and the "financiado
 * por ASDI" badge read as duplicated attribution, and the Sweden logo did not
 * belong on the IFV LAC card at all. The "Acerca de …" title heads each card on
 * its own.
 */
export const OrganizationProfileCard: FC<Props> = ({ profile }) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      className="flex flex-col"
      sx={{ borderRadius: 3.5, px: 3.5, py: 3.25 }}
    >
      <Typography
        variant="subtitle1"
        component="h3"
        fontWeight="fontWeightBold"
        sx={{
          fontSize: 16,
          color: theme.palette.common.deepForestDark,
          mb: 1.25,
        }}
      >
        {profile.title}
      </Typography>
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: 14, lineHeight: 1.7 }}
      >
        {profile.body}
        {profile.link && (
          <>
            {" "}
            <Link
              href={profile.link.href}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              fontWeight="fontWeightMedium"
              color={theme.palette.primary.main}
            >
              {profile.link.label}
            </Link>
            {profile.bodyAfterLink}
          </>
        )}
      </Typography>
    </Paper>
  );
};
