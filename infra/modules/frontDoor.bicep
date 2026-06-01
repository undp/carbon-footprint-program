@description('Location for Azure Front Door')
param location string = 'Global'

@description('SKU for Azure Front Door')
@allowed([
  'Standard_AzureFrontDoor'
  'Premium_AzureFrontDoor'
])
param skuName string = 'Standard_AzureFrontDoor'

@description('Origin hostname (Static Web App default hostname)')
param originHostname string

@description('Custom domain name (optional)')
param customDomainName string = ''

@description('Enable WAF managed rules (requires Premium SKU)')
param enableManagedRules bool = false

@description('WAF mode: Prevention blocks attacks, Detection only logs')
@allowed([
  'Prevention'
  'Detection'
])
param wafMode string = 'Detection'

@description('Rate limit threshold (requests per minute per IP)')
@minValue(10)
@maxValue(10000)
param rateLimitThreshold int = 100

@description('Tags to apply to resources')
param tags object = {}

// Generate unique Front Door profile name
var frontDoorProfileName = 'fd-${uniqueString(resourceGroup().id)}'
var wafPolicyName = 'waf${uniqueString(resourceGroup().id)}'

// Determine if Premium features are available
var isPremiumSku = skuName == 'Premium_AzureFrontDoor'
var useManagedRules = enableManagedRules && isPremiumSku

// WAF Policy for Front Door
// Standard SKU: Custom rules only (~$35/mo)
// Premium SKU: Custom rules + Managed rules (~$330/mo)
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2025-10-01' = {
  name: wafPolicyName
  location: 'global'
  tags: tags
  sku: {
    name: skuName
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: wafMode
      requestBodyCheck: isPremiumSku ? 'Enabled' : 'Disabled'
    }
    managedRules: useManagedRules ? {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
        }
      ]
    } : {
      managedRuleSets: []
    }
    customRules: {
      rules: [
        {
          name: 'RateLimitRule'
          priority: 100
          ruleType: 'RateLimitRule'
          rateLimitThreshold: rateLimitThreshold
          rateLimitDurationInMinutes: 1
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'IPMatch'
              negateCondition: false
              matchValue: [
                '0.0.0.0/0'
              ]
            }
          ]
          action: 'Block'
        }
      ]
    }
  }
}

// Front Door Profile
resource frontDoorProfile 'Microsoft.Cdn/profiles@2025-06-01' = {
  name: frontDoorProfileName
  location: location
  tags: tags
  sku: {
    name: skuName
  }
}

// Front Door Endpoint
resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2025-06-01' = {
  parent: frontDoorProfile
  name: 'endpoint-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    enabledState: 'Enabled'
  }
}

// Origin Group
// Note: Health probes disabled - with single origin they don't affect routing
// and only add bandwidth costs. Azure Front Door routes to the origin regardless.
resource originGroup 'Microsoft.Cdn/profiles/originGroups@2025-06-01' = {
  parent: frontDoorProfile
  name: 'origin-group-swa'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    sessionAffinityState: 'Disabled'
  }
}

// Origin (Static Web App)
resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2025-06-01' = {
  parent: originGroup
  name: 'origin-swa'
  properties: {
    hostName: originHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: originHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// Default Route with compression enabled
// Note: Cache rules removed due to API version incompatibility
// Cache control is now managed via origin headers from Static Web App
resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2025-06-01' = {
  parent: frontDoorEndpoint
  name: 'route-default'
  dependsOn: [
    origin
  ]
  properties: {
    originGroup: {
      id: originGroup.id
    }
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        contentTypesToCompress: [
          'application/javascript'
          'application/json'
          'application/xml'
          'text/css'
          'text/html'
          'text/javascript'
          'text/plain'
        ]
        isCompressionEnabled: true
      }
    }
    customDomains: customDomainName != '' ? [
      {
        id: customDomain.id
      }
    ] : []
  }
}

// Custom Domain (optional)
resource customDomain 'Microsoft.Cdn/profiles/customDomains@2025-06-01' = if (customDomainName != '') {
  parent: frontDoorProfile
  name: replace(customDomainName, '.', '-')
  properties: {
    hostName: customDomainName
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

// Security Policy - Associates WAF with endpoints and custom domains
resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2025-06-01' = {
  parent: frontDoorProfile
  name: 'security-policy'
  dependsOn: [
    route
  ]
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: [
        {
          domains: concat(
            [
              {
                id: frontDoorEndpoint.id
              }
            ],
            customDomainName != '' ? [
              {
                id: customDomain.id
              }
            ] : []
          )
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
}

// Outputs
@description('Front Door Profile ID')
output profileId string = frontDoorProfile.id

@description('Front Door Profile name')
output profileName string = frontDoorProfile.name

@description('Front Door Endpoint hostname')
output endpointHostname string = frontDoorEndpoint.properties.hostName

@description('Front Door Endpoint ID')
output endpointId string = frontDoorEndpoint.id
