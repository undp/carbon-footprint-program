import { createFileRoute } from "@tanstack/react-router";
import { OtpScreen } from "../../../screens/Auth/OtpScreen";

export const Route = createFileRoute("/auth/sign-up/validate-user")({
  component: () => <OtpScreen />,
});
