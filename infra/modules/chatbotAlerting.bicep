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
@description('Base for the escalation ladder: processed tokens in one hour above which the first alert fires. The higher rules sit at four and ten times this value.')
param hourlyTokenThreshold int = 50000

// Confirmed against a live account: `TokenTransaction` under the
// Microsoft.CognitiveServices/accounts namespace is what a deployed Azure
// OpenAI resource reports, and the alarm has fired on it. Left parameterised
// anyway, because a differently provisioned account may name it otherwise, and
// overriding beats editing the module. Verify with:
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
        // Payload shape, not notification policy: the common schema gives every
        // alarm here the same field names, so a reader does not have to learn
        // two formats. It does NOT suppress Azure's own "you have been added to
        // an action group" confirmation — nothing in the ARM surface does.
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
      // Three thresholds on ACTUAL spend, plus one on the FORECAST. The actual
      // ones are the ledger: accurate, and late by construction, because Azure
      // bills before it reports. The forecast one is the only notification in
      // this module that can arrive while there is still a month left to act
      // in, which is the whole complaint against a budget alarm otherwise —
      // being told what you already owe.
      //
      // It is noisier by nature: a projection swings on a single busy
      // afternoon. That is why it sits ALONGSIDE the actual thresholds instead
      // of replacing them. The forecast warns and may be wrong; the actual
      // ones record and are not.
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
      forecasted100: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Forecasted'
        contactGroups: [actionGroup.id]
      }
    }
  }
}

// Fires within minutes of abnormal token burn, which the budget cannot do
// because billing data arrives hours late. It still only notifies.
//
// THREE rules rather than one, because a single rule can only ever send one
// mail per episode. Azure Monitor notifies on the transition INTO "Fired" and
// then stays silent for as long as the condition holds, however much worse it
// gets — and with a one-hour window, continuing use keeps the condition true,
// so the episode never ends while the burn continues.
//
// That is not theoretical. In this deployment a 3445-token hour raised the
// alarm; twenty minutes later a 20766-token hour — six times the threshold —
// produced no mail at all, because the rule was already Fired. The loudest
// hour of the day was the silent one.
//
// Separate rules are separate state machines, so a climb crosses new ones and
// each sends its own first mail. The level that fires is also the severity
// that arrives, which turns "something is burning" into "this much".
//
// Expressed as multiples of the base threshold so a deployment overriding
// `hourlyTokenThreshold` moves the whole ladder with it, rather than having to
// keep three numbers consistent by hand.
var tokenAlertLevels = [
  { suffix: '', multiplier: 1, severity: 2, label: 'exceeded its hourly threshold' }
  { suffix: '-high', multiplier: 4, severity: 1, label: 'reached four times its hourly threshold' }
  { suffix: '-critical', multiplier: 10, severity: 0, label: 'reached ten times its hourly threshold' }
]

// The base level keeps the original resource name. Renaming it would leave the
// previously deployed rule behind as an unmanaged resource under
// `--action-on-unmanage detachAll`, still firing, owned by nobody.
resource tokenRateAlerts 'Microsoft.Insights/metricAlerts@2018-03-01' = [
  for level in tokenAlertLevels: {
    name: '${metricAlertName}${level.suffix}'
    location: 'global'
    tags: tags
    properties: {
      description: 'Chatbot token consumption ${level.label}. This alert does not throttle anything — see the TPM quota on the OpenAI deployments for the enforcing ceiling, and CHATBOT_ENABLED for the kill switch.'
      severity: level.severity
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
            threshold: hourlyTokenThreshold * level.multiplier
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
]

@description('Action group id, exposed so future alarms can reuse the same receiver rather than creating a second one.')
output actionGroupId string = actionGroup.id

@description('Region the module was deployed against, echoed for traceability.')
output deployedLocation string = location
