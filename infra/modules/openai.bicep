targetScope = 'resourceGroup'

@description('Location for the Azure OpenAI account. Often differs from the resource group location — model availability is regional, so pick a region that offers BOTH the chat and embedding models.')
param location string

@description('Tags to apply to the account')
param tags object = {}

@description('Chat model deployment name. Becomes AZURE_OPENAI_DEPLOYMENT_NAME on the API.')
param chatDeploymentName string = 'chat'

@description('Chat model to deploy')
param chatModelName string = 'gpt-4o-mini'

@description('Chat model version. Pinned deliberately — "latest" drifts under you, and a model swap changes answer quality without any code change.')
param chatModelVersion string = '2024-07-18'

@description('Chat capacity in thousands of tokens per minute (TPM). Quota is granted per subscription/region and is NOT implied by RBAC — a deployment can fail here with correct permissions.')
param chatCapacity int = 30

// Deployment SKU decides where inference physically runs, and SKUs are retired
// independently of the model: regional `Standard` for gpt-4o-mini was
// deprecated on 2026-03-31 while the model itself runs to 2027-04-14. Preflight
// rejects a retired SKU with "ServiceModelDeprecated", naming the model rather
// than the SKU, which sends you looking at the version.
//
// Default is the most residency-preserving option still supported for this
// model: DataZoneStandard keeps inference inside one data zone (US or EU),
// where GlobalStandard may route anywhere. User chat messages reach the model,
// and this platform documents Latin American data-protection considerations, so
// the narrower option is the right default even though both run to 2028-04-13.
//
// Verify before changing — the catalogue is per-region and moves:
//   az cognitiveservices model list --location <region> \
//     --query "[?model.name=='<model>'] | [0].model.skus[].{sku:name, deprecation:deprecationDate}" -o table
@description('Deployment SKU for the chat model (e.g. DataZoneStandard, GlobalStandard, Standard). SKUs retire independently of the model — check the catalogue for the target region before changing.')
param chatSkuName string = 'DataZoneStandard'

@description('Embedding model deployment name. Becomes AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME on the API.')
param embeddingDeploymentName string = 'embeddings'

@description('Embedding model to deploy')
param embeddingModelName string = 'text-embedding-3-large'

@description('Embedding model version')
param embeddingModelVersion string = '1'

@description('Embedding capacity in thousands of tokens per minute (TPM). Ingest is bursty — a corpus run embeds every chunk — so this is sized above the chat deployment.')
param embeddingCapacity int = 50

// Regional `Standard` is still supported for text-embedding-3-large (to
// 2028-02-09) and keeps inference in the account's own region, which is tighter
// than the chat model can manage — hence the deliberately different default.
// The rule behind both: most residency-preserving SKU that is not deprecated.
@description('Deployment SKU for the embedding model. Regional Standard is supported for text-embedding-3-large and keeps inference in-region; check the catalogue before changing.')
param embeddingSkuName string = 'Standard'

// Keyless by default. `disableLocalAuth` switches off API-key authentication at
// the resource, which is the posture documented in docs/security/chatbot.md:
// production authenticates with the App Service managed identity and leaves
// AZURE_OPENAI_API_KEY unset. Turning this off is a deliberate downgrade — the
// keys become a static credential that can leak — so it is a parameter rather
// than a hardcoded value, but the default is the secure one.
@description('Disable API-key auth on the account, forcing Entra ID (managed identity). Leave true unless a deployment genuinely cannot use managed identity.')
param disableLocalAuth bool = true

// Globally unique, and stable for a given resource group.
var accountName = 'oai-${uniqueString(resourceGroup().id)}'

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    // REQUIRED for Entra ID authentication. Without a custom subdomain the
    // account is only reachable on the regional shared endpoint, which does not
    // accept AAD tokens — managed identity would fail at runtime with a
    // 401 that looks like a missing role assignment. Do not remove.
    customSubDomainName: accountName
    disableLocalAuth: disableLocalAuth
    publicNetworkAccess: 'Enabled'
  }
}

// Chat deployment.
//
// Azure serializes deployment writes on a single account: creating two at once
// intermittently fails with a conflict. The embedding deployment below therefore
// depends on this one — the dependency is for ordering, not for data.
resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: chatDeploymentName
  sku: {
    name: chatSkuName
    capacity: chatCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: chatModelName
      version: chatModelVersion
    }
  }
}

// Embedding deployment.
//
// The API requests `dimensions: 1024` from this model, matching the
// `vector(1024)` column and the HNSW index. Changing the model or its output
// dimensionality invalidates every stored embedding — the corpus has to be
// re-ingested, not migrated. See the re-embed playbook in docs/operations/runbook.md.
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: embeddingDeploymentName
  dependsOn: [
    chatDeployment
  ]
  sku: {
    name: embeddingSkuName
    capacity: embeddingCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
  }
}

@description('Azure OpenAI account name')
output name string = account.name

@description('Azure OpenAI account resource ID')
output id string = account.id

@description('Azure OpenAI endpoint (AZURE_OPENAI_ENDPOINT)')
output endpoint string = account.properties.endpoint

@description('Chat deployment name (AZURE_OPENAI_DEPLOYMENT_NAME)')
output chatDeploymentNameOut string = chatDeployment.name

@description('Embedding deployment name (AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME)')
output embeddingDeploymentNameOut string = embeddingDeployment.name
