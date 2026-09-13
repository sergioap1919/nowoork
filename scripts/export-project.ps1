$ErrorActionPreference = "Stop"

# Root del proyecto (un nivel arriba de /scripts)
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectName = Split-Path $projectRoot -Leaf
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Carpeta final de exportaciones
$exportDir = Join-Path $projectRoot "export"
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null

# Nombre del ZIP
$zipPath = Join-Path $exportDir "$projectName-$timestamp.zip"

# Carpeta temporal de staging para evitar comprimir archivos no deseados
$tempRoot = Join-Path $env:TEMP "$projectName-export-$timestamp"
$stagingProject = Join-Path $tempRoot $projectName

if (Test-Path $tempRoot) {
  Remove-Item $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stagingProject | Out-Null

Write-Host ""
Write-Host "Preparando export limpio de $projectName..." -ForegroundColor Cyan

# Copia el proyecto excluyendo carpetas pesadas/generadas y datos sensibles.
# Robocopy considera 0-7 como códigos de éxito.
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
  ".env.test.local"
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
) + $excludeDirs + @("/XF") + $excludeFiles

& robocopy @roboArgs | Out-Null
$roboCode = $LASTEXITCODE
if ($roboCode -ge 8) {
  throw "Robocopy fallo con codigo $roboCode"
}

# Comprime incluyendo la carpeta raiz del proyecto dentro del ZIP
Compress-Archive -Path $stagingProject -DestinationPath $zipPath -CompressionLevel Optimal -Force

# Limpieza temporal
Remove-Item $tempRoot -Recurse -Force

$sizeMb = [Math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "Export terminado correctamente." -ForegroundColor Green
Write-Host "ZIP: $zipPath" -ForegroundColor Green
Write-Host "Tamano: $sizeMb MB" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Excluido:" -ForegroundColor Yellow
Write-Host "  - node_modules"
Write-Host "  - .next"
Write-Host "  - .git"
Write-Host "  - export"
Write-Host "  - out"
Write-Host "  - .vercel"
Write-Host "  - archivos .env sensibles"
Write-Host ""
