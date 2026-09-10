export interface CatalogEntry {
  testid: number;
  testname: string;
  valuetype: "numeric" | "categorical" | "text";
  defaultunit: string | null;
  defaultref: string | null;
  refmin: number | null;
  refmax: number | null;
  refmin_male: number | null;
  refmax_male: number | null;
  refmin_female: number | null;
  refmax_female: number | null;
  validvalues: string[] | null;
}

export interface DemoResultRow {
  departmentcode: string;
  testid: number;
  testname: string;
  value: string;
  unit: string | null;
  referencerange: string | null;
  isabnormal: boolean;
}

export interface BuildCaseResultsInput {
  demoCase: { casestatuscode: string; decision: { fitnessstatus: string } | null;
              visits: Array<{ departmentcode: string; statuscode: string }> };
  caseIndex: number;
  patientSex: "M" | "F" | null;
  testsByDepartment: Record<string, CatalogEntry[]>;
}

export function buildCaseResults(input: BuildCaseResultsInput): DemoResultRow[];
export const TEXT_RESULT_BY_TEST: Record<string, string>;
