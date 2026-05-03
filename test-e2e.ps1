$ErrorActionPreference = "Stop"

Write-Host "Building project..."
npm run build

Write-Host "Setting environment variables..."
$env:CTFCTL_RUNTIME_ROOT = "$PWD\e2e_test_runtime"
$env:CTFCTL_BACKEND = "local-shell"

# Ensure clean state
if (Test-Path $env:CTFCTL_RUNTIME_ROOT) {
    Remove-Item -Recurse -Force $env:CTFCTL_RUNTIME_ROOT
}

Write-Host "`n--- 1. Challenge Init ---"
$chalOut = node dist/index.js challenge init --name "实测题目" --category "pwn" --description "测试各项核心功能" --flag-format "flag{...}"
Write-Host $chalOut
$chalJson = $chalOut | ConvertFrom-Json
$chalId = $chalJson.data.challenge.id

Write-Host "`n--- 2. Workspace Create ---"
$wsOut = node dist/index.js workspace create --challenge $chalId
Write-Host $wsOut
$wsJson = $wsOut | ConvertFrom-Json
$wsId = $wsJson.data.workspace.id

Write-Host "`n--- 3. Exec Run ---"
$execOut = node dist/index.js exec run --workspace $wsId --cmd "echo 'Hello CTF'" --reason "Smoke test"
Write-Host $execOut

Write-Host "`n--- 4. Evidence Note ---"
$evOut = node dist/index.js evidence note --challenge $chalId --kind "clue" --text "Found the entrypoint is main()"
Write-Host $evOut

Write-Host "`n--- 5. Verify Flag ---"
$verifyOut = node dist/index.js verify flag --challenge $chalId --value "flag{test_success}"
Write-Host $verifyOut

Write-Host "`n--- 6. Memory Branch Create ---"
$memOut = node dist/index.js memory branch create --challenge $chalId --name "feature/reverse-main"
Write-Host $memOut
$memJson = $memOut | ConvertFrom-Json
$branchId = $memJson.data.branch.id

Write-Host "`n--- 7. Memory Commit Create ---"
$commitOut = node dist/index.js memory commit create --branch $branchId --challenge $chalId --message "Analyze main function" --facts "Main calls validate_key" --hypotheses "validate_key might check the flag"
Write-Host $commitOut

Write-Host "`n实测流程执行完成！"