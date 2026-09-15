<#!
.SYNOPSIS
Deploys the API to one or more Cloud Run regions. It creates no projects,
secrets or database resources: those are deliberately explicit prerequisites.
#>
param(
  [Parameter(Mandatory = $true)] [string] $ProjectId,
  [Parameter(Mandatory = $true)] [string[]] $Regions,
  [string] $ServiceName = "giamm-system-api",
  [string] $Image = "",
  [string] $ServiceAccount = "",
  [string] $DatabaseUrlSecret = "database-url:latest",
  [string] $JwtSecret = "jwt-secret:latest",
  [string] $AiProvider = "vertex",
  [string] $AiModel = "gemini-2.5-flash",
  [string] $VertexLocation = "us-central1"
)

$ErrorActionPreference = "Stop"
if (-not $Image) { $Image = "gcr.io/$ProjectId/$ServiceName" }
gcloud config set project $ProjectId | Out-Host
gcloud builds submit --tag $Image .

foreach ($Region in $Regions) {
  $args = @("run", "deploy", $ServiceName, "--image", $Image, "--region", $Region,
    "--platform", "managed", "--port", "8080", "--min-instances", "0",
    "--set-env-vars", "AI_PROVIDER=$AiProvider,AI_MODEL=$AiModel,GOOGLE_CLOUD_PROJECT=$ProjectId,VERTEX_AI_LOCATION=$VertexLocation,RATE_LIMIT_STORE=postgres",
    "--set-secrets", "DATABASE_URL=$DatabaseUrlSecret,JWT_SECRET=$JwtSecret")
  if ($ServiceAccount) { $args += "--service-account"; $args += $ServiceAccount }
  & gcloud @args
}

Write-Host "Deployed. Configure the global load balancer only after each regional /readyz endpoint is healthy."
