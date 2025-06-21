# Create all necessary directories
$directories = @(
    "frontend\src\components",
    "frontend\src\services",
    "frontend\src\hooks",
    "frontend\src\utils",
    "frontend\src\assets",
    "frontend\src\types",
    "frontend\src\pages",
    "frontend\src\layouts",
    "frontend\src\context",
    "frontend\src\config"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Host "Frontend directory structure created successfully!" -ForegroundColor Green
