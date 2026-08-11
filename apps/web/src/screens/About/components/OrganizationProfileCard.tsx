import { FC } from "react";
import {
  alpha,
  Box,
  Chip,
  Link,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { PARTNERS } from "@/config/partners";
import type { OrganizationProfile } from "../constants";

interface Props {
  profile: OrganizationProfile;
}

/** Institutional card for the "Quiénes están detrás" section. */
export const OrganizationProfileCard: FC<Props> = ({ profile }) => {
  const theme = useTheme();

  const partner = profile.partnerId ? PARTNERS[profile.partnerId] : undefined;

  const renderEmblem = () => {
    if (partner) {
      return (
        <Box
          component="img"
          src={partner.logoSrc}
          alt={partner.name}
          sx={{ height: 52, width: "auto", flexShrink: 0 }}
        />
      );
    }

    if (!profile.Icon) return null;

    return (
      <Box
        className="flex shrink-0 items-center justify-center rounded-full"
        sx={{
          height: 52,
          width: 52,
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        <profile.Icon
          sx={{ fontSize: 26, color: theme.palette.primary.dark }}
        />
      </Box>
    );
  };

  return (
    <Paper
      variant="outlined"
      className="flex flex-col"
      sx={{ borderRadius: 3.5, px: 3.5, py: 3.25 }}
    >
      <Box
        className="flex items-center gap-4"
        sx={{
          pb: 2,
          mb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {renderEmblem()}
        <Box className="flex" sx={{ gap: 2.75 }}>
          {profile.figures.map((figure) => (
            <Box key={figure.label} className="flex flex-col gap-1">
              <Typography
                component="b"
                sx={{
                  fontSize: 22,
                  fontWeight: "fontWeightBold",
                  letterSpacing: "-0.8px",
                  lineHeight: 1,
                  color: theme.palette.common.deepForestDark,
                }}
              >
                {figure.value}
              </Typography>
              <Typography
                component="span"
                color="text.secondary"
                sx={{
                  fontSize: 11,
                  fontWeight: "fontWeightMedium",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                }}
              >
                {figure.label}
              </Typography>
            </Box>
          ))}
        </Box>
        {profile.badge && (
          <Chip
            label={profile.badge}
            size="small"
            sx={{
              fontSize: 11,
              fontWeight: "fontWeightBold",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: partner?.brandColor,
              backgroundColor: alpha(
                partner?.brandColor ?? theme.palette.primary.main,
                0.1
              ),
            }}
          />
        )}
      </Box>

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
