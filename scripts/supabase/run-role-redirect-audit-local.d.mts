export type KillPlan =
  | { kind: "noop" }
  | { kind: "taskkill"; command: string; args: string[] }
  | { kind: "process-group"; pgid: number };

export function buildKillPlan(
  pid: number | null | undefined,
  platform?: NodeJS.Platform | string
): KillPlan;
