[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Servers = @("all")
)

$ErrorActionPreference = "Stop"

$knownServers = @("context7", "firecrawl", "n8n", "obsidian", "playwright", "stripe")
$userHome = Split-Path -Parent $PSScriptRoot
$firecrawlDir = Join-Path $userHome "firecrawl"
$n8nDir = Join-Path $userHome "n8n-local"
$obsidianExe = Join-Path $env:LOCALAPPDATA "Programs\Obsidian\Obsidian.exe"
$obsidianVault = "OpenCode Vault"

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

function Invoke-ComposeUp {
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
    & docker compose up -d
  }
  finally {
    Pop-Location
  }
}

function Start-SupportForServer {
  param([string]$Server)

  switch ($Server) {
    "firecrawl" {
      Invoke-ComposeUp -Directory $firecrawlDir -Label "Firecrawl"
    }
    "n8n" {
      Invoke-ComposeUp -Directory $n8nDir -Label "n8n"
    }
    "obsidian" {
      if (Test-Path $obsidianExe) {
        Start-Process $obsidianExe "obsidian://open?vault=OpenCode%20Vault" | Out-Null
        Write-Host "Started Obsidian vault '$obsidianVault'."
      } else {
        Write-Host "Obsidian executable not found at $obsidianExe"
      }
    }
  }
}

$resolvedServers = Resolve-ServerList -InputServers $Servers

Write-Host "Enabling MCP servers: $($resolvedServers -join ', ')"
& docker mcp server enable @resolvedServers

foreach ($server in $resolvedServers) {
  Start-SupportForServer -Server $server
}

Write-Host ""
Write-Host "Enabled server status:"
& docker mcp server ls
