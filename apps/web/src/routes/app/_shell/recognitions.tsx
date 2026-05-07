import { createFileRoute } from "@tanstack/react-router";
import { RouteIds } from "@/interfaces";
import { RecognitionsScreen } from "@/screens/Recognitions/RecognitionsScreen";

export const Route = createFileRoute(RouteIds.RECOGNITIONS)({
  component: RecognitionsScreen,
});
