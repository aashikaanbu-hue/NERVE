$ErrorActionPreference = "Stop"

$apiBaseUrl =
  "http://localhost:4000/api/v1"

$agentBaseUrl =
  "http://127.0.0.1:8000"

$passedTests = 0

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw "[FAIL] $Message"
  }

  $script:passedTests++

  Write-Host `
    "[PASS] $Message" `
    -ForegroundColor Green
}

function Assert-HttpStatus {
  param(
    [string]$Uri,
    [int]$ExpectedStatus,
    [string]$Method = "GET",
    [object]$Body = $null
  )

  $request = @{
    Uri = $Uri
    Method = $Method
    UseBasicParsing = $true
    ErrorAction = "Stop"
  }

  if ($null -ne $Body) {
    $request.ContentType =
      "application/json"

    $request.Body =
      $Body |
      ConvertTo-Json -Depth 20
  }

  $actualStatus = 0

  try {
    $result =
      Invoke-WebRequest @request

    $actualStatus =
      [int]$result.StatusCode
  }
  catch {
    if (
      $null -eq
      $_.Exception.Response
    ) {
      throw
    }

    $actualStatus =
      [int]$_.Exception.Response.StatusCode
  }

  Assert-True `
    ($actualStatus -eq $ExpectedStatus) `
    "$Method $Uri returns HTTP $ExpectedStatus"
}

function Invoke-AgentPost {
  param(
    [string]$Path,
    [object]$Payload
  )

  return Invoke-RestMethod `
    -Uri "$agentBaseUrl$Path" `
    -Method Post `
    -ContentType "application/json" `
    -Body (
      $Payload |
      ConvertTo-Json -Depth 20
    )
}

Write-Host ""
Write-Host "NERVE DAY 19 SMOKE TESTS" `
  -ForegroundColor Cyan

Write-Host "========================" `
  -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Service health"

$apiHealth =
  Invoke-RestMethod `
    -Uri "$apiBaseUrl/health"

Assert-True `
  (
    $apiHealth.status -in @(
      "healthy",
      "degraded"
    )
  ) `
  "Node API health endpoint responds"

Assert-True `
  (
    $apiHealth.agentService.status -eq
    "online"
  ) `
  "Node API confirms agent service is online"

$agentHealth =
  Invoke-RestMethod `
    -Uri "$agentBaseUrl/health"

Assert-True `
  (
    $agentHealth.status -eq
    "healthy"
  ) `
  "FastAPI agent service is healthy"

Write-Host ""
Write-Host "2. Authentication security"

Assert-HttpStatus `
  -Uri "$apiBaseUrl/operations/agent-runs" `
  -ExpectedStatus 401

Write-Host ""
Write-Host "3. Invalid input handling"

Assert-HttpStatus `
  -Uri "$agentBaseUrl/api/v1/agents/sense/analyse-field-report" `
  -ExpectedStatus 422 `
  -Method "POST" `
  -Body @{
    agentRunId = ""
  }

Write-Host ""
Write-Host "4. Sense agent"

$testId =
  [guid]::NewGuid().
    ToString("N")

$sensePayload = @{
  agentRunId =
    "smoke-sense-$testId"

  fieldReportId =
    "smoke-field-report"

  title =
    "Fresh slope movement near test corridor"

  description =
    "Fresh soil movement, continuous water seepage and falling stones may block the road after heavy rainfall."

  latitude = 25.28690
  longitude = 91.72520

  mediaUrls = @(
    "https://example.com/evidence/test.jpg"
  )

  corridorId =
    "smoke-corridor"

  roadSegmentId = $null
  incidentId = $null

  capturedAt =
    (Get-Date).ToString("o")
}

$senseResult =
  Invoke-AgentPost `
    -Path "/api/v1/agents/sense/analyse-field-report" `
    -Payload $sensePayload

Assert-True `
  ($senseResult.status -eq "COMPLETED") `
  "Sense agent completes successfully"

Assert-True `
  (
    $senseResult.riskScore -ge 0 -and
    $senseResult.riskScore -le 100
  ) `
  "Sense risk score stays within 0-100"

Assert-True `
  ($senseResult.requiresApproval -eq $true) `
  "Sense output remains human supervised"

Assert-True `
  (
    @(
      $senseResult.toolCalls |
      Where-Object {
        $_.status -ne "SUCCEEDED"
      }
    ).Count -eq 0
  ) `
  "Sense tool calls succeed"

Write-Host ""
Write-Host "5. Impact agent"

