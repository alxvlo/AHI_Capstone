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
  $maxScore = $sorted[0].Value
  $secondScore = if ($sorted.Count -gt 1) { $sorted[1].Value } else { 0 }
  $confidence = [int]($maxScore - $secondScore)

  $milestoneTitle = if ($issue.milestone -and $issue.milestone.title) { [string]$issue.milestone.title } else { "UNSCHEDULED" }
  $windowKey = if ($sprintWindowByMilestone.ContainsKey($milestoneTitle)) {
    $w = $sprintWindowByMilestone[$milestoneTitle]
    "$($w.start) -> $($w.end)"
  } else {
    "UNSCHEDULED"
  }

  $assignments += [PSCustomObject]@{
    Number = $issue.number
    Title = $issue.title
    Milestone = $milestoneTitle
    WindowKey = $windowKey
    Preferred = $best
    PreferredScore = $scores[$best]
    SecondBest = $secondBest
    Confidence = $confidence
    Scores = $scores
  }
}

Write-Host "Calculating sprint-aware balanced assignments..."
$memberKeys = @("clark","keith","alex")
$globalCounts = @{ clark = 0; keith = 0; alex = 0 }
$totalIssueCount = $assignments.Count
$globalCap = [math]::Ceiling($totalIssueCount / 3.0)
$windowCountsByKey = @{}
$windowCapsByKey = @{}

$groupedByWindow = $assignments | Group-Object -Property WindowKey
foreach ($group in $groupedByWindow) {
  $windowIssues = @($group.Group)
  $windowCount = $windowIssues.Count
  $windowCap = [math]::Ceiling($windowCount / 3.0)
  $windowCounts = @{ clark = 0; keith = 0; alex = 0 }
  $windowCountsByKey[$group.Name] = $windowCounts
  $windowCapsByKey[$group.Name] = $windowCap

  $ordered = $windowIssues | Sort-Object -Property @(
    @{ Expression = { $_.Confidence }; Descending = $true },
    @{ Expression = { if ($_.Title -like "[Epic]*") { 1 } else { 0 } }; Descending = $false },
    @{ Expression = { $_.Number }; Descending = $false }
  )

  foreach ($issueAssignment in $ordered) {
    $candidates = @($memberKeys | Sort-Object -Property @(
      @{ Expression = { -1 * $issueAssignment.Scores[$_] } },
      @{ Expression = { $windowCounts[$_] } },
      @{ Expression = { $globalCounts[$_] } }
    ))

    $chosen = $null
    foreach ($candidate in $candidates) {
      if ($windowCounts[$candidate] -lt $windowCap -and $globalCounts[$candidate] -lt ($globalCap + 1)) {
        $chosen = $candidate
        break
      }
    }

    if (-not $chosen) {
      foreach ($candidate in $candidates) {
        if ($windowCounts[$candidate] -lt ($windowCap + 1)) {
          $chosen = $candidate
          break
        }
      }
    }

    if (-not $chosen) {
      $chosen = $candidates[0]
    }

    $issueAssignment.Preferred = $chosen
    $windowCounts[$chosen] += 1
    $globalCounts[$chosen] += 1
  }
}

function Get-MaxKey {
  param($Table)
  return ($Table.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1).Key
}

function Get-MinKey {
  param($Table)
  return ($Table.GetEnumerator() | Sort-Object -Property Value, Name | Select-Object -First 1).Key
}

for ($i = 0; $i -lt 200; $i++) {
  $maxKey = Get-MaxKey -Table $globalCounts
  $minKey = Get-MinKey -Table $globalCounts
  $delta = [math]::Abs($globalCounts[$maxKey] - $globalCounts[$minKey])
  if ($delta -le 1) { break }

  $candidate = $assignments |
    Where-Object { $_.Preferred -eq $maxKey } |
    Sort-Object -Property @{Expression={ $_.Scores[$maxKey] - $_.Scores[$minKey] }; Ascending=$true} |
    Where-Object {
      $wk = $_.WindowKey
      if (-not $windowCountsByKey.ContainsKey($wk)) { return $false }
      $wc = $windowCountsByKey[$wk]
      $cap = $windowCapsByKey[$wk]
      return ($wc[$minKey] -lt $cap)
    } |
    Select-Object -First 1

  if (-not $candidate) {
    break
  }

  $wk = $candidate.WindowKey
  $wc = $windowCountsByKey[$wk]
  $candidate.Preferred = $minKey
  $globalCounts[$maxKey] -= 1
  $globalCounts[$minKey] += 1
  $wc[$maxKey] -= 1
  $wc[$minKey] += 1
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

Write-Host "Date-range overlap audit (by sprint window):"
$auditByWindow = $assignments | Group-Object -Property WindowKey | Sort-Object Name
foreach ($wg in $auditByWindow) {
  $local = @{ clark = 0; keith = 0; alex = 0 }
  foreach ($it in $wg.Group) {
    $local[$it.Preferred] += 1
  }

  $flag = $false
  foreach ($k in $memberKeys) {
    if ($local[$k] -ge 2) {
      $flag = $true
    }
  }

  $clarkCount = $local.clark
  $keithCount = $local.keith
  $alexCount = $local.alex
  if ($flag) {
    Write-Host "  $($wg.Name): clark=$clarkCount, keith=$keithCount, alex=$alexCount (multiple assignments exist where sprint has >3 tasks)"
  } else {
    Write-Host "  $($wg.Name): clark=$clarkCount, keith=$keithCount, alex=$alexCount"
  }
}

Write-Host "Done."
