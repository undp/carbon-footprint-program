import ky from "ky";
import { API_BASE_URL } from "@/config/environment";
import { getAuthToken } from "./auth";
import { AppHttpError, normalizeError } from "./errors";

export const apiClient = ky.create({
  prefix: API_BASE_URL,
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        // Get token asynchronously from MSAL
        const token = await getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (!response.ok) {
          const normalized = await normalizeError(request, response);
          throw new AppHttpError(normalized);
        }
        return response;
      },
    ],
  },
  retry: {
    limit: 0,
  },
  timeout: 30000, // 30 seconds
});
