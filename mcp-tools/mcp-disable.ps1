[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Servers = @("all"),
  [switch]$StopSupport
)

$ErrorActionPreference = "Stop"

$knownServers = @("context7", "firecrawl", "n8n", "obsidian", "playwright", "stripe")
$userHome = Split-Path -Parent $PSScriptRoot
$firecrawlDir = Join-Path $userHome "firecrawl"
$n8nDir = Join-Path $userHome "n8n-local"

function Resolve-ServerList {
  param([string[]]$InputServers)

  if (-not $InputServers -or $InputServers.Count -eq 0 -or $InputServers -contains "all") {
    return $knownServers
  }

  $invalid = @($InputServers | Where-Object { $_ -notin $knownServers })
  if ($invalid.Count -gt 0) {
    throw "Unknown server(s): $($invalid -join ', '). Known servers: $($knownServers -join ', ')"
  }

  return @($InputServers | Select-Object -Unique)
}

function Invoke-ComposeStop {
  param(
    [string]$Directory,
    [string]$Label
  )

  if (-not (Test-Path $Directory)) {
    Write-Host "$Label directory not found: $Directory"
    return
  }

  Push-Location $Directory
  try {
    & docker compose stop
  }
  finally {
    Pop-Location
  }
}

function Stop-SupportForServer {
  param([string]$Server)

  switch ($Server) {
    "firecrawl" {
      Invoke-ComposeStop -Directory $firecrawlDir -Label "Firecrawl"
    }
    "n8n" {
      Invoke-ComposeStop -Directory $n8nDir -Label "n8n"
    }
    "obsidian" {
      Write-Host "Obsidian support is manual. Close the Obsidian app if you want its Local REST API offline."
    }
  }
}

$resolvedServers = Resolve-ServerList -InputServers $Servers

Write-Host "Disabling MCP servers: $($resolvedServers -join ', ')"
& docker mcp server disable @resolvedServers

if ($StopSupport) {
  foreach ($server in $resolvedServers) {
    Stop-SupportForServer -Server $server
  }
}

Write-Host ""
Write-Host "Enabled server status:"
& docker mcp server ls
