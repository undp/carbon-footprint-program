import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationFormFieldsResponse } from "@repo/types";
import { LOCAL_BYPASS_REQUIRED_FIELDS } from "@/config/environment.js";

/**
 * Handler for GET /forms/organizations
 * Returns the field definitions for the organization form
 */
export const getOrganizationFormFieldsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-forms-organizations" });

  log.info("Getting organization form fields...");

  // In a more complex scenario, this could come from a service or database
  // For now, we return the hardcoded field definitions that match the OrganizationMutationDataSchema
  const result: GetOrganizationFormFieldsResponse = {
    fields: [
      {
        key: "legalName",
        label: "Nombre legal de la entidad / Razón social",
        required: true,
      },
      { key: "tradeName", label: "Nombre comercial", required: true },
      {
        key: "taxId",
        label: "RUT / RUC / ID Tributario",
        required: false,
      },
      {
        key: "countryOrganizationSizeId",
        label: "Tipo / Tamaño organización",
        required: false,
      },
      { key: "sectorId", label: "Rubro / Sector económico", required: false },
      { key: "subsectorId", label: "Sub-rubro", required: false },
      {
        key: "employeesCount",
        label: "Cantidad de trabajadores",
        required: false,
      },
      { key: "address", label: "Dirección / Región", required: false },
      {
        key: "representativeFullName",
        label: "Nombre completo",
        required: !LOCAL_BYPASS_REQUIRED_FIELDS,
      },
      {
        key: "representativeTaxId",
        label: "ID representante",
        required: !LOCAL_BYPASS_REQUIRED_FIELDS,
      },
      {
        key: "representativePositionId",
        label: "Cargo",
        required: !LOCAL_BYPASS_REQUIRED_FIELDS,
      },
      {
        key: "representativePhone",
        label: "Teléfono",
        required: !LOCAL_BYPASS_REQUIRED_FIELDS,
      },
      {
        key: "representativeEmail",
        label: "Correo",
        required: !LOCAL_BYPASS_REQUIRED_FIELDS,
      },
      { key: "mainActivityId", label: "Actividad Principal", required: false },
    ],
  };

  log.info("Organization form fields retrieved successfully");
  return reply.status(200).send(result);
};
