<#
.SYNOPSIS
  Applies iteration relationship metadata to GitHub Issues. Adds cross-reference
  comments on Iteration Epic issues showing predecessor/successor chains,
  linked stories, and tasklist checkboxes for sub-issue tracking.

.DESCRIPTION
  Reads iteration_relationships from github-seed.json and:
    1. Discovers existing Issue numbers for each Epic and Story title.
    2. Appends a "## Iteration Relationships" section to each Epic issue body
       with predecessor/successor links, milestone gates, and date ranges.
    3. Adds tasklist checkboxes (- [ ] #<number>) referencing contained stories
       so GitHub renders them as tracked sub-issues.
    4. Adds a comment on each story issue referencing its parent iteration Epic.

.PARAMETER Owner
  GitHub repo owner. Default: alxvlo

.PARAMETER Repo
  GitHub repo name. Default: AHI_Capstone

.PARAMETER SeedPath
  Path to github-seed.json. Default: project-management/github-seed.json

.PARAMETER Token
  GitHub personal access token with repo + project scopes.

.PARAMETER DryRun
  If set, prints planned changes without modifying any issues.
#>

param(
    [string]$Owner = "alxvlo",
    [string]$Repo = "AHI_Capstone",
    [string]$SeedPath = "",
    [string]$Token = $env:GITHUB_TOKEN,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $Token -and -not $DryRun) {
    throw "Missing GITHUB_TOKEN. Set environment variable GITHUB_TOKEN with repo scope."
}

# Resolve seed file path
if (-not $SeedPath) {
    $SeedPath = Join-Path $PSScriptRoot "..\..\project-management\github-seed.json"
}
$SeedPath = [System.IO.Path]::GetFullPath($SeedPath)

if (-not (Test-Path $SeedPath)) {
    throw "Seed file not found: $SeedPath"
}

$seed = Get-Content -Raw -Path $SeedPath | ConvertFrom-Json

if (-not $seed.iteration_relationships) {
    throw "No iteration_relationships section found in seed file."
}

$headers = @{
    Authorization          = "Bearer $Token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "AHI-Capstone-IterationRelationships"
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

# ---------- Fetch all issues ----------
Write-Host "Fetching all repository issues..."
$allIssues = @()
$page = 1

while ($true) {
    $batch = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/issues?state=all&per_page=100&page=$page"
    if (-not $batch -or $batch.Count -eq 0) { break }

    foreach ($item in $batch) {
        if (-not $item.pull_request) {
            $allIssues += $item
        }
    }

    if ($batch.Count -lt 100) { break }
    $page++
}

Write-Host "Found $($allIssues.Count) issues."

# Build lookup: title -> issue object
$issueByTitle = @{}
foreach ($issue in $allIssues) {
    $issueByTitle[$issue.title] = $issue
}

# ---------- Build iteration data ----------
$iterRel = $seed.iteration_relationships
$iterations = $iterRel.iterations
$crossDeps = $iterRel.cross_iteration_dependencies
$containment = $iterRel.iteration_story_containment

# Build iteration lookup
$iterById = @{}
foreach ($iter in $iterations) {
    $iterById[$iter.id] = $iter
}

# Resolve Epic issue numbers
$epicIssueByIterId = @{}
foreach ($iter in $iterations) {
    $epicTitle = $iter.epic_issue
    if ($issueByTitle.ContainsKey($epicTitle)) {
        $epicIssueByIterId[$iter.id] = $issueByTitle[$epicTitle]
        Write-Host "  Resolved $($iter.id) Epic -> #$($issueByTitle[$epicTitle].number): $epicTitle"
    }
    else {
        Write-Warning "Epic issue not found for $($iter.id): $epicTitle"
    }
}

# Resolve story issue numbers for containment
$storyIssuesByIterId = @{}
foreach ($iter in $iterations) {
    $storyTitles = @()
    if ($containment.PSObject.Properties[$iter.id]) {
        $storyTitles = @($containment.($iter.id))
    }

    $resolved = @()
    foreach ($title in $storyTitles) {
        # Story titles in seed may not have the [Story]/[Task] prefix, try pattern match
        $found = $null
        foreach ($issue in $allIssues) {
            if ($issue.title -match [regex]::Escape($title)) {
                $found = $issue
                break
            }
        }
        if ($found) {
            $resolved += $found
        }
        else {
            Write-Warning "  Story not found for $($iter.id): $title"
        }
    }

    $storyIssuesByIterId[$iter.id] = $resolved
    Write-Host "  Resolved $($iter.id) stories: $($resolved.Count)/$($storyTitles.Count)"
}

# ---------- Build relationship body sections ----------
function New-IterationRelationshipSection {
    param(
        [PSCustomObject]$Iteration,
        $EpicIssue,
        [array]$StoryIssues
    )

    $lines = @()
    $lines += ""
    $lines += "---"
    $lines += "## Iteration Relationships"
    $lines += ""

    # Identity
    $lines += "**Iteration:** $($Iteration.id) -- $($Iteration.title)"
    $lines += "**Date Range:** $($Iteration.date_range.start) -> $($Iteration.date_range.end)"
    $lines += "**Sprints:** $($Iteration.sprints -join ', ')"
    $lines += "**Milestone Gate:** $($Iteration.milestone_gate)"
    $lines += ""

    # Predecessors
    if ($Iteration.predecessors.Count -gt 0) {
        $lines += "### Predecessors (Depends On)"
        foreach ($predId in $Iteration.predecessors) {
            if ($epicIssueByIterId.ContainsKey($predId)) {
                $predIssue = $epicIssueByIterId[$predId]
                $predIter = $iterById[$predId]
                $lines += "- **$predId** #$($predIssue.number) -- $($predIter.title)"
            }
            else {
                $lines += "- **$predId** (issue not found)"
            }
        }
        $lines += ""
    }
    else {
        $lines += "### Predecessors"
        $lines += "- None (this is the starting iteration)"
        $lines += ""
    }

    # Successors
    if ($Iteration.successors.Count -gt 0) {
        $lines += "### Successors (Unlocks)"
        foreach ($succId in $Iteration.successors) {
            if ($epicIssueByIterId.ContainsKey($succId)) {
                $succIssue = $epicIssueByIterId[$succId]
                $succIter = $iterById[$succId]
                $lines += "- **$succId** #$($succIssue.number) -- $($succIter.title)"
            }
            else {
                $lines += "- **$succId** (issue not found)"
            }
        }
        $lines += ""
    }
    else {
        $lines += "### Successors"
        $lines += "- None (this is the final iteration)"
        $lines += ""
    }

    # Cross-iteration dependencies
    $relevantDeps = @($crossDeps | Where-Object { $_.from_iteration -eq $Iteration.id -or $_.to_iteration -eq $Iteration.id })
    if ($relevantDeps.Count -gt 0) {
        $lines += "### Cross-Iteration Dependencies"
        foreach ($dep in $relevantDeps) {
            $direction = if ($dep.from_iteration -eq $Iteration.id) { "-> $($dep.to_iteration)" } else { "<- $($dep.from_iteration)" }
            $lines += "- $direction ($($dep.type)): $($dep.description)"
        }
        $lines += ""
    }

    # Story tasklist
    if ($StoryIssues.Count -gt 0) {
        $lines += "### Contained Stories"
        foreach ($story in $StoryIssues) {
            $lines += "- [ ] #$($story.number)"
        }
        $lines += ""
    }

    return ($lines -join "`n")
}

# ---------- Apply updates ----------
$updatedEpics = 0
$updatedStories = 0

foreach ($iter in $iterations) {
    if (-not $epicIssueByIterId.ContainsKey($iter.id)) {
        Write-Warning "Skipping $($iter.id) -- no Epic issue found."
        continue
    }

    $epicIssue = $epicIssueByIterId[$iter.id]
    $storyIssues = $storyIssuesByIterId[$iter.id]

    # Check if relationships section already exists
    $existingBody = if ($epicIssue.body) { $epicIssue.body } else { "" }
    if ($existingBody -match "## Iteration Relationships") {
        # Strip existing section and rebuild
        $existingBody = $existingBody -replace "(?s)---\r?\n## Iteration Relationships.*$", ""
        $existingBody = $existingBody.TrimEnd()
    }

    $relationshipSection = New-IterationRelationshipSection -Iteration $iter -EpicIssue $epicIssue -StoryIssues $storyIssues
    $newBody = "$existingBody`n$relationshipSection"

    if ($DryRun) {
        Write-Host ""
        Write-Host "=== [DryRun] Would update Epic #$($epicIssue.number) ($($iter.id)) ==="
        Write-Host $newBody
        Write-Host "=== [End DryRun] ==="
    }
    else {
        Invoke-GHRest -Method Patch -Url "https://api.github.com/repos/$Owner/$Repo/issues/$($epicIssue.number)" -Body @{
            body = $newBody
        } | Out-Null
        Write-Host "Updated Epic #$($epicIssue.number) with iteration relationships ($($iter.id))"
    }
    $updatedEpics++

    # Add parent reference comment on each story
    foreach ($story in $storyIssues) {
        $commentBody = "**Parent Iteration:** $($iter.id) -- $($iter.title) (Epic #$($epicIssue.number))"

        if ($DryRun) {
            Write-Host "  [DryRun] Would comment on #$($story.number): $commentBody"
        }
        else {
            # Check for existing comment to avoid duplicates
            $existingComments = Invoke-GHRest -Method Get -Url "https://api.github.com/repos/$Owner/$Repo/issues/$($story.number)/comments?per_page=100"
            $alreadyCommented = $existingComments | Where-Object { $_.body -match "Parent Iteration.*$($iter.id)" }

            if ($alreadyCommented) {
                Write-Host "  Story #$($story.number) already has parent reference. Skipping."
            }
            else {
                Invoke-GHRest -Method Post -Url "https://api.github.com/repos/$Owner/$Repo/issues/$($story.number)/comments" -Body @{
                    body = $commentBody
                } | Out-Null
                Write-Host "  Added parent reference to story #$($story.number)"
                $updatedStories++
            }
        }
    }
}

Write-Host ""
Write-Host "Done."
Write-Host "  Epics updated: $updatedEpics"
Write-Host "  Stories commented: $updatedStories"
