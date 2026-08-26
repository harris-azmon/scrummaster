# PowerShell script to build Scrummaster VS Code Extension
$ErrorActionPreference = "Stop"

Write-Host "Building Scrummaster VS Code Extension..."
Set-Location scrummaster-vscode
npm install
npx vsce package -o ../scrummaster.vsix
Set-Location ..
Write-Host "Build complete: scrummaster.vsix"
