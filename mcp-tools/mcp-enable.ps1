[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Servers = @("all")
)

$ErrorActionPreference = "Stop"

$knownServers = @("context7", "firecrawl", "playwright", "stripe", "atlassian")
$userHome = Split-Path -Parent $PSScriptRoot
$firecrawlDir = Join-Path $userHome "firecrawl"

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
