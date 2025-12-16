import ky from "ky";
import { environment } from "@/config/environment";
import { getAuthToken } from "./auth";
import { AppHttpError, normalizeError } from "./errors";

export const apiClient = ky.create({
  prefixUrl: environment.apiBaseUrl,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAuthToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (!response.ok) {
          const normalized = await normalizeError(request, response);
          throw new AppHttpError(normalized);
        }
        return response;
      },
    ],
  },
  retry: {
    limit: 1,
  },
  timeout: 30000, // 30 seconds
});
