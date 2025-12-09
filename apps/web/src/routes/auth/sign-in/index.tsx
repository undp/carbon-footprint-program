import { createFileRoute } from "@tanstack/react-router";
import { SignInScreen } from "@/screens";

export const Route = createFileRoute("/auth/sign-in/")({
  component: () => <SignInScreen />,
});
