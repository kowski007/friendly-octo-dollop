$ErrorActionPreference = "Stop"

if (-not $env:RENDER_API_KEY) {
  throw "Missing RENDER_API_KEY env var (your rnd_... token)."
}

param(
  [Parameter(Mandatory = $true)]
  [string]$ServiceId,

  [string]$EnvFile = "c:\\Users\\olusegun\\Desktop\\myTAG\\.env.local"
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

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

function Parse-DotEnv([string]$path) {
  $map = @{}
  foreach ($line in Get-Content -Path $path) {
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t.StartsWith("#")) { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $k = $t.Substring(0, $idx).Trim()
    $v = $t.Substring($idx + 1)
    if ($v.StartsWith("\"") -and $v.EndsWith("\"")) { $v = $v.Substring(1, $v.Length - 2) }
    $map[$k] = $v
  }
  return $map
}

function New-RandomSecret([int]$bytes = 32) {
  $b = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return ([Convert]::ToBase64String($b)).Replace("+","-").Replace("/","_").TrimEnd("=")
}

$envMap = Parse-DotEnv $EnvFile

if (-not $envMap.ContainsKey("NT_SESSION_SECRET")) { $envMap["NT_SESSION_SECRET"] = New-RandomSecret 48 }
if (-not $envMap.ContainsKey("NT_OTP_SECRET")) { $envMap["NT_OTP_SECRET"] = New-RandomSecret 32 }

$keys = @(
  "NODE_ENV",
  "NT_SESSION_SECRET",
  "NT_OTP_SECRET",
  "MONO_PUBLIC_KEY",
  "MONO_SECRET_KEY",
  "MONO_BASE_URL",
  "MONO_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL"
)

$envVars = @()
foreach ($k in $keys) {
  if ($envMap.ContainsKey($k) -and $envMap[$k]) {
    $envVars += @{ key = $k; value = $envMap[$k] }
  }
}

if ($envVars.Count -eq 0) {
  throw "No env vars found to sync. Check $EnvFile."
}

Invoke-RenderApi -Method PUT -Path "/services/$ServiceId/env-vars" -Body $envVars | Out-Null

Write-Output "Synced $($envVars.Count) env vars to $ServiceId"
