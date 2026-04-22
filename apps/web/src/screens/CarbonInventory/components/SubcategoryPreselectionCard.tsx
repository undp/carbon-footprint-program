import { FC, Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useResizeObserver } from "@/hooks/useResizeObserver";
import { Box, Divider } from "@mui/material";
import { CategoryCard } from "./CategoryCard";
import { SubcategoryPreselectionField } from "./SubcategoryPreselectionField";
import type { SubcategoryPreselectionMergedData } from "../types";
import { getColorPalette } from "@/utils/categoryColors";

interface SubcategoryPreselectionCardProps {
  category: SubcategoryPreselectionMergedData[number];
  variant: "default" | "focused" | "unfocused";
  onClick?: () => void;
}

export const SubcategoryPreselectionCard: FC<
  SubcategoryPreselectionCardProps
> = ({ category, variant, onClick }) => {
  const palette = getColorPalette(category.color);
  const isUnfocused = variant === "unfocused";
  const isNotDefault = variant !== "default";

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setHasMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useResizeObserver(scrollRef, checkOverflow);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkOverflow, { passive: true });
    return () => el.removeEventListener("scroll", checkOverflow);
  }, [checkOverflow]);

  return (
    <Box
      onClick={onClick}
      className="flex flex-col items-start overflow-hidden p-4"
      sx={{
        border:
          variant === "focused"
            ? `2px solid ${palette.main}`
            : `2px solid #ECECEC`,
        borderRadius: "16px",
        height: "100%",
        opacity: isUnfocused ? 0.5 : 1,
        boxShadow: variant === "focused" ? 2 : 0,
        transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
        cursor: isNotDefault ? "pointer" : "default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "start",
          width: "100%",
          minHeight: 0,
          flex: 1,
          pointerEvents: isUnfocused ? "none" : "auto",
        }}
      >
        <CategoryCard
          icon={category.icon}
          categoryColor={category.color}
          subtitle={category.synonyms || ""}
          title={category.name}
          description={category.description || ""}
          explanation={category.explanation}
        />
        <Divider className="w-full pt-4" />
        <Box
          sx={{ position: "relative", minHeight: 0, flex: 1, width: "100%" }}
        >
          <Box
            ref={scrollRef}
            className="flex h-full min-h-0 w-full flex-col overflow-y-auto"
          >
            {category.subcategories.map((subcategory) => (
              <Fragment key={subcategory.id}>
                <SubcategoryPreselectionField
                  subcategory={subcategory}
                  disabled={isUnfocused}
                />
                <Divider className="w-full" />
              </Fragment>
            ))}
          </Box>
          {hasMoreBelow && (
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "48px",
                background: "linear-gradient(to bottom, transparent, white)",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
