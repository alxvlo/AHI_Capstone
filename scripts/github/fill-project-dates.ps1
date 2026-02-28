param(
  [string]$Owner = "alxvlo",
  [string]$Token = $env:GITHUB_TOKEN,
  [int]$ProjectNumber = 4,
  [int]$StartIssue = 31,
  [int]$EndIssue = 62
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  throw "Missing GITHUB_TOKEN. Set environment variable GITHUB_TOKEN with project + repo scopes."
}

$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "AHI-Capstone-DateFill"
}

function Invoke-GHGraphQL {
  param(
    [string]$Query,
    $Variables
  )

  $body = @{ query = $Query; variables = $Variables }
  $json = $body | ConvertTo-Json -Depth 50
  $result = Invoke-RestMethod -Method Post -Uri "https://api.github.com/graphql" -Headers $headers -Body $json -ContentType "application/json"

  if ($result.errors) {
    $errText = ($result.errors | ConvertTo-Json -Depth 10)
    throw "GraphQL error: $errText"
  }

  return $result
}

function Invoke-GHRest {
  param(
    [string]$Method,
    [string]$Url,
    $Body = $null
  )

  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 20
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $json -ContentType "application/json"
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

$sprintWindowByMilestone = @{
  "Sprint 01 (Mar 1 - Mar 14)" = @{ start = "2026-03-01"; end = "2026-03-14" }
  "Sprint 02 (Mar 15 - Mar 28)" = @{ start = "2026-03-15"; end = "2026-03-28" }
  "Sprint 03 (Mar 29 - Apr 11)" = @{ start = "2026-03-29"; end = "2026-04-11" }
  "Sprint 04 (Apr 12 - Apr 25)" = @{ start = "2026-04-12"; end = "2026-04-25" }
  "Sprint 05 (Apr 26 - May 16)" = @{ start = "2026-04-26"; end = "2026-05-16" }
  "Sprint 06 (May 17 - Jun 6)" = @{ start = "2026-05-17"; end = "2026-06-06" }
  "Sprint 07 (Jun 7 - Jun 20)" = @{ start = "2026-06-07"; end = "2026-06-20" }
  "Sprint 08 (Jun 21 - Jul 4)" = @{ start = "2026-06-21"; end = "2026-07-04" }
  "Sprint 09 (Jul 5 - Jul 25)" = @{ start = "2026-07-05"; end = "2026-07-25" }
  "Sprint 10 (Jul 26 - Aug 8)" = @{ start = "2026-07-26"; end = "2026-08-08" }
  "Sprint 11 (Aug 9 - Aug 29)" = @{ start = "2026-08-09"; end = "2026-08-29" }
  "Sprint 12 (Aug 30 - Sep 19)" = @{ start = "2026-08-30"; end = "2026-09-19" }
  "Sprint 13 (Sep 20 - Oct 3)" = @{ start = "2026-09-20"; end = "2026-10-03" }
}

Write-Host "Resolving project and fields..."
$projectQuery = @"
query(
  `$login: String!,
  `$projectNumber: Int!
) {
  user(login: `$login) {
    projectV2(number: `$projectNumber) {
      id
      title
      url
      fields(first: 50) {
        nodes {
          ... on ProjectV2FieldCommon {
            id
            name
            dataType
          }
        }
      }
    }
  }
}
"@

$projectResult = Invoke-GHGraphQL -Query $projectQuery -Variables @{ login = $Owner; projectNumber = $ProjectNumber }
$project = $projectResult.data.user.projectV2
if (-not $project.id) {
  throw "Project #$ProjectNumber not found for user '$Owner'."
}

$dateFields = @($project.fields.nodes | Where-Object { $_.dataType -eq "DATE" })

$createDateFieldMutation = @"
mutation(
  `$projectId: ID!,
  `$name: String!
) {
  createProjectV2Field(
    input: {
      projectId: `$projectId,
      dataType: DATE,
      name: `$name
    }
  ) {
    projectV2Field {
      ... on ProjectV2FieldCommon {
        id
        name
        dataType
      }
    }
  }
}
"@

