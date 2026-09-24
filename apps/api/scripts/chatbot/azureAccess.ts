import { spawnSync } from "node:child_process";

/** The data action every embeddings request is authorized against. */
export const EMBEDDINGS_DATA_ACTION =
  "Microsoft.CognitiveServices/accounts/OpenAI/deployments/embeddings/action";

/** The least-privileged built-in role that carries it, suggested in fixes. */
export const SUGGESTED_ROLE = "Cognitive Services OpenAI User";

/**
 * Its built-in definition id, the same in every tenant. Assigning by id keeps
 * the role name — which has spaces — off the command line, where the Windows
 * shell `az` runs through would split it.
 */
const SUGGESTED_ROLE_ID = "5e0bd9bd-7b93-4f28-af87-19fc36ad61bd";

type Principal = { id: string; type: "User" | "ServicePrincipal" };

/**
 * The fix for a missing role, ready to paste. `--assignee-object-id` with an
 * explicit principal type skips the Microsoft Graph lookup `--assignee` does,
 * which fails for operators without directory read access. Kept on one line so
 * it pastes the same into bash, PowerShell, and cmd.
 */
export const roleAssignmentHelp = (
  principal: Principal,
  accountId: string
): string =>
  "  Para obtenerlo, alguien con permiso para asignar roles en la cuenta (Owner, " +
  "User Access Administrator o Role Based Access Control Administrator) ejecuta:\n" +
  `    az role assignment create --assignee-object-id ${principal.id} ` +
  `--assignee-principal-type ${principal.type} --role "${SUGGESTED_ROLE}" --scope ${accountId}\n` +
  "  La asignación puede tardar hasta 10 minutos en propagarse; confirma con " +
  '"pnpm chatbot:ingest-corpus:check".';

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
  /**
   * Asked when the role is missing; answering yes assigns it on the spot.
   * Omitted in non-interactive runs, where a missing role only fails: a
   * permission change in Azure is never made without a person agreeing to it.
   */
  askToAssignRole?: (question: string) => Promise<boolean>;
};

export type AzureAccessSummary = {
  signedInAs: string;
  subscription: string;
  accountName: string;
  /**
   * The role was assigned during this run. Azure takes up to ten minutes to
   * honour a new assignment on the data plane, so the caller's first calls may
   * still be refused.
   */
  roleJustAssigned: boolean;
};

/**
 * Verify, through the operator's Azure CLI session, everything an embeddings
 * call needs: the account behind the endpoint, the deployment and its model,
 * and the right to call it — the account accepting keys when a key is set,
 * otherwise a role granting the embeddings data action. Subscription Owner is
 * not enough for the latter: it is a control-plane role with no data actions.
 *
 * Each check reports through `ok` as it passes and throws, with the command
 * that fixes it, on the first that fails — except a missing role, which it
 * offers to assign when `askToAssignRole` is given.
 */
export const validateAzureAccess = async (
  { endpoint, deploymentName, usesApiKey, askToAssignRole }: AzureAccessInput,
  ok: (message: string) => void
): Promise<AzureAccessSummary> => {
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
    roleJustAssigned: false,
  };

  const resolvePrincipal = (): Principal =>
    session.user.type === "user"
      ? {
          id: az<{ id: string }>(["ad", "signed-in-user", "show"]).id,
          type: "User",
        }
      : {
          id: az<{ id: string }>([
            "ad",
            "sp",
            "show",
            "--id",
            session.user.name,
          ]).id,
          type: "ServicePrincipal",
        };

  if (usesApiKey) {
    if (account.properties.disableLocalAuth) {
      throw new AzureAccessError(
        `La cuenta ${account.name} rechaza API keys (disableLocalAuth). Quita ` +
          `AZURE_OPENAI_API_KEY para autenticarte con tu sesión de az; esa ` +
          `identidad necesita el rol "${SUGGESTED_ROLE}".\n` +
          roleAssignmentHelp(resolvePrincipal(), account.id)
      );
    }
    ok("La cuenta acepta autenticación por API key");
    return summary;
  }

  const principal = resolvePrincipal();
  const assignments = az<
    Array<{ roleDefinitionId: string; roleDefinitionName: string }>
  >([
    "role",
    "assignment",
    "list",
    "--assignee",
    principal.id,
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
  let roleJustAssigned = false;
  if (grantingRole) {
    ok(
      `Rol "${grantingRole.roleDefinitionName}" sobre ${account.name} (incluye embeddings)`
    );
  } else {
    const held = assignments.map((assignment) => assignment.roleDefinitionName);
    const missingRole =
      `${session.user.name} no tiene un rol que permita generar embeddings en ${account.name}` +
      (held.length > 0
        ? ` (tiene: ${[...new Set(held)].join(", ")} — ninguno incluye acciones de datos de OpenAI).`
        : ".");
    if (!askToAssignRole) {
      throw new AzureAccessError(
        `${missingRole}\n${roleAssignmentHelp(principal, account.id)}`
      );
    }
    process.stdout.write(`  ⚠ ${missingRole}\n`);
    const assign = await askToAssignRole(
      `  ¿Asignarte "${SUGGESTED_ROLE}" sobre ${account.name} ahora?`
    );
    if (!assign) {
      throw new AzureAccessError(
        `Sin el rol no se puede ingerir.\n${roleAssignmentHelp(principal, account.id)}`
      );
    }
    try {
      az([
        "role",
        "assignment",
        "create",
        "--assignee-object-id",
        principal.id,
        "--assignee-principal-type",
        principal.type,
        "--role",
        SUGGESTED_ROLE_ID,
        "--scope",
        account.id,
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new AzureAccessError(
        `No se pudo asignar el rol: ${reason}\n` +
          "  Si no tienes permiso para asignar roles, pásale el comando a quien sí lo tenga:\n" +
          roleAssignmentHelp(principal, account.id)
      );
    }
    roleJustAssigned = true;
    ok(
      `Rol "${SUGGESTED_ROLE}" asignado a ${session.user.name} sobre ${account.name}`
    );
  }

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
  return { ...summary, roleJustAssigned };
};
