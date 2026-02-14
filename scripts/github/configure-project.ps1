[CmdletBinding()]
param(
  [string]$Owner = "alxvlo",
  [string]$Repo = "AHI_Capstone",
  [int]$ProjectNumber = 2,
  [string]$Token = $env:GITHUB_TOKEN
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Token) {
  throw "GITHUB_TOKEN is not set. Export it first: `$env:GITHUB_TOKEN='<token>'"
}

$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-GQL {
  param([string]$Query, [hashtable]$Variables)

  $body = @{ query = $Query; variables = $Variables } | ConvertTo-Json -Depth 30
  $result = Invoke-RestMethod -Method Post -Uri "https://api.github.com/graphql" -Headers $headers -Body $body -ContentType "application/json"

  if ($result.PSObject.Properties["errors"] -and $result.errors) {
    $messages = ($result.errors | ForEach-Object { $_.message }) -join "; "
    throw "GraphQL error: $messages"
  }

  return $result.data
}

function Get-ProjectData {
  $query = @"
query(`$owner:String!, `$number:Int!) {
  user(login:`$owner) {
    projectV2(number:`$number) {
      id
      title
      url
      fields(first:100) {
        nodes {
          __typename
          ... on ProjectV2FieldCommon { id name }
          ... on ProjectV2SingleSelectField { id name options { id name } }
        }
      }
      items(first:100) {
        nodes {
          id
          content {
            __typename
            ... on Issue { id number title repository { id nameWithOwner } }
          }
        }
      }
    }
  }
  repository(owner:`$owner, name:"$Repo") { id nameWithOwner }
}
"@

  return Invoke-GQL -Query $query -Variables @{ owner = $Owner; number = $ProjectNumber }
}

function Ensure-TextField {
  param([string]$ProjectId, [array]$Fields, [string]$Name)

  $existing = $Fields | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if ($existing) { return $existing }

  $mutation = @"
mutation(`$projectId:ID!, `$name:String!) {
  createProjectV2Field(input:{projectId:`$projectId, name:`$name, dataType:TEXT}) {
    projectV2Field { ... on ProjectV2Field { id name } }
  }
}
"@

  $data = Invoke-GQL -Query $mutation -Variables @{ projectId = $ProjectId; name = $Name }
  return $data.createProjectV2Field.projectV2Field
}

function Ensure-NumberField {
  param([string]$ProjectId, [array]$Fields, [string]$Name)

  $existing = $Fields | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if ($existing) { return $existing }

  $mutation = @"
mutation(`$projectId:ID!, `$name:String!) {
  createProjectV2Field(input:{projectId:`$projectId, name:`$name, dataType:NUMBER}) {
    projectV2Field { ... on ProjectV2Field { id name } }
  }
}
"@

  $data = Invoke-GQL -Query $mutation -Variables @{ projectId = $ProjectId; name = $Name }
  return $data.createProjectV2Field.projectV2Field
}

function Ensure-SingleSelectField {
  param([string]$ProjectId, [array]$Fields, [string]$Name, [array]$Options)

  $existing = $Fields | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if ($existing) { return $existing }

  $mutation = @"
mutation(`$projectId:ID!, `$name:String!, `$options:[ProjectV2SingleSelectFieldOptionInput!]!) {
  createProjectV2Field(input:{projectId:`$projectId, name:`$name, dataType:SINGLE_SELECT, singleSelectOptions:`$options}) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        id
        name
        options { id name }
      }
    }
  }
}
"@

  $data = Invoke-GQL -Query $mutation -Variables @{ projectId = $ProjectId; name = $Name; options = $Options }
  return $data.createProjectV2Field.projectV2Field
}

function Set-FieldValue {
  param([string]$ProjectId, [string]$ItemId, [string]$FieldId, [hashtable]$Value)

  $mutation = @"
mutation(`$projectId:ID!, `$itemId:ID!, `$fieldId:ID!, `$value:ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input:{projectId:`$projectId, itemId:`$itemId, fieldId:`$fieldId, value:`$value}) {
    projectV2Item { id }
  }
}
"@

  Invoke-GQL -Query $mutation -Variables @{
    projectId = $ProjectId
    itemId = $ItemId
    fieldId = $FieldId
    value = $Value
  } | Out-Null
}

function Link-RepositoryToProject {
  param([string]$ProjectId, [string]$RepositoryId)

  $mutation = @"
mutation(`$projectId:ID!, `$repositoryId:ID!) {
  linkProjectV2ToRepository(input:{projectId:`$projectId, repositoryId:`$repositoryId}) {
    repository { id nameWithOwner }
  }
}
"@

  try {
    Invoke-GQL -Query $mutation -Variables @{ projectId = $ProjectId; repositoryId = $RepositoryId } | Out-Null
    Write-Host "Linked repository to project."
  }
  catch {
    if ($_.Exception.Message -match "already") {
      Write-Host "Repository already linked to project."
    } else {
      throw
    }
  }
}

$configPath = Join-Path $PSScriptRoot "..\..\docs\project-management\tickets.json"
$configPath = [System.IO.Path]::GetFullPath($configPath)
$ticketsConfig = Get-Content -Raw -Path $configPath | ConvertFrom-Json

$data = Get-ProjectData
$project = $data.user.projectV2
if (-not $project) { throw "Project #$ProjectNumber not found under user '$Owner'." }

Write-Host "Configuring project: $($project.url)"

if ($data.repository -and $data.repository.id) {
  Link-RepositoryToProject -ProjectId $project.id -RepositoryId $data.repository.id
}

$fields = @($project.fields.nodes)

$priorityField = Ensure-SingleSelectField -ProjectId $project.id -Fields $fields -Name "Priority" -Options @(
  @{ name = "P0"; color = "RED"; description = "Critical blocker" },
  @{ name = "P1"; color = "ORANGE"; description = "MVP critical path" },
  @{ name = "P2"; color = "YELLOW"; description = "Important" },
  @{ name = "P3"; color = "GREEN"; description = "Nice to have" }
)

$sprintField = Ensure-NumberField -ProjectId $project.id -Fields $fields -Name "Sprint"
$estimateField = Ensure-NumberField -ProjectId $project.id -Fields $fields -Name "Estimate"
$epicField = Ensure-TextField -ProjectId $project.id -Fields $fields -Name "Epic"

$deliveryStatusField = Ensure-SingleSelectField -ProjectId $project.id -Fields $fields -Name "Delivery Status" -Options @(
  @{ name = "Backlog"; color = "GRAY"; description = "Not started" },
  @{ name = "Ready"; color = "BLUE"; description = "Ready for implementation" },
  @{ name = "In Progress"; color = "YELLOW"; description = "Active work" },
  @{ name = "In Review"; color = "PURPLE"; description = "Under review" },
  @{ name = "Blocked"; color = "RED"; description = "Blocked" },
  @{ name = "Done"; color = "GREEN"; description = "Completed" }
)

# Refresh project data to ensure new fields/options are available.
$data = Get-ProjectData
$project = $data.user.projectV2
$items = @($project.items.nodes)
$fields = @($project.fields.nodes)

$priorityField = $fields | Where-Object { $_.name -eq "Priority" } | Select-Object -First 1
$sprintField = $fields | Where-Object { $_.name -eq "Sprint" } | Select-Object -First 1
$estimateField = $fields | Where-Object { $_.name -eq "Estimate" } | Select-Object -First 1
$epicField = $fields | Where-Object { $_.name -eq "Epic" } | Select-Object -First 1
$deliveryStatusField = $fields | Where-Object { $_.name -eq "Delivery Status" } | Select-Object -First 1

$priorityOptionMap = @{}
foreach ($o in $priorityField.options) { $priorityOptionMap[$o.name] = $o.id }

$deliveryOptionMap = @{}
foreach ($o in $deliveryStatusField.options) { $deliveryOptionMap[$o.name] = $o.id }

$itemByTitle = @{}
foreach ($it in $items) {
  if ($it.content -and $it.content.__typename -eq "Issue") {
    $itemByTitle[$it.content.title] = $it
  }
}

$updated = 0
$missing = 0
foreach ($t in $ticketsConfig.tickets) {
  $issueTitle = "[{0}] {1}" -f $t.id, $t.title
  if (-not $itemByTitle.ContainsKey($issueTitle)) {
    Write-Warning "Issue not found in project items: $issueTitle"
    $missing++
    continue
  }

  $item = $itemByTitle[$issueTitle]

  if ($priorityOptionMap.ContainsKey($t.priority)) {
    Set-FieldValue -ProjectId $project.id -ItemId $item.id -FieldId $priorityField.id -Value @{ singleSelectOptionId = $priorityOptionMap[$t.priority] }
  }

  Set-FieldValue -ProjectId $project.id -ItemId $item.id -FieldId $sprintField.id -Value @{ number = [double]$t.sprint }
  Set-FieldValue -ProjectId $project.id -ItemId $item.id -FieldId $estimateField.id -Value @{ number = [double]$t.estimate }
  Set-FieldValue -ProjectId $project.id -ItemId $item.id -FieldId $epicField.id -Value @{ text = [string]$t.epic }

  $delivery = if ([int]$t.sprint -eq 1) { "Ready" } else { "Backlog" }
  Set-FieldValue -ProjectId $project.id -ItemId $item.id -FieldId $deliveryStatusField.id -Value @{ singleSelectOptionId = $deliveryOptionMap[$delivery] }

  $updated++
}

Write-Host "Updated project items: $updated"
if ($missing -gt 0) { Write-Warning "Missing items: $missing" }

