# Documentation lifecycle reorganisation — design

**Date:** 2026-09-07
**Status:** Proposed
**Branch:** `ux-journey-reviews`
**Plan:** `docs/superpowers/plans/2026-09-07-docs-lifecycle-reorg.md`

---

## Problem

`docs/superpowers/` sorts documents by **type** (`plans/`, `specs/`, `journeys/`, `findings/`). It
does not record **lifecycle**. Finished work and live work sit in the same directory with nothing
distinguishing them, so a reader opening `plans/` to find out what is in flight instead reads
thirteen completed documents.

Measured state at the time of writing:

| Directory | Entries | Live | Complete |
|---|---|---|---|
| `docs/superpowers/plans/` | 13 | **0** | 13 |
| `docs/superpowers/specs/` | 4 | 2 | 2 |
| `docs/` (root, loose) | 3 | 2 | 1 |

Every plan in the repository is finished. The directory named for active work is a graveyard, and
the two live documents in `specs/` are indistinguishable from two completed design docs beside
them.

## Non-problem: size

An earlier framing of this work claimed deleting the seven branch-added plans would remove "27% of
the branch." That measured **lines**, which is the wrong unit. On disk:

| | Size |
|---|---|
| 7 branch-added plans | 236 K |
| `journeys/evidence/screenshots/` | 4.8 M |

Deleting every one of those plans saves ~4.5% of the branch's weight. **Size is not a reason to do
anything here.** This design therefore archives rather than deletes, and touches no evidence file
and no screenshot.

## Goals

1. Make lifecycle legible from the directory name alone: a reader can tell live from finished
   without opening a file.
2. Lose no content and no git history.
3. Leave behind a mechanical check for the failure mode this work risks (broken document
   references), because none exists today.

## Non-goals

- Reducing repository size (see above).
- Touching `journeys/`, `journeys/evidence/`, or the 30 screenshots. All 30 are referenced by a
  surviving document; the evidence files are cited 17–61 times each and are what make findings
  defensible rather than assertions.
- Repairing the three pre-existing dangling references identified below. They predate this work
  and are recorded as a baseline, not fixed by it.
- Rewriting commit history. That is a separate, later decision.

## Design

### Organising principle

Sort by **who reads it and when**, not by document type. Three zones:

| Zone | Question it answers | Directories |
|---|---|---|
| Reference | "What is true about the system?" | `journeys/`, `findings/` |
| Live | "What do I do next?" | `specs/`, `plans/`, `memory-bank/` |
| History | "How did we get here?" | `archive/` |

### Target layout

```
docs/
├── Chapter-4.md                     thesis material — different audience
├── Chapter-4-changelog.md
│
└── superpowers/
    ├── journeys/                    REFERENCE (unchanged by this work)
    │   ├── 01-reception.md … 05-releasing.md
    │   └── evidence/
    │       ├── 01-reception-L1.md … 05-releasing-L2.md
    │       └── screenshots/         30 files, all cited
    │
    ├── findings/                    REFERENCE (unchanged by this work)
    │   ├── inventory.md
    │   └── register.md              ← hub; 5 documents point here
    │
    ├── specs/                       LIVE governance + live authorities
    │   ├── 2026-08-16-staff-workflow-revision-design.md   ← requirements source, stays
    │   ├── 2026-09-04-ux-programme-overview.md
    │   └── 2026-09-07-docs-lifecycle-reorg-design.md
    │
    ├── plans/                       ACTIVE work only
    │   └── 2026-09-07-docs-lifecycle-reorg.md
    │
    └── archive/                     HISTORY — kept, rarely read
        ├── README.md
        ├── plans/                   14 files
        └── specs/                   2 files
```

`plans/` holding only the in-flight plan is the point: an empty-but-for-one `plans/` is
information. **The active plan does not archive itself** — it is live until its own work merges.

### What verifying first changed

Two claims in the first draft of this design were wrong, and measuring caught both before any file
moved.

**`2026-08-16-staff-workflow-revision-design.md` is not a completed design doc.** It is one of the
four named **Sources of Requirements** in the programme overview
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:28`, "Lex's staff workflow spec"), and
it is referenced by 22 files — **11 of them inside `journeys/`, `journeys/evidence/`, and
`findings/`**, which this design explicitly does not touch. Archiving it would have forced edits
into the audit's own evidence layer to repair paths. It stays in `specs/`. The number of specs
archived drops from three to two.

**Nothing in the protected tree references a plan.** Verified directly:

```
grep -rn "superpowers/plans/" docs/superpowers/journeys docs/superpowers/findings
  → no matches
