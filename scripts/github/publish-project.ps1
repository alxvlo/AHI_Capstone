param(
  [string]$Owner = "alxvlo",
  [string]$Repo = "AHI_Capstone",
  [string]$SeedPath = "project-management/github-seed.json",
  [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  throw "Missing GITHUB_TOKEN. Set environment variable GITHUB_TOKEN with repo + project scopes."
}

if (-not (Test-Path $SeedPath)) {
  throw "Seed file not found: $SeedPath"
}

$seed = Get-Content -Raw -Path $SeedPath | ConvertFrom-Json
$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "AHI-Capstone-Automation"
}

function Invoke-GHRest {
  param(
    [string]$Method,
    [string]$Url,
    $Body = $null
  )

  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 50
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $json -ContentType "application/json"
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Invoke-GHGraphQL {
  param(
    [string]$Query,
    $Variables
  )

  $body = @{ query = $Query; variables = $Variables }
  $json = $body | ConvertTo-Json -Depth 50
  return Invoke-RestMethod -Method Post -Uri "https://api.github.com/graphql" -Headers $headers -Body $json -ContentType "application/json"
}

Write-Host "Ensuring labels..."
$existingLabels = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/labels?per_page=100"
$existingLabelMap = @{}
foreach ($l in $existingLabels) { $existingLabelMap[$l.name] = $true }

foreach ($label in $seed.labels) {
  if ($existingLabelMap.ContainsKey($label.name)) {
    Write-Host "  Label exists: $($label.name)"
    continue
  }
  Invoke-GHRest -Method Post -Url "https://api.github.com/repos/$Owner/$Repo/labels" -Body @{
    name = $label.name
    color = $label.color
    description = $label.description
  } | Out-Null
  Write-Host "  Created label: $($label.name)"
}

Write-Host "Ensuring milestones..."
$existingMilestones = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/milestones?state=all&per_page=100"
$milestoneNumberByTitle = @{}
foreach ($m in $existingMilestones) { $milestoneNumberByTitle[$m.title] = $m.number }

foreach ($ms in $seed.milestones) {
  if ($milestoneNumberByTitle.ContainsKey($ms.title)) {
    Write-Host "  Milestone exists: $($ms.title)"
    continue
  }

  $created = Invoke-GHRest -Method Post -Url "https://api.github.com/repos/$Owner/$Repo/milestones" -Body @{
    title = $ms.title
    description = $ms.description
    due_on = $ms.dueOn
    state = "open"
  }
  $milestoneNumberByTitle[$created.title] = $created.number
  Write-Host "  Created milestone: $($ms.title)"
}

Write-Host "Ensuring issues..."
$existingIssues = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/issues?state=all&per_page=100"
$issueByTitle = @{}
foreach ($i in $existingIssues) {
  if (-not $i.pull_request) {
    $issueByTitle[$i.title] = $i
  }
}

$createdOrExistingIssues = @()
foreach ($item in $seed.issues) {
  if ($issueByTitle.ContainsKey($item.title)) {
    Write-Host "  Issue exists: $($item.title)"
    $createdOrExistingIssues += $issueByTitle[$item.title]
    continue
  }

  if (-not $milestoneNumberByTitle.ContainsKey($item.milestone)) {
    throw "Milestone not found for issue '$($item.title)': $($item.milestone)"
  }

  $issuePayload = @{
    title = $item.title
    body = $item.body
    labels = @($item.labels)
    milestone = $milestoneNumberByTitle[$item.milestone]
  }

  $createdIssue = Invoke-GHRest -Method Post -Url "https://api.github.com/repos/$Owner/$Repo/issues" -Body $issuePayload
  $createdOrExistingIssues += $createdIssue
  Write-Host "  Created issue: #$($createdIssue.number) $($item.title)"
}

Write-Host "Creating or finding GitHub Project V2..."
$projectTitle = $seed.project.title

$ownerQuery = "query(
  `$login: String!
){
  user(login: `$login) { id }
}"
$ownerResult = Invoke-GHGraphQL -Query $ownerQuery -Variables @{ login = $Owner }
if (-not $ownerResult.data.user.id) {
  throw "Could not resolve owner ID for user '$Owner'."
}
$ownerId = $ownerResult.data.user.id

$projectsQuery = "query(
  `$login: String!
){
  user(login: `$login) {
    projectsV2(first: 50) {
      nodes { id title url }
    }
  }
}"
$projectsResult = Invoke-GHGraphQL -Query $projectsQuery -Variables @{ login = $Owner }
$project = $projectsResult.data.user.projectsV2.nodes | Where-Object { $_.title -eq $projectTitle } | Select-Object -First 1

if (-not $project) {
  $createProjectMutation = "mutation(
    `$ownerId: ID!,
    `$title: String!
  ){
    createProjectV2(input: { ownerId: `$ownerId, title: `$title }) {
      projectV2 { id title url }
    }
  }"
  $createResult = Invoke-GHGraphQL -Query $createProjectMutation -Variables @{ ownerId = $ownerId; title = $projectTitle }
  if ($createResult.errors) {
    Write-Warning "Project creation failed (likely missing project scope). Labels, milestones, and issues were still created."
    Write-Host "Done."
    exit 0
  }
  $project = $createResult.data.createProjectV2.projectV2
  Write-Host "  Created project: $($project.url)"
} else {
  Write-Host "  Project exists: $($project.url)"
}

Write-Host "Adding issues to project..."
$projectItemsQuery = "query(
  `$projectId: ID!
){
  node(id: `$projectId) {
    ... on ProjectV2 {
      items(first: 200) {
        nodes {
          content {
            ... on Issue { id number }
          }
        }
      }
    }
  }
}"
$itemsResult = Invoke-GHGraphQL -Query $projectItemsQuery -Variables @{ projectId = $project.id }
$existingProjectIssueIds = @{}
foreach ($node in $itemsResult.data.node.items.nodes) {
  if ($node.content.id) { $existingProjectIssueIds[$node.content.id] = $true }
}

$addItemMutation = "mutation(
  `$projectId: ID!,
  `$contentId: ID!
){
  addProjectV2ItemById(input: { projectId: `$projectId, contentId: `$contentId }) {
    item { id }
  }
}"

foreach ($i in $createdOrExistingIssues) {
  if (-not $i.node_id) { continue }
  if ($existingProjectIssueIds.ContainsKey($i.node_id)) {
    continue
  }

  $addResult = Invoke-GHGraphQL -Query $addItemMutation -Variables @{ projectId = $project.id; contentId = $i.node_id }
  if ($addResult.errors) {
    Write-Warning "Could not add issue #$($i.number) to project."
    continue
  }
  Write-Host "  Added issue #$($i.number)"
}

Write-Host "Done."
Write-Host "Project URL: $($project.url)"
