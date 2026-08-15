"use server";

import {
  CLIENT_ROLE,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import {
  pickJoined,
  type ClientCaseRow,
  type ClientDashboardData,
  type ClientDashboardSearchState,
  type ClientDecisionRow,
} from "@/features/dashboard/client/shared";

type ClientContext = Awaited<ReturnType<typeof resolveCurrentUserRoleContext>>;

type ReleasedCasesResult = {
  companyId: number | null;
  companyName: string | null;
  cases: ClientCaseRow[];
  selectedCaseId: string | null;
  selectedCase: ClientCaseRow | null;
  error: string | null;
};

type CaseFitnessResult = {
  decision: ClientDecisionRow | null;
  error: string | null;
};

function normalizeCaseId(rawCaseId: string) {
  const trimmed = rawCaseId.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSearchState(searchState: ClientDashboardSearchState): ClientDashboardSearchState {
  return {
    caseId: searchState.caseId.trim(),
    query: searchState.query.trim(),
    fromDate: searchState.fromDate.trim(),
    toDate: searchState.toDate.trim(),
    dpaAccepted: searchState.dpaAccepted === "1" ? "1" : "",
  };
}

function resolveSelectedCase(cases: ClientCaseRow[], requestedCaseId: string) {
  const normalizedCaseId = normalizeCaseId(requestedCaseId);

  if (cases.length === 0) {
    return {
      selectedCaseId: null,
      selectedCase: null,
    };
  }

  if (normalizedCaseId) {
    const matched = cases.find((caseRow) => caseRow.caseid === normalizedCaseId) ?? null;

    if (matched) {
      return {
        selectedCaseId: matched.caseid,
        selectedCase: matched,
      };
    }
  }

  return {
    selectedCaseId: cases[0].caseid,
    selectedCase: cases[0],
  };
}

function isCaseMatchForQuery(caseRow: ClientCaseRow, query: string) {
  if (!query) {
    return true;
  }

  const queryLower = query.toLowerCase();
  const patient = pickJoined(caseRow.patient);
  const caseNumber = caseRow.casenumber.toLowerCase();
  const patientName = (patient?.fullname ?? "").toLowerCase();
  const identifier = (patient?.governmentid ?? "").toLowerCase();

  return (
    caseNumber.includes(queryLower) ||
    patientName.includes(queryLower) ||
    identifier.includes(queryLower)
  );
}

async function loadReleasedCasesFromContext(
  context: ClientContext,
  searchState: ClientDashboardSearchState
): Promise<ReleasedCasesResult> {
  const { supabase, userId, role } = context;

  if (!userId) {
    return {
      companyId: null,
      companyName: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "No authenticated user session was found.",
    };
  }

  if (role !== CLIENT_ROLE) {
    return {
      companyId: null,
      companyName: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "Current account role is not allowed to open the agency portal.",
    };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("user_account")
    .select("companyid, company:companyid(companyid, name)")
    .eq("userid", userId)
    .maybeSingle();

  if (accountError) {
    return {
      companyId: null,
      companyName: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: `Unable to resolve company scope: ${accountError.message}`,
    };
  }

  const companyId =
    typeof accountRow?.companyid === "number" && Number.isInteger(accountRow.companyid)
      ? accountRow.companyid
      : null;
  const companyName = pickJoined(
    (accountRow as { company?: ClientCaseRow["company"] } | null)?.company
  )?.name ?? null;

  if (!companyId) {
    return {
      companyId: null,
      companyName,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "Client account has no linked company profile.",
    };
  }

  const { data: releasedStatusRow, error: statusError } = await supabase
    .from("status_code")
    .select("statuscodeid")
    .eq("domain", "CASE")
    .eq("code", "RELEASED")
    .eq("isactive", true)
    .maybeSingle();

  if (statusError || typeof releasedStatusRow?.statuscodeid !== "number") {
    return {
      companyId,
      companyName,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: `Unable to resolve RELEASED status reference: ${
        statusError?.message ?? "Status row missing."
      }`,
    };
  }

  let casesQuery = supabase
    .from("peme_case")
    .select(
      "caseid, casenumber, casecategory, companyid, portalvisible, waiversigned, registrationtimestamp, releasedtimestamp, status:casestatuscodeid(statuscodeid, code, label), patient:patientid(patientid, fullname, governmentid, dateofbirth, sex), company:companyid(companyid, name)"
    )
    .eq("companyid", companyId)
    .eq("casestatuscodeid", releasedStatusRow.statuscodeid)
    .eq("portalvisible", true)
    .eq("waiversigned", true)
    .order("releasedtimestamp", { ascending: false })
    .limit(200);

  if (searchState.fromDate) {
    casesQuery = casesQuery.gte("releasedtimestamp", `${searchState.fromDate}T00:00:00`);
  }

  if (searchState.toDate) {
    casesQuery = casesQuery.lte("releasedtimestamp", `${searchState.toDate}T23:59:59`);
  }

  const { data: caseRowsRaw, error: caseError } = await casesQuery;

  if (caseError) {
    return {
      companyId,
      companyName,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: `Unable to load released cases: ${caseError.message}`,
    };
  }

  const allCases = (caseRowsRaw ?? []) as ClientCaseRow[];
  const filteredCases = allCases.filter((caseRow) => isCaseMatchForQuery(caseRow, searchState.query));
  const { selectedCaseId, selectedCase } = resolveSelectedCase(filteredCases, searchState.caseId);

  return {
    companyId,
    companyName,
    cases: filteredCases,
    selectedCaseId,
    selectedCase,
    error: null,
  };
}

async function loadCaseFitnessFromContext(
  context: ClientContext,
  selectedCase: ClientCaseRow | null
): Promise<CaseFitnessResult> {
  const { supabase } = context;

  if (!selectedCase) {
    return {
      decision: null,
      error: null,
    };
  }

  const { data: decisionRowRaw, error: decisionError } = await supabase
    .from("peme_decision")
    .select("decisionid, caseid, fitnessstatus, decisiondate, remarks")
    .eq("caseid", selectedCase.caseid)
    .maybeSingle();

  return {
    decision: (decisionRowRaw ?? null) as ClientDecisionRow | null,
    error: decisionError?.message ?? null,
  };
}

export async function fetchClientDashboardData(
  searchState: ClientDashboardSearchState
): Promise<ClientDashboardData> {
  const context = await resolveCurrentUserRoleContext();
  const normalizedSearchState = normalizeSearchState(searchState);
  const releasedCases = await loadReleasedCasesFromContext(context, normalizedSearchState);
  const caseFitness = await loadCaseFitnessFromContext(context, releasedCases.selectedCase);

  return {
    companyId: releasedCases.companyId,
    companyName: releasedCases.companyName,
    cases: releasedCases.cases,
    selectedCaseId: releasedCases.selectedCaseId,
    selectedCase: releasedCases.selectedCase,
    decision: caseFitness.decision,
    searchState: {
      ...normalizedSearchState,
      caseId: releasedCases.selectedCaseId ?? normalizedSearchState.caseId,
    },
    errors: {
      account: releasedCases.error,
      cases: releasedCases.error,
      decision: caseFitness.error,
    },
  };
}
