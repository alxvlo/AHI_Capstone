/**
 * Realtime Subscriptions Integration Test — SCRUM-30
 *
 * Validates that Supabase Realtime delivers postgres_changes events to
 * subscribers respecting filters and RLS, against a real Supabase project.
 *
 * Run with:
 *   npm run test:integration -- realtime-subscriptions
 *   (requires .env.local with Supabase credentials and AHI_PROBE_PASSWORD)
 *
 * NEVER point this at the production Supabase project.
 */

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PROBE_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

const CREDENTIALS_PRESENT =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  Boolean(SERVICE_ROLE_KEY) &&
  Boolean(PROBE_PASSWORD);

const describeIfCreds = CREDENTIALS_PRESENT ? describe : describe.skip;

function makeServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function makeAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function waitForChannelSubscribe(channel: RealtimeChannel) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("subscribe timeout")),
      5000
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

describeIfCreds("Realtime subscriptions (SCRUM-30)", () => {
  let actor: SupabaseClient;

  beforeAll(() => {
    actor = makeServiceClient();
  });

  afterAll(async () => {
    await actor.auth.signOut();
  });

  it("delivers peme_case INSERT events to subscribed service clients", async () => {
    const subscriber = makeServiceClient();
    const received: unknown[] = [];

    const channel = subscriber
      .channel("test:peme_case:insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peme_case" },
        (payload) => received.push(payload)
      );
    await waitForChannelSubscribe(channel);

    // Fetch minimal FK refs from seeded data
    const { data: patient } = await actor
      .from("patient")
      .select("patientid")
      .limit(1)
      .single();
    const { data: pkg } = await actor
      .from("package")
      .select("packageid")
      .limit(1)
      .single();
    const { data: status } = await actor
      .from("status_code")
      .select("statuscodeid")
      .eq("code", "REGISTERED")
      .single();

    expect(patient).not.toBeNull();
    expect(pkg).not.toBeNull();
    expect(status).not.toBeNull();

    const { error: insertErr } = await actor.from("peme_case").insert({
      casenumber: `RT-${Date.now()}`,
      patientid: patient!.patientid,
      packageid: pkg!.packageid,
      casestatuscodeid: status!.statuscodeid,
    });
    expect(insertErr).toBeNull();

    await new Promise((r) => setTimeout(r, 3000));
    expect(received.length).toBeGreaterThan(0);

    await subscriber.removeChannel(channel);
  }, 15000);

  it("filters department_visit UPDATE events by department filter", async () => {
    const subscriber = makeServiceClient();
    const received: unknown[] = [];

    // Find a department that has at least one visit
    const { data: visit } = await actor
      .from("department_visit")
      .select("visitid, departmentid")
      .limit(1)
      .single();
    expect(visit).not.toBeNull();
    const targetDeptId = visit!.departmentid;

    const channel = subscriber
      .channel("test:dept_visit:update")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "department_visit",
          filter: `departmentid=eq.${targetDeptId}`,
        },
        (payload) => received.push(payload)
      );
    await waitForChannelSubscribe(channel);

    // Update the target visit
    const { error: updateErr } = await actor
      .from("department_visit")
      .update({ remarks: `rt-filter-test-${Date.now()}` })
      .eq("visitid", visit!.visitid);
    expect(updateErr).toBeNull();

    await new Promise((r) => setTimeout(r, 3000));
    expect(received.length).toBeGreaterThanOrEqual(1);
    for (const p of received as Array<{ new?: { departmentid?: number } }>) {
      expect(p.new?.departmentid).toBe(targetDeptId);
    }

    await subscriber.removeChannel(channel);
  }, 15000);

  it("delivers all events under 5 concurrent updates", async () => {
    const subscriber = makeServiceClient();
    const received: unknown[] = [];

    const { data: visits } = await actor
      .from("department_visit")
      .select("visitid, departmentid")
      .limit(5);
    expect(visits?.length).toBeGreaterThanOrEqual(1);

    const targetDeptId = visits![0].departmentid;

    const channel = subscriber
      .channel("test:dept_visit:concurrent")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "department_visit",
          filter: `departmentid=eq.${targetDeptId}`,
        },
        (payload) => received.push(payload)
      );
    await waitForChannelSubscribe(channel);

    const targetVisits = visits!.filter(
      (v) => v.departmentid === targetDeptId
    );
    await Promise.all(
      targetVisits.map((v) =>
        actor
          .from("department_visit")
          .update({ remarks: `rt-load-${Date.now()}` })
          .eq("visitid", v.visitid)
      )
    );

    await new Promise((r) => setTimeout(r, 5000));
    expect(received.length).toBeGreaterThanOrEqual(targetVisits.length);

    await subscriber.removeChannel(channel);
  }, 20000);

  it("does not deliver peme_case events to a patient subscriber for other patients' cases", async () => {
    const patientClient = makeAnonClient();
    const { error: signInErr } = await patientClient.auth.signInWithPassword({
      email: "probe.patient.20260320@ahi.local",
      password: PROBE_PASSWORD,
    });
    expect(signInErr).toBeNull();

    const received: unknown[] = [];
    const channel = patientClient
      .channel("test:peme_case:rls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peme_case" },
        (payload) => received.push(payload)
      );
    await waitForChannelSubscribe(channel);

    // Insert a case for a different patient using the service client (bypasses RLS)
    const { data: otherPatient } = await actor
      .from("patient")
      .select("patientid")
      .neq("patientid", "") // fetch any patient — RLS will block the probe user from seeing it
      .limit(1)
      .single();
    const { data: pkg } = await actor
      .from("package")
      .select("packageid")
      .limit(1)
      .single();
    const { data: status } = await actor
      .from("status_code")
      .select("statuscodeid")
      .eq("code", "REGISTERED")
      .single();

    if (otherPatient && pkg && status) {
      await actor.from("peme_case").insert({
        casenumber: `RT-RLS-${Date.now()}`,
        patientid: otherPatient.patientid,
        packageid: pkg.packageid,
        casestatuscodeid: status.statuscodeid,
      });
    }

    await new Promise((r) => setTimeout(r, 3000));
    // RLS prevents the anon (patient) client from receiving events for cases they cannot SELECT
    expect(received.length).toBe(0);

    await patientClient.removeChannel(channel);
    await patientClient.auth.signOut();
  }, 15000);
});
