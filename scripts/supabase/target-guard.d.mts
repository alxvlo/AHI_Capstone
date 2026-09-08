export interface WriteTarget {
  url: string;
  host: string | null;
  local: boolean;
  allowCloud: boolean;
  allowed: boolean;
}

export function isLocalSupabaseUrl(rawUrl: string): boolean;

export function resolveWriteTarget(env?: Record<string, string | undefined>): WriteTarget;

export function assertWritableTarget(
  scriptName: string,
  env?: Record<string, string | undefined>
): WriteTarget;
