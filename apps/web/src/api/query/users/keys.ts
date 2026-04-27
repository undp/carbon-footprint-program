export const userKeys = {
  users: ["users"] as const,
  me: ["me"] as const,
  updateUser: (id: string) => [...userKeys.users, "updateUser", id] as const,
  roleHistory: (userId: string) =>
    [...userKeys.users, "roleHistory", userId] as const,
};
