export const userKeys = {
  users: ["users"] as const,
  me: ["me"] as const,
  updateUser: (id: string) => [...userKeys.users, "updateUser", id] as const,
};
