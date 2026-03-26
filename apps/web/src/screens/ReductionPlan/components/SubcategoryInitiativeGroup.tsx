import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { IconName } from "@repo/types";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { InitiativeCard } from "./InitiativeCard";

//TODO: reduction-plan use types from @repo/types
interface Initiative {
  id: string;
  title: string;
  description: string;
}

//TODO: reduction-plan use types from @repo/types
interface SubcategoryInitiativeGroupProps {
  name: string;
  icon: IconName;
  description: string;
  initiatives: Initiative[];
}

// TODO: reduction-plan add border with category color and shadow
export const SubcategoryInitiativeGroup: FC<
  SubcategoryInitiativeGroupProps
> = ({ name, icon, description, initiatives }) => {
  const IconComponent = CATEGORY_ICON_MAP[icon];

  return (
    <Box
      className="flex flex-col gap-4 rounded-lg px-4 py-2"
      sx={{ backgroundColor: "rgba(65,64,70,0.03)" }}
    >
      {/* Subcategory header */}
      <Box className="flex items-center gap-2">
        <Box
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          sx={{
            backgroundColor: "rgba(65,64,70,0.03)",
            "& svg": { width: "60%", height: "60%" },
          }}
        >
          {IconComponent && (
            <IconComponent sx={{ fill: "#414046", opacity: 0.6 }} />
          )}
        </Box>
        <Box className="flex flex-col gap-1">
          <Typography variant="body1" fontWeight="medium" color="#414046">
            {name}
          </Typography>
          <Typography variant="caption" color="rgba(65,64,70,0.6)">
            {description}
          </Typography>
        </Box>
      </Box>

      {/* Initiative cards */}
      {initiatives.map((initiative) => (
        <InitiativeCard
          key={initiative.id}
          title={initiative.title}
          description={initiative.description}
        />
      ))}
    </Box>
  );
};
