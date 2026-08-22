/**
 * PostgREST returns an embedded join as either a single object or a
 * one-element array, depending on how it infers the relationship's
 * cardinality. Normalise both shapes to "the row, or null".
 */
export type JoinedRecord<T> = T | T[] | null;

export function pickJoined<T>(value: JoinedRecord<T> | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
