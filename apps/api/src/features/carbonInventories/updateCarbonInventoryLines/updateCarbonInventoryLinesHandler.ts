import type { FastifyReply, FastifyRequest } from "fastify";
import { updateCarbonInventoryLinesService } from "./updateCarbonInventoryLinesService.js";
import type { UpdateCarbonInventoryLinesRequest } from "@repo/types";

interface UpdateCarbonInventoryLinesParams {
  id: string;
}

export const updateCarbonInventoryLinesHandler = async (
  request: FastifyRequest<{
    Params: UpdateCarbonInventoryLinesParams;
    Body: UpdateCarbonInventoryLinesRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryLines" });
  const carbonInventoryId = BigInt(request.params.id);

  log.info(
    { carbonInventoryId, lineCount: request.body.length },
    "Updating carbon inventory lines..."
  );

  const prisma = request.server.prisma;

  const result = await updateCarbonInventoryLinesService(
    prisma,
    carbonInventoryId,
    request.body
  );

  if (!result.success) {
    switch (result.error) {
      case "CARBON_INVENTORY_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Carbon inventory not found");
        return reply.status(404).send({
          code: "CARBON_INVENTORY_NOT_FOUND",
          message: "Carbon inventory not found",
        });

      case "LINE_NOT_FOUND":
        log.warn({ carbonInventoryId }, "One or more lines not found");
        return reply.status(404).send({
          code: "LINE_NOT_FOUND",
          message: "One or more lines not found",
        });

      case "LINE_NOT_IN_CARBON_INVENTORY":
        log.warn(
          { carbonInventoryId },
          "One or more lines do not belong to this carbon inventory"
        );
        return reply.status(422).send({
          code: "LINE_NOT_IN_CARBON_INVENTORY",
          message: "One or more lines do not belong to this carbon inventory",
        });

      case "SUBCATEGORY_NOT_FOUND":
        log.warn({ carbonInventoryId }, "One or more subcategories not found");
        return reply.status(404).send({
          code: "SUBCATEGORY_NOT_FOUND",
          message: "One or more subcategories not found",
        });

      case "INVALID_DIMENSION_ID":
        log.warn({ carbonInventoryId }, "Invalid dimension ID");
        return reply.status(422).send({
          code: "INVALID_DIMENSION_ID",
          message: "One or more dimension IDs are invalid for this subcategory",
        });

      case "INVALID_DIMENSION_VALUE_ID":
        log.warn({ carbonInventoryId }, "Invalid dimension value ID");
        return reply.status(422).send({
          code: "INVALID_DIMENSION_VALUE_ID",
          message: "One or more dimension value IDs are invalid",
        });

      case "DIMENSION_VALUE_NOT_IN_DIMENSION":
        log.warn(
          { carbonInventoryId },
          "Dimension value does not belong to the specified dimension"
        );
        return reply.status(422).send({
          code: "DIMENSION_VALUE_NOT_IN_DIMENSION",
          message:
            "One or more dimension values do not belong to their specified dimensions",
        });

      case "MEASUREMENT_UNIT_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Measurement unit not found");
        return reply.status(404).send({
          code: "MEASUREMENT_UNIT_NOT_FOUND",
          message: "One or more measurement units not found",
        });

      case "RATE_MEASUREMENT_UNIT_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Rate measurement unit not found");
        return reply.status(404).send({
          code: "RATE_MEASUREMENT_UNIT_NOT_FOUND",
          message: "One or more rate measurement units not found",
        });

      case "MEASUREMENT_UNIT_ABBREVIATION_MISMATCH":
        log.warn(
          { carbonInventoryId },
          "Measurement unit abbreviation does not match rate measurement unit denominator"
        );
        return reply.status(422).send({
          code: "MEASUREMENT_UNIT_ABBREVIATION_MISMATCH",
          message:
            "The measurement unit abbreviation must match the denominator abbreviation of the rate measurement unit",
        });

      case "EMISSION_FACTOR_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Emission factor not found");
        return reply.status(404).send({
          code: "EMISSION_FACTOR_NOT_FOUND",
          message: "One or more emission factors not found",
        });

      case "EMISSION_FACTOR_NOT_IN_SUBCATEGORY":
        log.warn(
          { carbonInventoryId },
          "Emission factor does not belong to the line's subcategory"
        );
        return reply.status(422).send({
          code: "EMISSION_FACTOR_NOT_IN_SUBCATEGORY",
          message:
            "One or more emission factors do not belong to their line's subcategory",
        });

      case "EMISSION_FACTOR_DIMENSION_MISMATCH":
        log.warn(
          { carbonInventoryId },
          "Emission factor dimensions do not match the requested dimension values"
        );
        return reply.status(422).send({
          code: "EMISSION_FACTOR_DIMENSION_MISMATCH",
          message:
            "One or more emission factors have dimensions that do not match the requested dimension values",
        });

      case "EMISSION_FACTOR_SOURCE_MISMATCH":
        log.warn(
          { carbonInventoryId },
          "Emission factor source does not match the provided factor source"
        );
        return reply.status(422).send({
          code: "EMISSION_FACTOR_SOURCE_MISMATCH",
          message:
            "The factor source does not match the emission factor's source",
        });

      case "EMISSION_FACTOR_VALUE_MISMATCH":
        log.warn(
          { carbonInventoryId },
          "Applied factor value does not match the converted emission factor value"
        );
        return reply.status(422).send({
          code: "EMISSION_FACTOR_VALUE_MISMATCH",
          message:
            "The applied factor value is not consistent with the base emission factor value after conversion to the applied rate measurement unit",
        });

      default:
        log.error({ error: result.error }, "Unexpected error updating lines");
        return reply.status(500).send({ message: "Internal server error" });
    }
  }

  log.info(
    { carbonInventoryId, updatedLineCount: result.data.length },
    "Carbon inventory lines updated successfully"
  );
  return reply.status(200).send(result.data);
};
