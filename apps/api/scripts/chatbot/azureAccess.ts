import { spawnSync } from "node:child_process";

/** The data action every embeddings request is authorized against. */
export const EMBEDDINGS_DATA_ACTION =
  "Microsoft.CognitiveServices/accounts/OpenAI/deployments/embeddings/action";

/** The least-privileged built-in role that carries it, suggested in fixes. */
const SUGGESTED_ROLE = "Cognitive Services OpenAI User";

export class AzureAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureAccessError";
  }
}

export type CognitiveServicesAccount = {
  id: string;
  name: string;
  resourceGroup: string;
  properties: {
    customSubDomainName?: string | null;
    disableLocalAuth?: boolean | null;
  };
};

type RolePermission = { dataActions: string[]; notDataActions: string[] };

const wildcardToRegExp = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"))
      .join(".*")}$`,
    "i"
  );

/**
 * Whether a role's permissions allow `action`, evaluated the way Azure RBAC
 * does: a permission block grants it when one of its `dataActions` patterns
 * matches and none of the same block's `notDataActions` does. Checking the
 * permissions rather than a list of role names keeps custom roles and newer
 * built-ins (Azure AI User, …) working.
 */
export const grantsDataAction = (
  permissions: RolePermission[],
  action: string
): boolean =>
  permissions.some(
    ({ dataActions, notDataActions }) =>
      dataActions.some((pattern) => wildcardToRegExp(pattern).test(action)) &&
      !notDataActions.some((pattern) => wildcardToRegExp(pattern).test(action))
  );

/**
 * Find the account behind an endpoint by its custom subdomain — the first
 * label of the host. Matching on the label rather than the full URL covers
 * every host an account answers on (`.openai.azure.com`,
 * `.cognitiveservices.azure.com`, `.services.ai.azure.com`).
 */
export const findAccountForEndpoint = (
  accounts: CognitiveServicesAccount[],
  endpoint: string
): CognitiveServicesAccount | undefined => {
  const subdomain = new URL(endpoint).hostname.split(".")[0]?.toLowerCase();
  return accounts.find(
    (account) =>
      account.properties.customSubDomainName?.toLowerCase() === subdomain
  );
};

/**
 * The embedding provider requests 1024-dimensional vectors to fit the
 * `vector(1024)` column, and only the text-embedding-3 family accepts the
 * `dimensions` parameter; ada-002 rejects it.
 */
export const supportsConfiguredDimensions = (modelName: string): boolean =>
  /^text-embedding-3-/i.test(modelName);

/**
 * Run an Azure CLI command and parse its JSON output. `shell` on Windows only,
 * where `az` is a `.cmd`; every argument passed here is free of spaces, so the
 * shell never re-tokenizes one.
 */
const az = <T>(args: string[]): T => {
  const result = spawnSync(
    "az",
    [...args, "--only-show-errors", "-o", "json"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    }
  );
  if (result.error) {
    throw new AzureAccessError(
      `No se pudo ejecutar la Azure CLI (az): ${result.error.message}. Instálala: https://learn.microsoft.com/cli/azure/install-azure-cli`
    );
  }
  if (result.status !== 0) {
    throw new AzureAccessError(
      `"az ${args.slice(0, 3).join(" ")}" falló: ${result.stderr.trim()}`
    );
  }
  return JSON.parse(result.stdout) as T;
};

type AzureAccessInput = {
  endpoint: string;
  deploymentName: string;
  usesApiKey: boolean;
};

export type AzureAccessSummary = {
  signedInAs: string;
  subscription: string;
  accountName: string;
};

/**
 * Verify, through the operator's Azure CLI session, everything an embeddings
 * call needs: the account behind the endpoint, the deployment and its model,
 * and the right to call it — the account accepting keys when a key is set,
 * otherwise a role granting the embeddings data action. Subscription Owner is
 * not enough for the latter: it is a control-plane role with no data actions.
 *
 * Each check reports through `ok` as it passes and throws, with the command
 * that fixes it, on the first that fails.
 */