```

Plan archiving therefore cannot disturb `journeys/`, `evidence/`, or `findings/` at all. Inbound
plan references total seven sites across four files, all in `memory-bank/`.

This asymmetry — plans are cheap to move, specs are expensive — is the reason this design archives
all fourteen plans but only two specs.

### Why `archive/` and not deletion

The plans are the only record of how the audit was conducted: acceptance criteria, review protocol,
the rulings made along the way. For a capstone that is often the examinable part. Archiving costs
236 K and preserves it.

### Why `docs/superpowers/archive/` and not `memory-bank/archive/`

`memory-bank/archive/` already exists and holds superseded *memory-bank* documents
(`activeContext.md`, `fullPlan.md`, `progress.md`, …). It is that tree's own archive. Mirroring the
convention locally keeps each tree self-contained; merging them would couple two unrelated
histories.

## Safety

### The gitignore hazard — verified, not assumed

This repository has already been damaged by exactly the failure this work could repeat. Per
`memory-bank/current-sprint.md:341`, until 2026-08-15 `.gitignore` carried bare `shared/` and
`plans/` patterns intended for the `.agent/` tree. They matched **any** directory of those names
repo-wide, silently ignoring `docs/superpowers/plans/`. New files there were invisible to
`git add`.

A new `archive/` directory could hit the same trap. Checked before writing this design:

```
git check-ignore -v docs/superpowers/archive/plans/x.md   → no match
git check-ignore -v docs/superpowers/archive/specs/x.md   → no match
git check-ignore -v docs/superpowers/archive/x.md         → no match
```

Not ignored. The plan re-checks this as a precondition rather than trusting this paragraph.

### The unguarded failure mode

`scripts/docs/verify-citations.mjs` treats a citation as `path:line` or `path:line-range`. A bare
document reference with no line numbers is **not** a citation to it:

```
node scripts/docs/verify-citations.mjs memory-bank/guides/workflow-policy.md
  → 0 citations, 0 bad          (the file contains a plan reference on line 106)
```

So moving a file breaks inbound references and **no gate in this repository notices**. That is the
single largest risk in this work, and it is unguarded today.

The evidence that this rots silently is already in the tree — three referenced plan paths do not
exist and never have:

| Dangling path | Referenced from |
|---|---|
| `docs/superpowers/plans/2026-05-12-sprint-a-risk-closure.md` | `memory-bank/current-sprint.md:347` |
| `docs/superpowers/plans/2026-05-20-pre-sprint-terminal-release-hardening.md` | `memory-bank/current-sprint.md:348` |
| `docs/superpowers/plans/2026-05-22-demo-credibility-fixes.md` | `memory-bank/qa-runs/2026-05-22-demo-credibility-fixes.md:5` |

**Requirement:** build the check before performing any move, and record those three as an explicit,
documented allowlist so the count can never quietly grow.

### Safety rules for the move itself

1. **Tag before touching anything.** `git tag pre-docs-reorg` makes the entire pre-move state
   recoverable by name regardless of what follows.
2. **`git mv`, never delete-and-recreate.** Preserves rename detection and file history.
3. **Nothing is deleted.** No task in the plan removes a file.
4. **One task, one commit.** Each is independently revertable with `git revert`.
5. **Baseline captured before, compared after.** Number of tracked files, and the dangling-link
   report, must match expectations exactly — not "look fine."

### Rollback

| Scope | Command | Effect |
|---|---|---|
| One task | `git revert <sha>` | Undoes that task, keeps the rest and the history |
| All tasks, keep the work | `git revert <first>..<last>` | Linear undo, nothing lost |
| All tasks, discard entirely | `git reset --hard pre-docs-reorg` | Branch returns to the tagged pre-move state |
| Emergency, tag lost | `git reflog` → reset to the pre-move SHA | Reflog retains it for 90 days by default |

Because nothing is deleted and every move is `git mv`, no rollback path can lose content.

## Acceptance criteria

Written from the requirement, before implementation.

1. `docs/superpowers/plans/` contains exactly one file: this work's own plan.
2. `docs/superpowers/specs/` contains exactly three files: the staff workflow spec (a live
   requirements authority), the programme overview, and this design.
3. Every document that referenced a moved file resolves to its new path.
4. `scripts/docs/verify-doc-links.mjs` exists, is tested, and exits non-zero when a referenced
   `.md` path does not exist and is not in the documented allowlist.
5. The allowlist contains exactly the three paths tabled above, each with a stated reason.
6. **Must NOT happen:** no file is deleted. Tracked-file count before and after the reorganisation
   is identical.
7. **Must NOT happen:** no file lands in a gitignored location. `git status` shows no untracked
   file under `docs/superpowers/archive/`.
8. **Must NOT happen:** the dangling-reference count does not grow beyond the three allowlisted.
9. **Must NOT happen:** no file under `journeys/`, `journeys/evidence/`, or `findings/` is moved,
   renamed, or edited.
10. `npm run qa:local` result is unchanged from its pre-work baseline.
11. `scripts/docs/verify-citations.mjs` reports the same citation counts for every touched file
    after the work as before it.

## Open question, deliberately not decided here

`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:44` documents the convention that Pass 2
artefacts are written under `specs/` and `plans/`. That sentence stays true after this work — new
artefacts are still written there; they simply move to `archive/` on completion. The plan adds one
clause saying so rather than rewriting the convention.
