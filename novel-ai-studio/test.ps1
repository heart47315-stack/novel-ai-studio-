Write-Host "====================================" -ForegroundColor Cyan
Write-Host " NOVEL AI STUDIO - TEST" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$checks = @(
    @{ Name = "package.json"; Path = ".\package.json" },
    @{ Name = "src folder"; Path = ".\src" },
    @{ Name = "Supabase client"; Path = ".\src\lib\supabase.ts" },
    @{ Name = "App.tsx"; Path = ".\src\App.tsx" },
    @{ Name = ".env.local"; Path = ".\.env.local" },
    @{ Name = "node_modules"; Path = ".\node_modules" }
)

$passed = 0
$failed = 0

foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "[PASS] $($check.Name)" -ForegroundColor Green
        $passed++
    }
    else {
        Write-Host "[FAIL] $($check.Name)" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nChecking Node.js..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    node --version
    $passed++
    Write-Host "[PASS] Node.js installed" -ForegroundColor Green
}
else {
    $failed++
    Write-Host "[FAIL] Node.js not found" -ForegroundColor Red
}

Write-Host "`nChecking npm..."

if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm --version
    $passed++
    Write-Host "[PASS] npm installed" -ForegroundColor Green
}
else {
    $failed++
    Write-Host "[FAIL] npm not found" -ForegroundColor Red
}

Write-Host "`nChecking build script..."

if (Test-Path ".\package.json") {
    try {
        $package = Get-Content ".\package.json" -Raw | ConvertFrom-Json

        if ($package.scripts.build) {
            Write-Host "[PASS] Build script exists" -ForegroundColor Green
            Write-Host "Running production build..." -ForegroundColor Cyan

            npm run build

            if ($LASTEXITCODE -eq 0) {
                Write-Host "[PASS] Build successful" -ForegroundColor Green
                $passed++
            }
            else {
                Write-Host "[FAIL] Build failed" -ForegroundColor Red
                $failed++
            }
        }
        else {
            Write-Host "[FAIL] Build script not found" -ForegroundColor Red
            $failed++
        }
    }
    catch {
        Write-Host "[FAIL] Cannot read package.json" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host " TEST SUMMARY" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PASS: $passed" -ForegroundColor Green
Write-Host "FAIL: $failed" -ForegroundColor Red

@(
    "Novel AI Studio Test Report"
    "Date: $(Get-Date)"
    "PASS: $passed"
    "FAIL: $failed"
) | Out-File ".\test-report.txt" -Encoding utf8

Write-Host "`nReport saved to test-report.txt" -ForegroundColor Cyan