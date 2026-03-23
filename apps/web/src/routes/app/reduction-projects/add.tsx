import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Routes } from "@/interfaces";
import { AddReductionProjectScreen } from "@/screens/ReductionProjects";

export const Route = createFileRoute(Routes.ADD_REDUCTION_PROJECT)({
  validateSearch: z.object({
    orgId: z.string().optional(),
    projectId: z.string().optional(),
    viewOnly: z.boolean().optional(),
  }),
  component: AddReductionProjectScreen,
});
