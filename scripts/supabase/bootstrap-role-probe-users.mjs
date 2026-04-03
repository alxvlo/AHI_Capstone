import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROBE_PASSWORD = process.env.AHI_PROBE_PASSWORD;

if (!SUPABASE_URL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in environment.");
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

if (!PROBE_PASSWORD) {
  console.error("Missing AHI_PROBE_PASSWORD in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PROBE_COMPANY_NAME = "Probe Company - Role Matrix";

const PROBE_USERS = [
  { roleName: "Patient", email: "probe.patient.20260320@ahi.local", fullName: "Probe Patient Role User", usePatient: true, useCompany: false, departmentCode: null },
  { roleName: "Client Representative", email: "probe.client.20260320@ahi.local", fullName: "Probe Client Representative", usePatient: false, useCompany: true, departmentCode: null },
  { roleName: "System Administrator", email: "probe.admin.20260320@ahi.local", fullName: "Probe System Administrator", usePatient: false, useCompany: false, departmentCode: null },
  { roleName: "Reception/Billing", email: "probe.reception.20260320@ahi.local", fullName: "Probe Reception Billing", usePatient: false, useCompany: false, departmentCode: null },
  { roleName: "Triage Nurse", email: "probe.triage.20260320@ahi.local", fullName: "Probe Triage Nurse", usePatient: false, useCompany: false, departmentCode: null },
  { roleName: "Department Staff", email: "probe.deptstaff.20260320@ahi.local", fullName: "Probe Department Staff", usePatient: false, useCompany: false, departmentCode: "LAB" },
  { roleName: "Physician", email: "probe.physician.20260320@ahi.local", fullName: "Probe Physician", usePatient: false, useCompany: false, departmentCode: null },
  { roleName: "Releasing Staff", email: "probe.releasing.20260320@ahi.local", fullName: "Probe Releasing Staff", usePatient: false, useCompany: false, departmentCode: null },
];

function toErrorObject(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? "unknown",
    message: error.message ?? "Unknown error",
  };
}

async function ensureCompany() {
  const { data: existing } = await supabase
    .from("company")
    .select("companyid")
    .eq("name", PROBE_COMPANY_NAME)
    .order("companyid", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.companyid) {
    return existing.companyid;
  }

  const { data: inserted, error } = await supabase
    .from("company")
    .insert({
      name: PROBE_COMPANY_NAME,
      address: "Probe Test Address",
      contactperson: "Probe Coordinator",
      contactnumber: "+63 900 000 0000",
      emailaddress: "probe.company@ahi.local",
      isactive: true,
    })
    .select("companyid")
    .single();

  if (error || !inserted?.companyid) {
    throw new Error(`Failed to create probe company: ${error?.message ?? "unknown"}`);
  }

  return inserted.companyid;
}

async function ensurePatient() {
  const governmentId = "PROBE-PATIENT-20260320";

  const { data: existing } = await supabase
    .from("patient")
    .select("patientid")
    .eq("governmentid", governmentId)
    .limit(1)
    .maybeSingle();

  if (existing?.patientid) {
    await supabase
      .from("patient")
      .update({
        fullname: "Probe Patient Role User",
        dateofbirth: "1994-04-18",
        sex: "Male",
        nationality: "Filipino",
        contactnumber: "+63 900 111 1111",
        emailaddress: "probe.patient.20260320@ahi.local",
        updatedat: new Date().toISOString(),
      })
      .eq("patientid", existing.patientid);

    return existing.patientid;
  }

  const { data: inserted, error } = await supabase
    .from("patient")
    .insert({
      fullname: "Probe Patient Role User",
      dateofbirth: "1994-04-18",
      sex: "Male",
      nationality: "Filipino",
      contactnumber: "+63 900 111 1111",
      emailaddress: "probe.patient.20260320@ahi.local",
      governmentid: governmentId,
      updatedat: new Date().toISOString(),
    })
    .select("patientid")
    .single();

  if (error || !inserted?.patientid) {
    throw new Error(`Failed to create probe patient: ${error?.message ?? "unknown"}`);
  }

  return inserted.patientid;
}

async function getDepartmentId(code) {
  const { data, error } = await supabase
    .from("department")
    .select("departmentid")
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (error || !data?.departmentid) {
    throw new Error(`Active department code ${code} not found: ${error?.message ?? "not found"}`);
  }

  return data.departmentid;
}

async function getRoleId(roleName) {
  const { data, error } = await supabase
    .from("role")
    .select("roleid")
    .eq("rolename", roleName)
    .order("roleid", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.roleid) {
    throw new Error(`Role "${roleName}" not found or inactive: ${error?.message ?? "not found"}`);
  }

  return data.roleid;
}

async function upsertAuthUser(email, fullName, departmentId) {
  const appMetadata = { provider: "email", providers: ["email"] };

  if (departmentId) {
    appMetadata.department_id = departmentId;
  }

  const userMetadata = {
    full_name: fullName,
    email,
    email_verified: true,
    phone_verified: false,
  };

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (existingUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: PROBE_PASSWORD,
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      },
    );

    if (updateError) {
      throw new Error(`Failed to update auth user ${email}: ${updateError.message}`);
    }

    return existingUser.id;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: PROBE_PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });

  if (createError || !created.user) {
    throw new Error(`Failed to create auth user ${email}: ${createError?.message ?? "unknown"}`);
  }

  return created.user.id;
}

async function upsertUserAccount(userId, roleId, companyId, patientId, email) {
  const { error } = await supabase
    .from("user_account")
    .upsert(
      {
        userid: userId,
        roleid: roleId,
        companyid: companyId,
        patientid: patientId,
        username: email,
        isactive: true,
        islocked: false,
        createdat: new Date().toISOString(),
      },
      { onConflict: "userid" },
    );

  if (error) {
    throw new Error(`Failed to upsert user_account for ${email}: ${error.message}`);
  }
}

async function runBootstrap() {
  const summary = {
    generatedAtUtc: new Date().toISOString(),
    results: [],
    passCount: 0,
    failCount: 0,
  };

  const companyId = await ensureCompany();
  const patientId = await ensurePatient();

  const departmentCache = {};

  for (const probe of PROBE_USERS) {
    try {
      const roleId = await getRoleId(probe.roleName);

      let departmentId = null;

      if (probe.departmentCode) {
        if (!departmentCache[probe.departmentCode]) {
          departmentCache[probe.departmentCode] = await getDepartmentId(
            probe.departmentCode,
          );
        }

        departmentId = departmentCache[probe.departmentCode];
      }

      const userId = await upsertAuthUser(
        probe.email,
        probe.fullName,
        departmentId,
      );

      await upsertUserAccount(
        userId,
        roleId,
        probe.useCompany ? companyId : null,
        probe.usePatient ? patientId : null,
        probe.email,
      );

      summary.passCount += 1;
      summary.results.push({
        probe: probe.roleName,
        email: probe.email,
        userId,
        ok: true,
      });
    } catch (error) {
      summary.failCount += 1;
      summary.results.push({
        probe: probe.roleName,
        email: probe.email,
        ok: false,
        error: toErrorObject(error),
      });
    }
  }

  summary.completedAtUtc = new Date().toISOString();
  return summary;
}

const summary = await runBootstrap();
console.log(JSON.stringify(summary, null, 2));

if (summary.failCount > 0) {
  process.exit(1);
}
