// Cost alerting for the chatbot.
//
// NOTHING IN THIS MODULE THROTTLES ANYTHING. Every resource here notifies and
// nothing more. The only hard ceiling on chatbot spend at the infrastructure
// layer is the TPM capacity configured on the Azure OpenAI deployments
// (`chatCapacity` / `embeddingCapacity` in openai.bicep) — that is what caps
// throughput, and therefore cost per minute, when everything else fails.
//
// Two alarms rather than one, because they observe different things on
// different clocks:
//
//   budget       sees real money, but Azure billing lags roughly 8 hours
//   metric alert sees token burn within minutes, but knows nothing about cost
//
// Neither replaces the other, and neither replaces the kill switch
// (CHATBOT_ENABLED=false — see docs/operations/runbook.md), which is the only
// control that stops spend immediately.
//
// This module is Azure-only. The on-premise deployment topology has no Azure
// OpenAI account and no consumption data, so it has no cost alerting at all and
// relies entirely on the application-level quotas (burst limit, per-identity
// token budget, global anonymous token pool) in apps/api.

@description('Azure region for regional resources. Metric alerts and action groups are global; this is carried for tagging consistency only.')
param location string = resourceGroup().location

@description('Resource ID of the Azure OpenAI account the metric alert watches. Comes from openai.bicep\'s `id` output.')
param openAiAccountId string

@description('Email address notified by every alarm in this module.')
param alertEmailAddress string

@description('Monthly cost budget in USD. Default calibrated against the team\'s own modelling: ~10 USD/month at 300 users trips nothing, ~27 at 500 trips the 50% and 80% warnings, ~108 at 1000 exceeds all three. A default low enough to fire during normal use would train everyone to ignore it.')
param monthlyBudgetAmount int = 30

// Consumption budgets require a start date on the first of a month, and Bicep
// only allows utcNow() in a parameter default. Redeployments keep the original
// start date because the resource already exists; a fresh deployment starts
// from the current month.
@description('Budget start date, first day of a month (yyyy-MM-dd). Defaults to the first of the current month.')
param budgetStartDate string = utcNow('yyyy-MM-01')

@description('Budget end date (yyyy-MM-dd). Azure requires one; it is deliberately far out so the budget does not silently stop evaluating.')
param budgetEndDate string = '2035-01-01'

// Tokens processed in one hour that should never be reached by ordinary use.
// Expected demo usage is a handful of messages per user per month, so sustained
// consumption of more than one identity's entire daily budget within a single
// hour is already anomalous. The asymmetry favours a low threshold: a false
// alarm costs an email, a missed one costs money nothing else is stopping.
@description('Processed tokens in one hour above which the metric alert fires.')
param hourlyTokenThreshold int = 50000

// Parameterised because the exact metric name is the one thing in this module
// that could not be verified against a live account at authoring time. Azure
// OpenAI exposes token counters under the Microsoft.CognitiveServices/accounts
// namespace; if the deployed account names this differently, override here
// rather than editing the module. Verify with:
//   az monitor metrics list-definitions --resource <openAiAccountId> \
//     --query "[].{name:name.value, unit:unit}" -o table
@description('Metric name for processed tokens on the Azure OpenAI account. Override if the deployed account exposes a different name.')
param tokenMetricName string = 'TokenTransaction'

@description('Tags applied to taggable resources.')
param tags object = {}

var actionGroupName = 'ag-chatbot-cost'
var budgetName = 'budget-chatbot-monthly'
var metricAlertName = 'alert-chatbot-token-rate'

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'Global'
  tags: tags
  properties: {
    groupShortName: 'chatbotCost'
    enabled: true
    emailReceivers: [
      {
        name: 'chatbotCostOwner'
        emailAddress: alertEmailAddress
        // Azure's own "you have been added to an action group" confirmation
        // adds noise without adding signal; the alarms themselves still send.
        useCommonAlertSchema: true
      }
    ]
  }
}

// Scoped to the resource group this deployment targets, so it measures the cost
// of this stack rather than the whole subscription.
//
// DEPLOYMENT PREREQUISITE: creating this resource needs Microsoft.Consumption
// write permission, which a service principal scoped only to Contributor on the
// resource group may not hold. The failure surfaces at deploy time as an
// authorization error naming Microsoft.Consumption/budgets. Grant Cost
// Management Contributor to the deploying principal, or deploy this module
// separately by someone who has it.
resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: budgetName
  properties: {
    category: 'Cost'
    amount: monthlyBudgetAmount
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: budgetStartDate
      endDate: budgetEndDate
    }
    notifications: {
      // Thresholds are on ACTUAL spend, not forecast. A forecast alarm on a
      // service this small would swing wildly on a single busy afternoon.
      warning50: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 50
        thresholdType: 'Actual'
        contactGroups: [actionGroup.id]
      }
      warning80: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 80
        thresholdType: 'Actual'
        contactGroups: [actionGroup.id]
      }
      exceeded100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Actual'
        contactGroups: [actionGroup.id]
      }
    }
  }
}

// Fires within minutes of abnormal token burn, which the budget cannot do
// because billing data arrives hours late. It still only notifies.
resource tokenRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: metricAlertName
  location: 'global'
  tags: tags
  properties: {
    description: 'Chatbot token consumption exceeded the hourly threshold. This alert does not throttle anything — see the TPM quota on the OpenAI deployments for the enforcing ceiling, and CHATBOT_ENABLED for the kill switch.'
    severity: 2
    enabled: true
    scopes: [openAiAccountId]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT1H'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HourlyTokenBurn'
          metricNamespace: 'Microsoft.CognitiveServices/accounts'
          metricName: tokenMetricName
          operator: 'GreaterThan'
          threshold: hourlyTokenThreshold
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

@description('Action group id, exposed so future alarms can reuse the same receiver rather than creating a second one.')
output actionGroupId string = actionGroup.id

@description('Region the module was deployed against, echoed for traceability.')
output deployedLocation string = location
