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

$obsidianRunning = [bool](Get-Process Obsidian -ErrorAction SilentlyContinue)
$obsidianApi = Test-LocalPort -Port 27124
$n8nPort = Test-LocalPort -Port 5678

Write-Host ""
Write-Host "Support services"
Write-Host "Obsidian app running : $obsidianRunning"
Write-Host "Obsidian API on 27124: $obsidianApi"
Write-Host "n8n on 5678         : $n8nPort"

Write-Host ""
Write-Host "Compose projects"
& docker compose ls
