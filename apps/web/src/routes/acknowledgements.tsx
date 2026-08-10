import { createFileRoute } from "@tanstack/react-router";
import { AcknowledgementsScreen } from "@/screens/Acknowledgements";

export const Route = createFileRoute("/acknowledgements")({
  component: AcknowledgementsScreen,
});
