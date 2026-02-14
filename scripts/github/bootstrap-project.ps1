[CmdletBinding()]
param(
  [string]$Owner,
  [string]$Repo,
  [string]$ProjectTitle = "AHI Capstone MVP Roadmap",
  [string]$Token = $env:GITHUB_TOKEN,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoFromGitRemote {
  $origin = (git remote get-url origin 2>$null)
  if (-not $origin) {
    throw "Could not resolve git remote origin. Provide -Owner and -Repo explicitly."
  }

  if ($origin -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
    return @{
      Owner = $Matches.owner
      Repo  = $Matches.repo
    }
  }

  throw "Remote origin is not a GitHub URL: $origin"
}

function Get-TicketsConfigPath {
  return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\docs\project-management\tickets.json"))
}

function New-AuthHeaders {
  param([string]$BearerToken)

  return @{
    "Authorization"        = "Bearer $BearerToken"
    "Accept"               = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "AHI-Capstone-Bootstrap"
  }
}

function Invoke-GitHubRest {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body,
    [hashtable]$Headers
  )

  $uri = if ($Path -match "^https?://") { $Path } else { "https://api.github.com$Path" }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers
  }

  $json = $Body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers -Body $json -ContentType "application/json"
}

function Invoke-GitHubGraphQL {
  param(
    [string]$Query,
    [object]$Variables,
    [hashtable]$Headers
  )

  $payload = @{
    query     = $Query
    variables = $Variables
  }

  $result = Invoke-GitHubRest -Method "POST" -Path "/graphql" -Body $payload -Headers $Headers

  if ($result.PSObject.Properties["errors"] -and $result.errors) {
    $messages = ($result.errors | ForEach-Object { $_.message }) -join "; "
    throw "GraphQL error: $messages"
  }

  return $result.data
}

function New-IssueBody {
  param(
    [pscustomobject]$Ticket
  )

  $dependsText = if ($Ticket.depends_on.Count -gt 0) { $Ticket.depends_on -join ", " } else { "None" }

  return @"
## Summary
$($Ticket.description)

## Planning Metadata
- Ticket ID: $($Ticket.id)
- Epic: $($Ticket.epic)
- Sprint: $($Ticket.sprint)
- Priority: $($Ticket.priority)
- Estimate: $($Ticket.estimate)

## Dependencies
$dependsText

## Acceptance Criteria
- [ ] Functional scenario and user role are explicit
- [ ] Edge case and failure path are defined
- [ ] Security and audit impact are addressed
- [ ] Test evidence is attached
- [ ] Documentation is updated
"@
}

function Resolve-MilestoneMap {
  param(
    [string]$Owner,
    [string]$Repo,
    [array]$Milestones,
    [hashtable]$Headers,
    [bool]$IsDryRun
  )

  $existing = @()
  if (-not $IsDryRun) {
    $existing = Invoke-GitHubRest -Method "GET" -Path "/repos/$Owner/$Repo/milestones?state=all&per_page=100" -Headers $Headers
  }

  $map = @{}
  foreach ($m in $Milestones) {
    $found = $existing | Where-Object { $_.title -eq $m.title } | Select-Object -First 1
    if ($found) {
      $map[$m.title] = [int]$found.number
      continue
    }

    if ($IsDryRun) {
      Write-Host "[DryRun] Would create milestone: $($m.title)"
      continue
    }

    $created = Invoke-GitHubRest -Method "POST" -Path "/repos/$Owner/$Repo/milestones" -Headers $Headers -Body @{
      title       = $m.title
      description = $m.description
      state       = $m.state
    }
    $map[$m.title] = [int]$created.number
    Write-Host "Created milestone: $($m.title) (#$($created.number))"
  }

  return $map
}

