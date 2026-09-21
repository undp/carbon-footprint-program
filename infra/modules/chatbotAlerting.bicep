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

// The ceiling every rung is measured against: the application's global daily
// token pool for anonymous callers. The alarms are fractions of THIS rather
// than absolute token counts, so there is one number to choose and the rungs
// follow it, and so the mail can say "half the day's allowance" instead of a
// figure the reader has to divide in their head.
//
// MUST BE KEPT EQUAL TO `CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY` in
// apps/api/src/config/constants.ts. Bicep cannot read a TypeScript constant, so
// this is a hand-maintained coupling — the kind that drifts silently. If the two
// disagree, the alarms describe a quota the application is not enforcing.
@description('Daily anonymous token pool the alert rungs are percentages of. Keep equal to CHATBOT_MAX_ANONYMOUS_TOKENS_PER_DAY in apps/api.')
param anonymousDailyTokenAllowance int = 300000

// Two honest caveats about comparing an hourly metric to a daily allowance.
//
// First, the window is an hour and the allowance is a day, so a rung is not
// "you have used half your quota" — it is "one hour consumed the equivalent of
// half a day's quota", which is the stronger statement and the one worth an
// alarm. At the 50% rung the day's pool dies in two hours at that rate.
//
// Second, the two count different things. Azure's TokenTransaction counts every
// token the account processes; the application's pool sums `tokens_used`, which
// records only the terminal round of a turn. Measured here, one turn was 3445
// by Azure and 2174 by the application — the app sees roughly 63%. So a rung
// set at a percentage of the pool trips somewhat before the pool itself empties,
// and it also counts authenticated traffic, which never draws on the pool at
// all. Both errors point the same way: the alarm speaks early. For an alarm
// that stops nothing, early is the right direction to be wrong in.

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
// Expressed as percentages of the daily allowance so a deployment overriding
// `anonymousDailyTokenAllowance` moves the whole ladder with it, rather than
// having to keep three numbers consistent by hand.
//
// The rungs deliberately reuse the budget's own 50 / 80 / 100 vocabulary, so a
// reader who has seen one alarm already knows how to read the other.
var tokenAlertLevels = [
  { suffix: '', percent: 50, severity: 2 }
  { suffix: '-high', percent: 80, severity: 1 }
  { suffix: '-critical', percent: 100, severity: 0 }
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
      description: 'La última hora consumió el ${level.percent}% de la cuota diaria anónima del asistente (${anonymousDailyTokenAllowance * level.percent / 100} de ${anonymousDailyTokenAllowance} tokens). A este ritmo la cuota del día se agota en ${100 / level.percent} hora(s). Esta alerta NO frena nada: el techo que sí frena son las cuotas de la aplicación y el interruptor CHATBOT_ENABLED, y la capacidad TPM de los despliegues de OpenAI.'
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
            threshold: anonymousDailyTokenAllowance * level.percent / 100
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
