# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the strings used in this repo.

| Label in mattpocock/skills | Label here        | Meaning                                  |
| -------------------------- | ----------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`    | Needs evaluation before anyone starts it |
| `needs-info`               | `needs-info`      | Waiting on the reporter for more detail  |
| `ready-for-agent`          | `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human` | Requires human implementation            |
| `wontfix`                  | `wontfix`         | Will not be actioned                     |

## How a label is applied

There is no external board here, so there are no GitHub labels to attach.
Write the role as a `Triage:` field on the item itself:

- a defect: add `Triage: ready-for-agent` to the row's notes in
  `memory-bank/qa-runs/defect-log.md`
- a queued item: add the same line under the entry in
  `memory-bank/current-sprint.md`

One role per item. Replace the old value rather than listing two.
Priority stays separate: defects keep their P0–P3 rating, which the triage
role does not override.
