type Environment = {
  apiBaseUrl: string;
};

const { VITE_API_BASE_URL } = import.meta.env;

export const environment: Environment = {
  apiBaseUrl: VITE_API_BASE_URL ?? "http://localhost:8080/api",
};
