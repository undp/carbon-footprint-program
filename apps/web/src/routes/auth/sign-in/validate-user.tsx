import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/sign-in/validate-user')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/auth/sign-in/auth"!</div>
}
