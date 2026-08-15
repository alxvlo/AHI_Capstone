"use server";

import { redirect } from "next/navigation";
import {
  PATIENT_ROLE,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import {
  isCaseReleased,
  pickJoined,
  type PatientCaseRow,
  type PatientDashboardData,
  type PatientDecisionRow,
  type PatientDepartmentVisitRow,
  type PatientResultFileRow,
  type PatientResultItemRow,
  type JoinedRecord,
} from "@/features/dashboard/patient/shared";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";

const PATIENT_DASHBOARD_PATH = "/dashboard/patient";

type PatientContext = Awaited<ReturnType<typeof resolveCurrentUserRoleContext>>;

type OwnCaseResult = {
  patientId: string | null;
  cases: PatientCaseRow[];
  selectedCaseId: string | null;
  selectedCase: PatientCaseRow | null;
  error: string | null;
};

type OwnResultsResult = {
  visits: PatientDepartmentVisitRow[];
  resultItems: PatientResultItemRow[];
  decision: PatientDecisionRow | null;
  errors: {
    visits?: string | null;
    results?: string | null;
    decision?: string | null;
  };
};

type ResultFilesResult = {
  files: PatientResultFileRow[];
  error: string | null;
};

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeReturnPath(rawPath: string | null) {
  return normalizeDashboardReturnPath(rawPath, PATIENT_DASHBOARD_PATH);
}

function truncateMessage(message: string, limit = 200) {
  if (message.length <= limit) {
    return message;
  }

  return `${message.slice(0, limit - 3)}...`;
}

function buildRedirectPath(
  returnPath: string,
  options: {
    notice?: string;
    error?: string;
  }
) {
  const normalizedPath = normalizeReturnPath(returnPath);
  const url = new URL(normalizedPath, "http://localhost");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");

  if (options.notice) {
    url.searchParams.set("notice", truncateMessage(options.notice));
  }

  if (options.error) {
    url.searchParams.set("error", truncateMessage(options.error));
  }

  const search = url.searchParams.toString();

  return search ? `${url.pathname}?${search}` : url.pathname;
}

function redirectWithNotice(returnPath: string, message: string): never {
  redirect(
    buildRedirectPath(returnPath, {
      notice: message,
    })
  );
}

function redirectWithError(returnPath: string, message: string): never {
  redirect(
    buildRedirectPath(returnPath, {
      error: message,
    })
  );
}

function normalizeCaseId(rawCaseId: string | null) {
  if (!rawCaseId) {
    return null;
  }

  const trimmedCaseId = rawCaseId.trim();

  return trimmedCaseId.length > 0 ? trimmedCaseId : null;
}

function resolveSelectedCase(cases: PatientCaseRow[], requestedCaseId: string | null) {
  if (cases.length === 0) {
    return {
      selectedCaseId: null,
      selectedCase: null,
    };
  }

  const normalizedCaseId = normalizeCaseId(requestedCaseId);

  if (normalizedCaseId) {
    const matchedCase = cases.find((caseRow) => caseRow.caseid === normalizedCaseId) ?? null;

    if (matchedCase) {
      return {
        selectedCaseId: matchedCase.caseid,
        selectedCase: matchedCase,
      };
    }
  }

  return {
    selectedCaseId: cases[0].caseid,
    selectedCase: cases[0],
  };
}

async function loadOwnCaseFromContext(
  context: PatientContext,
  requestedCaseId: string | null
): Promise<OwnCaseResult> {
  const { supabase, userId, role } = context;

  if (!userId) {
    return {
      patientId: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "No authenticated user session was found.",
    };
  }

  if (role !== PATIENT_ROLE) {
    return {
      patientId: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "Current account role is not allowed to open the patient portal.",
    };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("user_account")
    .select("patientid")
    .eq("userid", userId)
    .maybeSingle();

  if (accountError) {
    return {
      patientId: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: `Unable to resolve linked patient profile: ${accountError.message}`,
    };
  }

  const patientId =
    typeof accountRow?.patientid === "string" && accountRow.patientid.length > 0
      ? accountRow.patientid
      : null;

  if (!patientId) {
    return {
      patientId: null,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: "This account is missing a linked patient profile.",
    };
  }

  const { data: caseRowsRaw, error: caseRowsError } = await supabase
    .from("peme_case")
    .select(
      "caseid, casenumber, casecategory, isrush, waiversigned, portalvisible, registrationtimestamp, triagecompletedtimestamp, releasedtimestamp, remarks, status:casestatuscodeid(statuscodeid, code, label), package:packageid(packageid, packagename, category), company:companyid(companyid, name)"
    )
    .eq("patientid", patientId)
    .order("registrationtimestamp", { ascending: false })
    .limit(50);

  if (caseRowsError) {
    return {
      patientId,
      cases: [],
      selectedCaseId: null,
      selectedCase: null,
      error: `Unable to load PEME cases: ${caseRowsError.message}`,
    };
  }

  const cases = (caseRowsRaw ?? []) as PatientCaseRow[];
  const { selectedCaseId, selectedCase } = resolveSelectedCase(cases, requestedCaseId);

  return {
    patientId,
    cases,
    selectedCaseId,
    selectedCase,
    error: null,
  };
}

async function loadOwnResultsFromContext(
  context: PatientContext,
  selectedCase: PatientCaseRow | null
): Promise<OwnResultsResult> {
  const { supabase } = context;

  if (!selectedCase) {
    return {
      visits: [],
      resultItems: [],
      decision: null,
      errors: {},
    };
  }

  const statusCode = pickJoined(selectedCase.status)?.code ?? null;

  const [visitsResponse, decisionResponse] = await Promise.all([
    supabase
      .from("department_visit")
      .select(
        "visitid, caseid, departmentid, visitstatuscodeid, queuenumber, timepending, timestarted, timecompleted, remarks, department:departmentid(departmentid, name, code), visitStatus:visitstatuscodeid(statuscodeid, code, label)"
      )
      .eq("caseid", selectedCase.caseid)
      .order("visitid", { ascending: true }),
    supabase
      .from("peme_decision")
      .select("decisionid, caseid, fitnessstatus, decisiondate, remarks")
      .eq("caseid", selectedCase.caseid)
      .maybeSingle(),
  ]);

  const visits = (visitsResponse.data ?? []) as PatientDepartmentVisitRow[];
  const decision = (decisionResponse.data ?? null) as PatientDecisionRow | null;

  let resultItems: PatientResultItemRow[] = [];
  let resultsErrorMessage: string | null = null;

  if (isCaseReleased(statusCode)) {
    const { data: resultItemsRaw, error: resultItemsError } = await supabase
      .from("result_item")
      .select(
        "resultid, caseid, visitid, departmentid, testname, value, unit, referencerange, isabnormal, verificationstatus, verifiedat, remarks, department:departmentid(departmentid, name, code)"
      )
      .eq("caseid", selectedCase.caseid)
      .order("departmentid", { ascending: true })
      .order("testname", { ascending: true });

    resultItems = (resultItemsRaw ?? []) as PatientResultItemRow[];
    resultsErrorMessage = resultItemsError?.message ?? null;
  }

  return {
    visits,
    resultItems,
    decision,
    errors: {
      visits: visitsResponse.error?.message ?? null,
      results: resultsErrorMessage,
      decision: decisionResponse.error?.message ?? null,
    },
  };
}

async function loadResultFilesFromContext(
  context: PatientContext,
  selectedCase: PatientCaseRow | null
): Promise<ResultFilesResult> {
  if (!selectedCase) {
    return {
      files: [],
      error: null,
    };
  }

  const statusCode = pickJoined(selectedCase.status)?.code ?? null;

  if (!isCaseReleased(statusCode)) {
    return {
      files: [],
      error: null,
    };
  }

  const { supabase } = context;

  const { data: fileRows, error: fileError } = await supabase
    .from("result_file")
    .select(
      "fileid, filename, mimetype, filesize, uploadedat, storagepath, department:departmentid(name)"
    )
    .eq("caseid", selectedCase.caseid)
    .order("uploadedat", { ascending: false });

  if (fileError) {
    return {
      files: [],
      error: `Unable to load result files: ${fileError.message}`,
    };
  }

  const files: PatientResultFileRow[] = await Promise.all(
    (fileRows ?? []).map(async (row) => {
      const deptRecord = pickJoined(
        row.department as JoinedRecord<{ name: string }> | undefined
      );

      let downloadUrl: string | null = null;

      if (row.storagepath) {
        const { data: signedUrlData } = await supabase.storage
          .from("result-files")
          .createSignedUrl(row.storagepath as string, 3600); // 1 hour expiry

        downloadUrl = signedUrlData?.signedUrl ?? null;
      }

      return {
        fileid: row.fileid as string,
        fileName: row.filename as string,
        departmentName: deptRecord?.name ?? "Unknown",
        uploadedAt: row.uploadedat as string | null,
        mimeType: row.mimetype as string,
        fileSize: row.filesize as number,
        downloadUrl,
      };
    })
  );

  return {
    files,
    error: null,
  };
}

export async function requestCertificateDownloadAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Please select a valid case before requesting certificate download.");
  }

  const { supabase, userId, role } = await resolveCurrentUserRoleContext();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== PATIENT_ROLE) {
    redirectWithError(
      returnPath,
      "Current account role is not allowed to access patient certificate downloads."
    );
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("user_account")
    .select("patientid")
    .eq("userid", userId)
    .maybeSingle();

  if (accountError) {
    redirectWithError(
      returnPath,
      `Unable to validate your patient profile: ${accountError.message}`
    );
  }

  const patientId =
    typeof accountRow?.patientid === "string" && accountRow.patientid.length > 0
      ? accountRow.patientid
      : null;

  if (!patientId) {
    redirectWithError(
      returnPath,
      "Your account is missing a linked patient profile for certificate download."
    );
  }

  const { data: caseRowRaw, error: caseError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, patientid, status:casestatuscodeid(code, label)")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseError || !caseRowRaw) {
    redirectWithError(
      returnPath,
      `Unable to load selected case for certificate request: ${
        caseError?.message ?? "Case not found."
      }`
    );
  }

  const caseRow = caseRowRaw as {
    caseid: string;
    casenumber: string;
    patientid: string;
    status?: JoinedRecord<{
      code: string;
      label: string | null;
    }>;
  };

  if (caseRow.patientid !== patientId) {
    redirectWithError(
      returnPath,
      "Certificate requests are restricted to your own case records."
    );
  }

  const statusCode = pickJoined(caseRow.status)?.code ?? null;

  if (!isCaseReleased(statusCode)) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} is not released yet. Certificate download is available only after release.`
    );
  }

  redirectWithNotice(
    returnPath,
    `Certificate entrypoint validated for ${caseRow.casenumber}. PDF template/signature configuration is still pending AHI final requirements.`
  );
}

export async function fetchPatientDashboardData(
  requestedCaseId: string | null
): Promise<PatientDashboardData> {
  const context = await resolveCurrentUserRoleContext();
  const ownCase = await loadOwnCaseFromContext(context, requestedCaseId);
  const ownResults = await loadOwnResultsFromContext(context, ownCase.selectedCase);
  const files = await loadResultFilesFromContext(context, ownCase.selectedCase);

  return {
    patientId: ownCase.patientId,
    cases: ownCase.cases,
    selectedCaseId: ownCase.selectedCaseId,
    selectedCase: ownCase.selectedCase,
    visits: ownResults.visits,
    resultItems: ownResults.resultItems,
    decision: ownResults.decision,
    resultFiles: files.files,
    errors: {
      account: ownCase.error,
      cases: ownCase.error,
      visits: ownResults.errors.visits ?? null,
      results: ownResults.errors.results ?? null,
      decision: ownResults.errors.decision ?? null,
      files: files.error,
    },
  };
}
