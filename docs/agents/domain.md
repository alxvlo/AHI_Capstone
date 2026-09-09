# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase. This repo is **single-context**: one domain, no
`CONTEXT-MAP.md`, no per-package contexts.

## Before exploring, read these

- **`memory-bank/index.md`** — the document map and reading order. Start here.
- **`memory-bank/current-sprint.md`** — authoritative on what is in flight.
- **`.claude/rules/peme-domain.md`** — schema groups, case lifecycle, gating
  flags. Loads automatically when you open `app/`, `features/`, or `supabase/`.
- **`memory-bank/decisions.md`** — the locked-decision log. This fills the role
  ADRs play in other repos: dated entries with rationale and implementation
  status. There is no `docs/adr/` here.
- **`CONTEXT.md`** at the repo root, if it exists.

`CONTEXT.md` does not exist yet. If any of these files are missing, **proceed
silently**. Don't flag their absence and don't propose creating them upfront.
The `/domain-modeling` skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates them lazily, when terms or decisions
actually get resolved.

## File structure

```
/
├── CLAUDE.md                  ← architecture picture, domain, where state lives
├── AGENTS.md                  ← canonical code style, commands, conventions
├── DEVELOPMENT-PLAN.md        ← all phases and slices
├── CONTEXT.md                 ← glossary; created lazily, absent today
├── .claude/rules/             ← path-triggered domain and standards rules
├── memory-bank/
│   ├── index.md               ← doc map + reading order
│   ├── decisions.md           ← locked decisions (the ADR role)
│   ├── current-sprint.md      ← live state
│   └── ...
└── docs/superpowers/          ← plans and specs
```

## Use the glossary's vocabulary

When your output names a domain concept — an entry title, a refactor proposal,
a hypothesis, a test name — use the term as the project defines it. Until
`CONTEXT.md` exists, the vocabulary lives in `.claude/rules/peme-domain.md`,
`memory-bank/design-doc.md`, and `memory-bank/database/schema.txt`, which is the
source of truth for DB types.

If the concept you need isn't defined anywhere, that's a signal: either you're
inventing language the project doesn't use (reconsider) or there's a real gap
(note it for `/domain-modeling`).

## Flag conflicts with a locked decision

If your output contradicts an entry in `memory-bank/decisions.md`, surface it
explicitly rather than silently overriding:

> _Contradicts the 2026-09-02 decision on on-premise deployment, but worth
> reopening because…_

A decision is not made until it is in `memory-bank/decisions.md` with a date and
a rationale. If your work changes workflow, auth, or system design, update the
relevant `memory-bank/` doc in the same task.