export const validateAzureAccess = (
  { endpoint, deploymentName, usesApiKey }: AzureAccessInput,
  ok: (message: string) => void
): AzureAccessSummary => {
  const version = az<{ "azure-cli": string }>(["version"]);
  let session: {
    name: string;
    id: string;
    user: { name: string; type: string };
  };
  try {
    session = az(["account", "show"]);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AzureAccessError(
      `No hay una sesión de Azure CLI. Ejecuta "az login". (${reason})`
    );
  }
  ok(
    `Azure CLI ${version["azure-cli"]}: sesión de ${session.user.name} en la suscripción "${session.name}"`
  );

  const account = findAccountForEndpoint(
    az<CognitiveServicesAccount[]>(["cognitiveservices", "account", "list"]),
    endpoint
  );
  if (!account) {
    throw new AzureAccessError(
      `No se encontró la cuenta de ${endpoint} en la suscripción "${session.name}". ` +
        'Si está en otra, ejecuta "az account set --subscription <id>" y vuelve a correr.'
    );
  }
  ok(`Cuenta Azure OpenAI ${account.name} (grupo ${account.resourceGroup})`);

  let deployment: {
    properties: { model: { name: string; version: string } };
    sku: { name: string };
  };
  try {
    deployment = az([
      "cognitiveservices",
      "account",
      "deployment",
      "show",
      "--resource-group",
      account.resourceGroup,
      "--name",
      account.name,
      "--deployment-name",
      deploymentName,
    ]);
  } catch {
    throw new AzureAccessError(
      `La cuenta ${account.name} no tiene un deployment "${deploymentName}". ` +
        `Revisa AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME o lista los existentes con ` +
        `"az cognitiveservices account deployment list -g ${account.resourceGroup} -n ${account.name}".`
    );
  }
  const { model } = deployment.properties;
  if (!supportsConfiguredDimensions(model.name)) {
    throw new AzureAccessError(
      `El deployment "${deploymentName}" usa el modelo ${model.name}, que no acepta ` +
        "dimensions=1024. Usa un modelo text-embedding-3 (text-embedding-3-large)."
    );
  }
  ok(
    `Deployment ${deploymentName}: ${model.name} v${model.version} (${deployment.sku.name})`
  );

  const summary = {
    signedInAs: session.user.name,
    subscription: session.name,
    accountName: account.name,
  };

  if (usesApiKey) {
    if (account.properties.disableLocalAuth) {
      throw new AzureAccessError(
        `La cuenta ${account.name} rechaza API keys (disableLocalAuth). Quita ` +
          `AZURE_OPENAI_API_KEY para autenticarte con tu sesión de az y asígnate el rol "${SUGGESTED_ROLE}".`
      );
    }
    ok("La cuenta acepta autenticación por API key");
    return summary;
  }

  const principalId =
    session.user.type === "user"
      ? az<{ id: string }>(["ad", "signed-in-user", "show"]).id
      : az<{ id: string }>(["ad", "sp", "show", "--id", session.user.name]).id;
  const assignments = az<
    Array<{ roleDefinitionId: string; roleDefinitionName: string }>
  >([
    "role",
    "assignment",
    "list",
    "--assignee",
    principalId,
    "--scope",
    account.id,
    "--include-inherited",
    "--include-groups",
  ]);
  const grantingRole = [
    ...new Map(
      assignments.map((assignment) => [assignment.roleDefinitionId, assignment])
    ).values(),
  ].find((assignment) => {
    const roleGuid = assignment.roleDefinitionId.split("/").pop() ?? "";
    const [definition] = az<Array<{ permissions: RolePermission[] }>>([
      "role",
      "definition",
      "list",
      "--name",
      roleGuid,
    ]);
    return definition
      ? grantsDataAction(definition.permissions, EMBEDDINGS_DATA_ACTION)
      : false;
  });
  if (!grantingRole) {
    const held = assignments.map((assignment) => assignment.roleDefinitionName);
    throw new AzureAccessError(
      `${session.user.name} no tiene un rol que permita generar embeddings en ${account.name}` +
        (held.length > 0
          ? ` (tiene: ${[...new Set(held)].join(", ")} — ninguno incluye acciones de datos de OpenAI).`
          : ".") +
        ` Asígnalo con:\n    az role assignment create --assignee ${principalId} --role "${SUGGESTED_ROLE}" --scope ${account.id}\n` +
        "  La asignación puede tardar unos minutos en propagarse."
    );
  }
  ok(
    `Rol "${grantingRole.roleDefinitionName}" sobre ${account.name} (incluye embeddings)`
  );

  // DefaultAzureCredential tries these before the Azure CLI: when present, the
  // API authenticates as that identity, not as the session checked above.
  const credentialOverride = [
    "AZURE_CLIENT_SECRET",
    "AZURE_CLIENT_CERTIFICATE_PATH",
    "AZURE_FEDERATED_TOKEN_FILE",
  ].find((name) => process.env[name]);
  if (credentialOverride) {
    process.stdout.write(
      `  ⚠ ${credentialOverride} está definida: DefaultAzureCredential usará esa identidad, no la sesión de az validada arriba.\n`
    );
  }
  return summary;
};