$startField = $dateFields | Where-Object { $_.name -match "(?i)start" } | Select-Object -First 1
$targetField = $dateFields | Where-Object { $_.name -match "(?i)target|due|end" } | Select-Object -First 1

if (-not $startField) {
  $createdStart = Invoke-GHGraphQL -Query $createDateFieldMutation -Variables @{ projectId = $project.id; name = "Start Date" }
  $startField = $createdStart.data.createProjectV2Field.projectV2Field
  Write-Host "Created date field: $($startField.name)"
}

if (-not $targetField) {
  $createdTarget = Invoke-GHGraphQL -Query $createDateFieldMutation -Variables @{ projectId = $project.id; name = "Target Date" }
  $targetField = $createdTarget.data.createProjectV2Field.projectV2Field
  Write-Host "Created date field: $($targetField.name)"
}

$singleDateField = if ($targetField) { $targetField } else { $startField }

Write-Host "Project: $($project.title)"
Write-Host "Date fields detected: $($dateFields.Count)"
if ($startField) { Write-Host "  Start field: $($startField.name)" }
if ($targetField) { Write-Host "  Target field: $($targetField.name)" }
if (-not $startField -and -not $targetField) { Write-Host "  Single date field mode: $($singleDateField.name)" }

Write-Host "Fetching project items..."
$itemsQuery = @"
query(
  `$projectId: ID!
) {
  node(id: `$projectId) {
    ... on ProjectV2 {
      items(first: 100) {
        nodes {
          id
          content {
            ... on Issue {
              id
              number
              title
            }
          }
        }
      }
    }
  }
}
"@

$itemsResult = Invoke-GHGraphQL -Query $itemsQuery -Variables @{ projectId = $project.id }
$projectItems = @($itemsResult.data.node.items.nodes | Where-Object { $_.content.number })

$updateMutation = @"
mutation(
  `$projectId: ID!,
  `$itemId: ID!,
  `$fieldId: ID!,
  `$date: Date!
) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: `$projectId,
      itemId: `$itemId,
      fieldId: `$fieldId,
      value: { date: `$date }
    }
  ) {
    projectV2Item {
      id
    }
  }
}
"@

$updated = 0
$skipped = 0

foreach ($item in $projectItems) {
  $issueNumber = [int]$item.content.number
  if ($issueNumber -lt $StartIssue -or $issueNumber -gt $EndIssue) {
    continue
  }

  $issue = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/AHI_Capstone/issues/$issueNumber"
  if (-not $issue.milestone -or -not $issue.milestone.title) {
    Write-Warning "Issue #$issueNumber has no milestone. Skipping."
    $skipped += 1
    continue
  }

  $milestoneTitle = [string]$issue.milestone.title
  if (-not $sprintWindowByMilestone.ContainsKey($milestoneTitle)) {
    Write-Warning "Issue #$issueNumber has unmapped milestone '$milestoneTitle'. Skipping."
    $skipped += 1
    continue
  }

  $window = $sprintWindowByMilestone[$milestoneTitle]

  if ($startField -and $targetField) {
    Invoke-GHGraphQL -Query $updateMutation -Variables @{
      projectId = $project.id
      itemId = $item.id
      fieldId = $startField.id
      date = $window.start
    } | Out-Null

    Invoke-GHGraphQL -Query $updateMutation -Variables @{
      projectId = $project.id
      itemId = $item.id
      fieldId = $targetField.id
      date = $window.end
    } | Out-Null

    Write-Host "  #$issueNumber -> $($startField.name): $($window.start), $($targetField.name): $($window.end)"
    $updated += 1
    continue
  }

  $dateToSet = if ($targetField) { $window.end } else { $window.end }
  $fieldToUse = if ($targetField) { $targetField } else { $singleDateField }

  Invoke-GHGraphQL -Query $updateMutation -Variables @{
    projectId = $project.id
    itemId = $item.id
    fieldId = $fieldToUse.id
    date = $dateToSet
  } | Out-Null

  Write-Host "  #$issueNumber -> $($fieldToUse.name): $dateToSet"
  $updated += 1
}

Write-Host "Done. Updated: $updated, Skipped: $skipped"
Write-Host "Project URL: $($project.url)"
