export const userKeys = {
  users: ["users"] as const,
  me: ["me"] as const,
  updateMyProfile: () => [...userKeys.me, "updateMyProfile"] as const,
  updateUserRole: (id: string) =>
    [...userKeys.users, "updateUserRole", id] as const,
  roleHistory: (userId: string) =>
    [...userKeys.users, "roleHistory", userId] as const,
};