$impactPayload = @{
  agentRunId =
    "smoke-impact-$testId"

  senseAgentRunId =
    $sensePayload.agentRunId

  fieldReportId =
    $sensePayload.fieldReportId

  senseRiskScore =
    $senseResult.riskScore

  affectedCorridorId =
    "smoke-corridor"

  communities = @(
    @{
      id = "smoke-community-1"
      name = "Test Village A"
      population = 1200
      criticalFacilityCount = 1

      corridors = @(
        @{
          id = "smoke-corridor"
          status = "CAUTION"
          riskScore = 88
        }
      )
    },
    @{
      id = "smoke-community-2"
      name = "Test Village B"
      population = 800
      criticalFacilityCount = 0

      corridors = @(
        @{
          id = "smoke-corridor"
          status = "CAUTION"
          riskScore = 88
        },
        @{
          id = "smoke-alternative"
          status = "ACCESSIBLE"
          riskScore = 20
        }
      )
    }
  )
}

$impactResult =
  Invoke-AgentPost `
    -Path "/api/v1/agents/impact/analyse-connectivity" `
    -Payload $impactPayload

Assert-True `
  ($impactResult.status -eq "COMPLETED") `
  "Impact agent completes successfully"

Assert-True `
  (
    $impactResult.metrics.communitiesReviewed -eq
    2
  ) `
  "Impact agent reviews supplied communities"

Assert-True `
  ($impactResult.requiresApproval -eq $true) `
  "Impact output remains human supervised"

Write-Host ""
Write-Host "6. Route agent"

$routePayload = @{
  agentRunId =
    "smoke-route-$testId"

  impactAgentRunId =
    $impactPayload.agentRunId

  affectedCorridorId =
    "smoke-corridor"

  corridorRiskScore = 68.5

  communitiesWithoutRecordedAlternative =
    1

  populationWithoutRecordedAlternative =
    1200

  deliveries = @(
    @{
      id = "smoke-delivery"
      referenceNumber =
        "DEL-SMOKE-001"

      priority = "CRITICAL"
      status = "REROUTED"

      destinationCommunityId =
        "smoke-community-1"

      routeCandidates = @(
        @{
          id = "primary-route"
          name = "Primary test route"
          distanceKm = 54
          estimatedMinutes = 112
          riskScore = 84
          hasGeometry = $true
          isApproved = $false
          isRecommended = $false
        },
        @{
          id = "safer-route"
          name = "Recorded safer test route"
          distanceKm = 61.5
          estimatedMinutes = 130
          riskScore = 28
          hasGeometry = $true
          isApproved = $true
          isRecommended = $true
        }
      )
    }
  )
}

$routeResult =
  Invoke-AgentPost `
    -Path "/api/v1/agents/route/analyse-recorded-routes" `
    -Payload $routePayload

Assert-True `
  ($routeResult.status -eq "COMPLETED") `
  "Route agent completes successfully"

Assert-True `
  (@($routeResult.decisions).Count -eq 1) `
  "Route agent produces one supervised decision"

Assert-True `
  ($routeResult.requiresApproval -eq $true) `
  "Route change requires human approval"

Write-Host ""
Write-Host "7. Command agent"

$commandPayload = @{
  agentRunId =
    "smoke-command-$testId"

  routeAgentRunId =
    $routePayload.agentRunId

  affectedCorridorId =
    "smoke-corridor"

  corridorRiskScore = 68.5

  communitiesWithoutRecordedAlternative =
    1

  populationWithoutRecordedAlternative =
    1200

  decisions =
    @($routeResult.decisions)
}

$commandResult =
  Invoke-AgentPost `
    -Path "/api/v1/agents/command/build-action-plan" `
    -Payload $commandPayload

Assert-True `
  ($commandResult.status -eq "COMPLETED") `
  "Command agent completes successfully"

Assert-True `
  (@($commandResult.plans).Count -eq 1) `
  "Command agent prepares one action plan"

Assert-True `
  ($commandResult.requiresApproval -eq $true) `
  "Command action requires named human approval"

Assert-True `
  (
    $commandResult.plans[0].
      proposedAction.
      executionBlockedUntilApproval -eq
    $true
  ) `
  "Automatic execution remains blocked"

Assert-True `
  (
    @(
      $commandResult.toolCalls |
      Where-Object {
        $_.status -ne "SUCCEEDED"
      }
    ).Count -eq 0
  ) `
  "Command tool calls succeed"

Write-Host ""
Write-Host "========================" `
  -ForegroundColor Cyan

Write-Host `
  "ALL $passedTests TESTS PASSED" `
  -ForegroundColor Green

Write-Host `
  "Human authority remains in control." `
  -ForegroundColor Green