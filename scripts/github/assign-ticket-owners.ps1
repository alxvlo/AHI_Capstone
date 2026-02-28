param(
  [string]$Owner = "alxvlo",
  [string]$Repo = "AHI_Capstone",
  [string]$Token = $env:GITHUB_TOKEN,
  [int]$StartIssue = 31,
  [int]$EndIssue = 62
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  throw "Missing GITHUB_TOKEN. Set environment variable GITHUB_TOKEN with repo scope."
}

$headers = @{
  Authorization = "Bearer $Token"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "AHI-Capstone-Assignment"
}

$members = @(
  @{ key = "clark"; user = "devdjclark"; display = "Clark" },
  @{ key = "keith"; user = "VeinZzz"; display = "Keith" },
  @{ key = "alex"; user = "alxvlo"; display = "Alexander" }
)

$keywordMap = @{
  clark = @("database","schema","supabase","websocket","real-time","realtime","backend","auth","authentication","rls","api","migration","queue","lifecycle")
  keith = @("ui","ux","frontend","tailwind","workflow","package","mapping","validation","usability","sus","patient portal","agency portal","portal")
  alex = @("deployment","ci/cd","cicd","vercel","github actions","documentation","pdf","email","smtp","security","owasp","compliance","audit","training","closeout","rollback")
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

function Get-IssueScore {
  param(
    [string]$Text,
    [string[]]$Keywords
  )

  $score = 0
  $lower = $Text.ToLowerInvariant()
  foreach ($k in $Keywords) {
    if ($lower.Contains($k.ToLowerInvariant())) {
      $score += 1
    }
  }
  return $score
}

Write-Host "Fetching issues #$StartIssue to #$EndIssue..."
$allIssues = @()
for ($n = $StartIssue; $n -le $EndIssue; $n++) {
  try {
    $issue = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/issues/$n"
    if ($issue.pull_request) { continue }
    $allIssues += $issue
  } catch {
    Write-Warning "Issue #$n not found or inaccessible. Skipping."
  }
}

if ($allIssues.Count -eq 0) {
  throw "No issues found in range #$StartIssue-#$EndIssue."
}

$assignments = @()
foreach ($issue in $allIssues) {
  $text = "$($issue.title) `n $($issue.body)"

  $scores = @{
    clark = Get-IssueScore -Text $text -Keywords $keywordMap.clark
    keith = Get-IssueScore -Text $text -Keywords $keywordMap.keith
    alex = Get-IssueScore -Text $text -Keywords $keywordMap.alex
  }

  if ($issue.title -like "[Epic]*") {
    $scores.clark += 1
    $scores.keith += 1
    $scores.alex += 1
  }

  $best = "clark"
  $bestScore = $scores.clark
  foreach ($k in @("keith","alex")) {
    if ($scores[$k] -gt $bestScore) {
      $best = $k
      $bestScore = $scores[$k]
    }
  }

  $secondBest = "clark"
  $sorted = $scores.GetEnumerator() | Sort-Object -Property Value -Descending
  if ($sorted.Count -gt 1) {
    $secondBest = $sorted[1].Key
  }

  $assignments += [PSCustomObject]@{
    Number = $issue.number
    Title = $issue.title
    Preferred = $best
    PreferredScore = $scores[$best]
    SecondBest = $secondBest
    Scores = $scores
  }
}

$counts = @{ clark = 0; keith = 0; alex = 0 }
foreach ($a in $assignments) { $counts[$a.Preferred] += 1 }

function Get-MaxKey {
  param($Table)
  return ($Table.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1).Key
}

function Get-MinKey {
  param($Table)
  return ($Table.GetEnumerator() | Sort-Object -Property Value, Name | Select-Object -First 1).Key
}

for ($i = 0; $i -lt 100; $i++) {
  $maxKey = Get-MaxKey -Table $counts
  $minKey = Get-MinKey -Table $counts
  $delta = [math]::Abs($counts[$maxKey] - $counts[$minKey])
  if ($delta -le 1) { break }

  $candidate = $assignments |
    Where-Object { $_.Preferred -eq $maxKey } |
    Sort-Object -Property @{Expression={ $_.Scores[$maxKey] - $_.Scores[$minKey] }; Ascending=$true} |
    Select-Object -First 1

  if (-not $candidate) { break }

  $candidate.Preferred = $minKey
  $counts[$maxKey] -= 1
  $counts[$minKey] += 1
}

$userByKey = @{}
foreach ($m in $members) { $userByKey[$m.key] = $m.user }

Write-Host "Applying balanced assignments..."
foreach ($a in ($assignments | Sort-Object Number)) {
  $assignee = $userByKey[$a.Preferred]
  Invoke-GHRest -Method Patch -Url "https://api.github.com/repos/$Owner/$Repo/issues/$($a.Number)" -Body @{ assignees = @($assignee) } | Out-Null
  Write-Host "  #$($a.Number) -> @$assignee"
}

Write-Host "Assignment summary:"
$summary = @{ devdjclark = 0; VeinZzz = 0; alxvlo = 0 }
foreach ($a in $assignments) {
  $summary[$userByKey[$a.Preferred]] += 1
}
$summary.GetEnumerator() | Sort-Object Name | ForEach-Object {
  Write-Host "  @$($_.Name): $($_.Value) issues"
}

Write-Host "Done."