function Upsert-Labels {
  param(
    [string]$Owner,
    [string]$Repo,
    [array]$Labels,
    [hashtable]$Headers,
    [bool]$IsDryRun
  )

  $existing = @()
  if (-not $IsDryRun) {
    $existing = Invoke-GitHubRest -Method "GET" -Path "/repos/$Owner/$Repo/labels?per_page=100" -Headers $Headers
  }

  foreach ($label in $Labels) {
    $found = $existing | Where-Object { $_.name -eq $label.name } | Select-Object -First 1

    if ($IsDryRun) {
      $action = if ($found) { "update" } else { "create" }
      Write-Host "[DryRun] Would $action label: $($label.name)"
      continue
    }

    if ($found) {
      $escaped = [System.Uri]::EscapeDataString($label.name)
      Invoke-GitHubRest -Method "PATCH" -Path "/repos/$Owner/$Repo/labels/$escaped" -Headers $Headers -Body @{
        new_name    = $label.name
        color       = $label.color
        description = $label.description
      } | Out-Null
      Write-Host "Updated label: $($label.name)"
    }
    else {
      Invoke-GitHubRest -Method "POST" -Path "/repos/$Owner/$Repo/labels" -Headers $Headers -Body @{
        name        = $label.name
        color       = $label.color
        description = $label.description
      } | Out-Null
      Write-Host "Created label: $($label.name)"
    }
  }
}

function Resolve-Project {
  param(
    [string]$Owner,
    [string]$ProjectTitle,
    [hashtable]$Headers,
    [bool]$IsDryRun
  )

  $ownerQuery = @"
query(`$login:String!) {
  user(login:`$login) {
    id
    projectsV2(first:50) { nodes { id title url } }
  }
}
"@

  if ($IsDryRun) {
    Write-Host "[DryRun] Would resolve/create GitHub Project: $ProjectTitle"
    return @{ id = "DRY_RUN_PROJECT"; url = "DRY_RUN_URL" }
  }

  $data = Invoke-GitHubGraphQL -Query $ownerQuery -Variables @{ login = $Owner } -Headers $Headers

  $ownerBlock = $data.user
  if (-not $ownerBlock) {
    throw "Unable to resolve owner '$Owner' as a user."
  }

  $existing = $ownerBlock.projectsV2.nodes | Where-Object { $_.title -eq $ProjectTitle } | Select-Object -First 1
  if ($existing) {
    Write-Host "Using existing project: $($existing.url)"
    return @{ id = $existing.id; url = $existing.url }
  }

  $createMutation = @"
mutation(`$ownerId:ID!, `$title:String!) {
  createProjectV2(input:{ownerId:`$ownerId, title:`$title}) {
    projectV2 { id url title }
  }
}
"@

  $created = Invoke-GitHubGraphQL -Query $createMutation -Variables @{ ownerId = $ownerBlock.id; title = $ProjectTitle } -Headers $Headers
  $project = $created.createProjectV2.projectV2
  Write-Host "Created project: $($project.url)"
  return @{ id = $project.id; url = $project.url }
}
function Get-AllIssues {
  param(
    [string]$Owner,
    [string]$Repo,
    [hashtable]$Headers,
    [bool]$IsDryRun
  )

  if ($IsDryRun) {
    return @()
  }

  $all = @()
  $page = 1

  while ($true) {
    $batch = Invoke-GitHubRest -Method "GET" -Path "/repos/$Owner/$Repo/issues?state=all&per_page=100&page=$page" -Headers $Headers
    if (-not $batch -or $batch.Count -eq 0) {
      break
    }

    foreach ($item in $batch) {
      if (-not $item.pull_request) {
        $all += $item
      }
    }

    if ($batch.Count -lt 100) {
      break
    }

    $page++
  }

  return $all
}

