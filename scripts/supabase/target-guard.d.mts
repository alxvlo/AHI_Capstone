export interface WriteTarget {
  url: string;
  host: string | null;
  local: boolean;
  allowCloud: boolean;
  allowed: boolean;
}

export function isLocalSupabaseUrl(rawUrl: string): boolean;

export function resolveWriteTarget(env?: NodeJS.ProcessEnv): WriteTarget;

export function assertWritableTarget(
  scriptName: string,
  env?: NodeJS.ProcessEnv
): WriteTarget;
