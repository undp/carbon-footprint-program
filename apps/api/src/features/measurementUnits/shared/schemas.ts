import { z } from "zod";

export const MagnitudeSchema = z.enum(["MASS", "VOLUME", "DISTANCE", "TIME"]);
