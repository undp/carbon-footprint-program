export const userKeys = {
  users: ["users"] as const,
  user: (email: string) => [...userKeys.users, "user", email] as const,
};
