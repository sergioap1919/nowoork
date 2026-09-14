$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectName = Split-Path $projectRoot -Leaf
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$exportDir = Join-Path $projectRoot "export"
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null

$zipPath = Join-Path $exportDir "$projectName-$timestamp.zip"
$tempRoot = Join-Path $env:TEMP "$projectName-export-$timestamp"
$stagingProject = Join-Path $tempRoot $projectName

if (Test-Path $tempRoot) {
  Remove-Item $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingProject | Out-Null

Write-Host ""
Write-Host "Preparando ZIP limpio de $projectName..." -ForegroundColor Cyan

$excludeDirs = @(
  "node_modules",
  ".next",
  ".git",
  "export",
  "out",
  ".vercel"
)

$excludeFiles = @(
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".env.staging"
)

$roboArgs = @(
  $projectRoot,
  $stagingProject,
  "/E",
  "/R:1",
  "/W:1",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NP",
  "/XD"
) + $excludeDirs + @("/XF") + $excludeFiles + @("*.zip")

& robocopy @roboArgs | Out-Null
$roboCode = $LASTEXITCODE
if ($roboCode -ge 8) {
  throw "Robocopy fallo con codigo $roboCode"
}

Compress-Archive -Path $stagingProject -DestinationPath $zipPath -CompressionLevel Optimal -Force
Remove-Item $tempRoot -Recurse -Force

$sizeMb = [Math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "ZIP creado correctamente." -ForegroundColor Green
Write-Host "Archivo: $zipPath" -ForegroundColor Green
Write-Host "Tamano: $sizeMb MB" -ForegroundColor DarkGray
Write-Host ""
