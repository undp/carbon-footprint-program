import { createFileRoute } from "@tanstack/react-router";
import { SignUpScreen } from "@/screens";

export const Route = createFileRoute("/auth/sign-up/")({
  component: () => <SignUpScreen />,
});
