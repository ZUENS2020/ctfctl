$ErrorActionPreference = "Stop"

Write-Host "Building project..."
npm run build

Write-Host "Setting environment variables for Docker test..."
$env:CTFCTL_RUNTIME_ROOT = "$PWD\e2e_docker_runtime"
$env:CTFCTL_BACKEND = "docker"
$env:CTFCTL_DOCKER_IMAGE = "alpine:3.20"

# Ensure clean state
if (Test-Path $env:CTFCTL_RUNTIME_ROOT) {
    Remove-Item -Recurse -Force $env:CTFCTL_RUNTIME_ROOT
}

Write-Host "`n--- 1. Ensure Docker Image ---"
$imageOut = node dist/index.js image ensure --image "alpine:3.20"
Write-Host $imageOut

Write-Host "`n--- 2. Challenge Init ---"
$chalOut = node dist/index.js challenge init --name "Docker 实测题目" --category "pwn" --description "测试 Docker 隔离环境" --flag-format "flag{...}"
Write-Host $chalOut
$chalJson = $chalOut | ConvertFrom-Json
$chalId = $chalJson.data.challenge.id

Write-Host "`n--- 3. Workspace Create ---"
$wsOut = node dist/index.js workspace create --challenge $chalId
Write-Host $wsOut
$wsJson = $wsOut | ConvertFrom-Json
$wsId = $wsJson.data.workspace.id

Write-Host "`n--- 4. Exec Run (in Docker) ---"
$execOut = node dist/index.js exec run --workspace $wsId --cmd "cat /etc/os-release" --reason "Docker smoke test"
Write-Host $execOut

Write-Host "`nDocker 实测流程执行完成！"