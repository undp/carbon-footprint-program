## ADDED Requirements

### Requirement: Infrastructure provisions cost alerting for the chatbot, gated by enableChatbot

The Bicep deployment SHALL provision a cost-alerting module gated by the existing `enableChatbot` parameter, matching how every other chatbot resource is gated. When `enableChatbot` is false the module SHALL provision nothing.

The module SHALL contain an action group, a monthly consumption budget, and an Azure Monitor metric alert on the Azure OpenAI account.

#### Scenario: Alerting is absent when the chatbot is disabled

- **WHEN** the deployment runs with `enableChatbot` set to false
- **THEN** no action group, budget, or metric alert SHALL be created

#### Scenario: Alerting is present when the chatbot is enabled

- **WHEN** the deployment runs with `enableChatbot` set to true
- **THEN** the action group, the consumption budget, and the metric alert SHALL all be created

### Requirement: A monthly consumption budget warns at three thresholds

The module SHALL create a `Microsoft.Consumption/budgets` resource scoped to the resource group, with notification thresholds at 50%, 80%, and 100% of a monthly amount on ACTUAL spend, and a fourth at 100% on FORECAST spend. The amount SHALL be a Bicep parameter with a default of 30 USD.

The forecast threshold is the only notification in the module that can arrive before the money is spent: Azure bills before it reports, so every actual threshold is late by construction. It is noisier, because a projection swings on a single busy afternoon, which is why it accompanies the actual thresholds rather than replacing them — the forecast warns and may be wrong, the actual ones record and are not.

The default is calibrated so that normal operation is silent and growth is audible: at 300 monthly users the modelled spend is roughly 10 USD and trips nothing, at 500 users it is roughly 27 USD and trips the first two thresholds, and at 1000 users it is roughly 108 USD and exceeds all three.

#### Scenario: Projected overspend warns before it is billed

- **WHEN** Azure projects month-end spend at or above the budget amount
- **THEN** the budget SHALL notify the action group while there is still time to act, without waiting for the spend to be billed

#### Scenario: Budget notifies the action group at each threshold

- **WHEN** accrued spend for the month crosses 50%, 80%, or 100% of the configured amount
- **THEN** the budget SHALL notify the action group at each crossing

#### Scenario: Budget amount is overridable per deployment

- **WHEN** a deployment supplies its own monthly amount
- **THEN** that value SHALL replace the default without any code change

### Requirement: A metric alert detects token-rate anomalies within minutes

The module SHALL create THREE Azure Monitor metric alerts on the Azure OpenAI account, at one, four, and ten times a base threshold of 50000 processed tokens in a one-hour window, at severities 2, 1 and 0 respectively, all notifying the action group. The higher rules SHALL be expressed as multiples of the base so that overriding it moves the whole ladder.

One rule is not enough, because a metric alert notifies on the transition into `Fired` and stays silent while the condition holds, however much worse it gets. With a one-hour window, continuing consumption keeps the condition true, so the episode never ends while the burn continues. This was observed: a 3445-token hour raised the alarm, and a 20766-token hour twenty minutes later produced no notification at all, because the rule was already firing. Separate rules are separate state machines, so a climb crosses new ones and each sends its own first notification, and the severity that arrives states the magnitude.

The base threshold is deliberately low. Expected demo usage is a handful of messages per user per month, so sustained consumption of more than one identity's entire daily budget within a single hour is already anomalous. The asymmetry favours a low threshold: a false alarm costs an email, while a missed one costs money that nothing else is stopping.

Two alarms exist rather than one because they observe different things on different clocks. Azure billing lags roughly eight hours, so the budget sees real money but sees it late; the metric sees abuse within minutes but knows nothing about cost. Neither replaces the other.

#### Scenario: Sustained abnormal consumption raises the alert

- **WHEN** processed tokens in a one-hour window exceed the configured threshold
- **THEN** the metric alert SHALL fire and notify the action group

#### Scenario: Worsening consumption raises a further alert

- **WHEN** consumption climbs past a higher rung while a lower rule is already firing
- **THEN** the higher rule SHALL fire and notify independently, rather than being suppressed by the episode already open on the lower one

#### Scenario: Ordinary demo usage does not raise the alert

- **WHEN** consumption stays within the modelled demo range for an hour
- **THEN** the metric alert SHALL NOT fire

### Requirement: Alerting module documents that it throttles nothing

The module SHALL carry comments stating that neither the budget nor the metric alert stops or throttles any request, and that the only hard ceiling on chatbot spend at the infrastructure layer is the TPM capacity configured on the Azure OpenAI deployments.

This is recorded in the module itself because an alert is easily mistaken for a control, and that mistake is only discovered during an incident.

#### Scenario: A reader of the module learns what actually stops spend

- **WHEN** the alerting module is read
- **THEN** it SHALL state that its resources only notify, and SHALL name the TPM quota as the enforcing ceiling
