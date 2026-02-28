import { useCallback, useMemo } from "react";

// Mock data matching Figma design
const MOCK_USERS = [
  {
    id: "1",
    fullName: "Juan Pablo Morales",
    email: "jpmorales@cementeradelvalle.cl",
    role: "Admin",
  },
  {
    id: "2",
    fullName: "Camila Fuentes Rojas",
    email: "cfuentes@cementeradelvalle.cl",
    role: "Editor",
  },
  {
    id: "3",
    fullName: "Rodrigo Alarcon Vega",
    email: "ralarcon@cementeradelvalle.cl",
    role: "Lector",
  },
];

/**
 * Manages organization users data and actions
 * Currently using mock data - will be replaced with API calls
 */
export const useMyOrganizationUsers = () => {
  // TODO: Replace with useOrganizationUsers() API call when ready
  const users = useMemo(() => MOCK_USERS, []);

  // TODO: Implement add user modal and mutation
  const handleAddUser = useCallback(() => {
    console.log("TODO: Implement add user modal");
  }, []);

  // TODO: Implement edit user modal and mutation
  const handleEditUser = useCallback((_id: string) => {
    console.log("TODO: Implement edit user modal for user:", _id);
  }, []);

  // TODO: Implement delete user confirmation and mutation
  const handleDeleteUser = useCallback((_id: string) => {
    console.log("TODO: Implement delete user confirmation for user:", _id);
  }, []);

  return {
    users,
    handleAddUser,
    handleEditUser,
    handleDeleteUser,
  };
};
