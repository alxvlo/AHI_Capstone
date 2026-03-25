[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Test-LocalPort {
  param([int]$Port)

  $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
  return [bool]$result.TcpTestSucceeded
}

Write-Host "Docker MCP servers"
& docker mcp server ls

Write-Host ""
Write-Host "Docker MCP clients"
& docker mcp client ls --global

Write-Host ""
Write-Host "Compose projects"
& docker compose ls
