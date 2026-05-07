import { createFileRoute } from "@tanstack/react-router";
import { RecognitionsScreen } from "@/screens/Recognitions/RecognitionsScreen";

export const Route = createFileRoute("/app/_shell/recognitions")({
  component: RecognitionsScreen,
});
