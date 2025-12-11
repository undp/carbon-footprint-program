import { createGetAllHandler } from "@/handlerFactory/index.js";
import { getAllJobPositionsService } from "./getAllJobPositionsService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all job positions.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllJobPositionsHandler = createGetAllHandler(
  "jobPositions",
  getAllJobPositionsService,
  "Job positions"
);
