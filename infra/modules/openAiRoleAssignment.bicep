targetScope = 'resourceGroup'

@description('Azure OpenAI account name (must exist in this resource group)')
param openAiAccountName string

@description('Principal ID to grant Cognitive Services OpenAI User')
param principalId string

@description('Principal type: ServicePrincipal for managed identities, Group for Azure AD groups')
@allowed([
  'ServicePrincipal'
  'Group'
])
param principalType string = 'ServicePrincipal'

// Existing Azure OpenAI account in this resource group
resource openAiAccount 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: openAiAccountName
}

// Cognitive Services OpenAI User role assignment
//
// Lets the App Service's managed identity call the chat and embedding endpoints
// without an API key. Same rationale as the storage role assignment: the App
// Service proves its identity through Azure AD and Azure checks RBAC, so no
// static credential exists to leak. The account is provisioned with
// `disableLocalAuth: true`, which makes this assignment the ONLY way in — if it
// is missing, every chatbot request fails with 401 at runtime even though the
// resource and its deployments exist.
//
// Role: Cognitive Services OpenAI User
// Built-in role ID: 5e0bd9bd-7b93-4f28-af87-19fc36ad61bd
// Docs: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/ai-machine-learning#cognitive-services-openai-user
//
// Permissions granted:
//   - Invoke inference on model deployments (chat completions, embeddings)
//   - Does NOT grant creating, modifying, or deleting deployments or the account
//
// Creating this assignment requires the DEPLOYING principal to hold
// `Microsoft.Authorization/roleAssignments/write` — User Access Administrator,
// Role Based Access Control Administrator, or Owner. `Contributor` is not
// enough, which is the single most common cause of a failed chatbot rollout.
// See docs/infrastructure/chatbot-ai-access-requirements.md.
resource openAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAiAccount.id, principalId, 'cognitive-services-openai-user')
  scope: openAiAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
    principalId: principalId
    principalType: principalType
  }
}