function Add-IssueToProject {
  param(
    [string]$ProjectId,
    [string]$IssueNodeId,
    [hashtable]$Headers,
    [bool]$IsDryRun
  )

  if ($IsDryRun) {
    Write-Host "[DryRun] Would add issue node to project: $IssueNodeId"
    return
  }

  $mutation = @'
mutation($projectId:ID!, $contentId:ID!) {
  addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
    item { id }
  }
}
'@

  try {
    Invoke-GitHubGraphQL -Query $mutation -Variables @{ projectId = $ProjectId; contentId = $IssueNodeId } -Headers $Headers | Out-Null
    Write-Host "Added issue to project"
  }
  catch {
    if ($_.Exception.Message -match "already exists") {
      Write-Host "Issue already in project"
    }
    else {
      throw
    }
  }
}

$configPath = Get-TicketsConfigPath
if (-not (Test-Path $configPath)) {
  throw "tickets.json not found at $configPath"
}

$config = Get-Content -Raw -Path $configPath | ConvertFrom-Json

if (-not $Owner -or -not $Repo) {
  $repoInfo = Get-RepoFromGitRemote
  if (-not $Owner) { $Owner = $repoInfo.Owner }
  if (-not $Repo) { $Repo = $repoInfo.Repo }
}

Write-Host "Target repo: $Owner/$Repo"
Write-Host "Ticket count: $($config.tickets.Count)"

if ($DryRun -and -not $Token) {
  Write-Host "Dry run without token. Local validation complete."
  exit 0
}

if (-not $Token) {
  throw "GITHUB_TOKEN is not set. Export it first: `$env:GITHUB_TOKEN='<token>'"
}

$headers = New-AuthHeaders -BearerToken $Token

$repoCheck = Invoke-GitHubRest -Method "GET" -Path "/repos/$Owner/$Repo" -Headers $headers
Write-Host "Repository verified: $($repoCheck.full_name)"

Upsert-Labels -Owner $Owner -Repo $Repo -Labels $config.labels -Headers $headers -IsDryRun:$DryRun
$milestoneMap = Resolve-MilestoneMap -Owner $Owner -Repo $Repo -Milestones $config.milestones -Headers $headers -IsDryRun:$DryRun
$project = Resolve-Project -Owner $Owner -ProjectTitle $ProjectTitle -Headers $headers -IsDryRun:$DryRun

$existingIssues = Get-AllIssues -Owner $Owner -Repo $Repo -Headers $headers -IsDryRun:$DryRun
$issueByTitle = @{}
foreach ($issue in $existingIssues) {
  $issueByTitle[$issue.title] = $issue
}

$created = 0
$reused = 0

foreach ($ticket in $config.tickets) {
  $title = "[$($ticket.id)] $($ticket.title)"
  $dependsText = if ($ticket.depends_on.Count -gt 0) { $ticket.depends_on -join ", " } else { "None" }
  $body = New-IssueBody -Ticket $ticket

  if ($issueByTitle.ContainsKey($title)) {
    $issue = $issueByTitle[$title]
    Write-Host "Reused issue: #$($issue.number) $title"
    $reused++
  }
  else {
    if ($DryRun) {
      Write-Host "[DryRun] Would create issue: $title"
      $issue = [pscustomobject]@{ number = 0; node_id = "DRY_RUN_NODE"; title = $title }
    }
    else {
      $milestoneNumber = $null
      if ($milestoneMap.ContainsKey($ticket.milestone)) {
        $milestoneNumber = $milestoneMap[$ticket.milestone]
      }

      $payload = @{
        title  = $title
        body   = $body
        labels = @($ticket.labels)
      }

      if ($milestoneNumber) {
        $payload.milestone = $milestoneNumber
      }

      $issue = Invoke-GitHubRest -Method "POST" -Path "/repos/$Owner/$Repo/issues" -Headers $headers -Body $payload
      Write-Host "Created issue: #$($issue.number) $title"
      $created++
    }
  }

  if ($issue.node_id) {
    Add-IssueToProject -ProjectId $project.id -IssueNodeId $issue.node_id -Headers $headers -IsDryRun:$DryRun
  }
}

Write-Host "Done. Created: $created | Reused: $reused | Project: $($project.url)"


