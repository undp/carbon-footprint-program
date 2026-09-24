import { describe, it, expect } from "vitest";
import {
  EMBEDDINGS_DATA_ACTION,
  findAccountForEndpoint,
  grantsDataAction,
  roleAssignmentHelp,
  SUGGESTED_ROLE,
  supportsConfiguredDimensions,
  type CognitiveServicesAccount,
} from "../../../../scripts/chatbot/azureAccess.js";

describe("grantsDataAction", () => {
  it("accepts a role listing the embeddings action", () => {
    expect(
      grantsDataAction(
        [{ dataActions: [EMBEDDINGS_DATA_ACTION], notDataActions: [] }],
        EMBEDDINGS_DATA_ACTION
      )
    ).toBe(true);
  });

  it("matches wildcards case-insensitively", () => {
    expect(
      grantsDataAction(
        [
          {
            dataActions: ["microsoft.cognitiveservices/*"],
            notDataActions: [],
          },
        ],
        EMBEDDINGS_DATA_ACTION
      )
    ).toBe(true);
  });

  it("rejects a control-plane role such as Owner", () => {
    // Owner is `actions: ["*"]` with no data actions at all.
    expect(
      grantsDataAction(
        [{ dataActions: [], notDataActions: [] }],
        EMBEDDINGS_DATA_ACTION
      )
    ).toBe(false);
  });

  it("honours notDataActions in the same block", () => {
    expect(
      grantsDataAction(
        [
          {
            dataActions: ["Microsoft.CognitiveServices/accounts/OpenAI/*"],
            notDataActions: [
              "Microsoft.CognitiveServices/accounts/OpenAI/deployments/*",
            ],
          },
        ],
        EMBEDDINGS_DATA_ACTION
      )
    ).toBe(false);
  });
});

describe("findAccountForEndpoint", () => {
  const account = (subdomain: string): CognitiveServicesAccount => ({
    id: `/accounts/${subdomain}`,
    name: subdomain,
    resourceGroup: "rg",
    properties: { customSubDomainName: subdomain },
  });
  const accounts = [account("oai-dev"), account("Foundry-Prod")];

  it("finds the account on every host it answers on", () => {
    for (const endpoint of [
      "https://oai-dev.openai.azure.com/",
      "https://oai-dev.cognitiveservices.azure.com",
      "https://oai-dev.services.ai.azure.com/",
    ]) {
      expect(findAccountForEndpoint(accounts, endpoint)?.name).toBe("oai-dev");
    }
  });

  it("compares the subdomain case-insensitively", () => {
    expect(
      findAccountForEndpoint(accounts, "https://foundry-prod.openai.azure.com")
        ?.name
    ).toBe("Foundry-Prod");
  });

  it("returns undefined when no account matches", () => {
    expect(
      findAccountForEndpoint(accounts, "https://other.openai.azure.com")
    ).toBeUndefined();
  });
});

describe("supportsConfiguredDimensions", () => {
  it("accepts the text-embedding-3 family only", () => {
    expect(supportsConfiguredDimensions("text-embedding-3-large")).toBe(true);
    expect(supportsConfiguredDimensions("text-embedding-3-small")).toBe(true);
    expect(supportsConfiguredDimensions("text-embedding-ada-002")).toBe(false);
    expect(supportsConfiguredDimensions("gpt-4o-mini")).toBe(false);
  });
});

describe("roleAssignmentHelp", () => {
  it("gives a one-line command that skips the Graph lookup", () => {
    const help = roleAssignmentHelp(
      { id: "principal-id", type: "ServicePrincipal" },
      "/subscriptions/s/accounts/oai-dev"
    );

    const command = help
      .split("\n")
      .find((line) => line.includes("az role assignment create"));
    expect(command?.trim()).toBe(
      "az role assignment create --assignee-object-id principal-id " +
        `--assignee-principal-type ServicePrincipal --role "${SUGGESTED_ROLE}" ` +
        "--scope /subscriptions/s/accounts/oai-dev"
    );
  });
});
