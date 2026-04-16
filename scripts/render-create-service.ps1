$ErrorActionPreference = "Stop"

if (-not $env:RENDER_API_KEY) {
  throw "Missing RENDER_API_KEY env var (your rnd_... token)."
}

param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,

  [string]$ServiceName = "nairatag-web",
  [string]$Branch = "main",
  [string]$Region = "frankfurt",
  [string]$OwnerId
)

function Invoke-RenderApi {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    [object]$Body = $null
  )

  $uri = "https://api.render.com/v1$Path"
  $headers = @{
    Authorization = "Bearer $($env:RENDER_API_KEY)"
    "Content-Type" = "application/json"
  }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
}

# Render calls workspaces "owners" in the API
if (-not $OwnerId) {
  $cursor = $null
  $firstOwnerId = $null
  do {
    $path = "/owners"
    if ($cursor) { $path = "$path?cursor=$cursor" }
    $resp = Invoke-RenderApi -Method GET -Path $path
    if ($resp.owner -and -not $firstOwnerId) { $firstOwnerId = $resp.owner.id }
    $cursor = $resp.cursor
  } while ($cursor -and -not $firstOwnerId)

  if (-not $firstOwnerId) { throw "No Render workspaces returned for this API key." }
  $OwnerId = $firstOwnerId
}

$serviceBody = @{
  type = "web_service"
  name = $ServiceName
  ownerId = $OwnerId
  repo = $RepoUrl
  branch = $Branch
  autoDeploy = "yes"
  rootDir = ""
  serviceDetails = @{
    env = "node"
    region = $Region
    plan = "starter"
    buildCommand = "npm ci && npm run build"
    startCommand = "npm run start"
    healthCheckPath = "/"
  }
}

$svc = Invoke-RenderApi -Method POST -Path "/services" -Body $serviceBody
$svcId = $svc.service.id

Write-Output "Created service: $($svc.service.name)"
Write-Output "Service ID: $svcId"
Write-Output "Deploy URL (if available): $($svc.service.serviceDetails.url)"
