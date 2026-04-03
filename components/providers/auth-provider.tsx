"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isValidPhilippineMobile,
  normalizePhilippineMobileForStorage,
} from "@/lib/phone";
import { buildGovernmentIdForStorage } from "@/lib/government-id";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface SignupPayload {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  email: string;
  password: string;
  contactNumber: string;
  nationality: string;
  governmentIdType: string;
  governmentId: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface SignupResult extends AuthResult {
  requiresEmailConfirmation?: boolean;
}

interface AccountSetupResult extends AuthResult {
  completedFromPending?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (payload: SignupPayload) => Promise<SignupResult>;
  retryAccountSetup: () => Promise<AuthResult>;
  resendSignupConfirmation: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeOptionalValue(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const LAST_ACTIVE_KEY = "ahi_last_active_time";

function getEmailRedirectTo() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/patient/sign-in?confirmed=1`;
}

function getPasswordResetRedirectTo() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/patient/update-password`;
}

function formatLoginError(message: string) {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  return message;
}

function formatProfileSetupError(message: string) {
  if (message.includes("create_patient_profile")) {
    return "Your login account was created, but the patient profile setup function is not available yet. Contact support or try again after backend setup is complete.";
  }

  return `Your login account was created, but patient profile setup failed: ${message}`;
}

function formatPendingSignupError(message: string) {
  if (message.toLowerCase().includes("government id")) {
    return message;
  }

  return `Your login account was created, but we could not stage your profile details for completion after email confirmation: ${message}`;
}

function formatProfileCompletionError(message: string) {
  if (message.toLowerCase().includes("no pending signup details")) {
    return "Your email is confirmed, but we could not complete your patient profile automatically. Please contact support to finish setup.";
  }

  return formatProfileSetupError(message);
}

function mapUser(user: SupabaseUser | null): AuthUser | null {
  if (!user?.email) {
    return null;
  }

  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  return {
    id: user.id,
    email: user.email,
    name: fullName || user.email.split("@")[0],
  };
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SupabaseUser | null;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [user, setUser] = useState<AuthUser | null>(() => mapUser(initialUser));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUser(mapUser(currentUser));
      setIsLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUser(mapUser(session?.user ?? null));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const logoutAndRedirect = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [supabase]);

  const logoutAndRedirectRef = useRef(logoutAndRedirect);
  logoutAndRedirectRef.current = logoutAndRedirect;

  useEffect(() => {
    if (!user) {
      return;
    }

    function touchActivity() {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    }

    touchActivity();

    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "touchstart"];

    for (const event of events) {
      window.addEventListener(event, touchActivity, { passive: true });
    }

    const intervalId = setInterval(() => {
      const raw = localStorage.getItem(LAST_ACTIVE_KEY);
      const lastActive = raw ? Number(raw) : Date.now();

      if (Date.now() - lastActive >= SESSION_TIMEOUT_MS) {
        void logoutAndRedirectRef.current();
      }
    }, 30_000);

    function handleStorageChange(event: StorageEvent) {
      if (event.key !== LAST_ACTIVE_KEY) {
        return;
      }

      const lastActive = event.newValue ? Number(event.newValue) : Date.now();

      if (Date.now() - lastActive >= SESSION_TIMEOUT_MS) {
        void logoutAndRedirectRef.current();
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, touchActivity);
      }

      clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user]);

  async function logAuthAuditEvent(
    actionType: string,
    {
      entityId,
      details,
      username,
    }: {
      entityId?: string;
      details?: string;
      username?: string;
    } = {}
  ) {
    const { error } = await supabase.rpc("log_auth_audit_event", {
      p_actiontype: actionType,
      p_entityid: entityId ?? null,
      p_details: details ?? null,
      p_username: username ?? null,
    });

    if (error) {
      console.warn(`Auth audit log write failed for ${actionType}: ${error.message}`);
    }
  }

  async function ensureUserAccountAfterLogin(
    userId: string
  ): Promise<AccountSetupResult> {
    const { data: account, error: accountError } = await supabase
      .from("user_account")
      .select("userid")
      .eq("userid", userId)
      .maybeSingle();

    if (accountError) {
      return {
        success: false,
        error: `Unable to verify your account profile: ${accountError.message}`,
      };
    }

    if (account) {
      return { success: true, completedFromPending: false };
    }

    const { error: completionError } = await supabase.rpc(
      "complete_patient_profile_from_pending"
    );

    if (completionError) {
      return {
        success: false,
        error: formatProfileCompletionError(completionError.message),
      };
    }

    return { success: true, completedFromPending: true };
  }

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      await logAuthAuditEvent("SIGNIN_FAILURE", {
        username: normalizedEmail,
        details: `Password sign-in failed: ${formatLoginError(error.message)}`,
      });

      return { success: false, error: formatLoginError(error.message) };
    }

    if (!data.user) {
      await logAuthAuditEvent("SIGNIN_FAILURE", {
        username: normalizedEmail,
        details: "Sign-in returned no user payload.",
      });

      return {
        success: false,
        error: "Sign-in succeeded but user details were not returned.",
      };
    }

    await logAuthAuditEvent("SIGNIN_SUCCESS", {
      entityId: data.user.id,
      username: normalizedEmail,
      details: "Password sign-in succeeded.",
    });

    const accountResult = await ensureUserAccountAfterLogin(data.user.id);

    if (accountResult.success && accountResult.completedFromPending) {
      await logAuthAuditEvent("EMAIL_CONFIRMED", {
        entityId: data.user.id,
        username: normalizedEmail,
        details:
          "Confirmed account completed first post-confirmation authenticated setup.",
      });

      await logAuthAuditEvent("PROFILE_COMPLETED", {
        entityId: data.user.id,
        username: normalizedEmail,
        details: "Patient profile created from pending signup after sign-in.",
      });
    }

    if (!accountResult.success) {
      setUser(mapUser(data.user));

      return {
        success: true,
        error: accountResult.error,
      };
    }

    setUser(mapUser(data.user));

    return { success: true };
  };

  const signup = async ({
    fullName,
    dateOfBirth,
    sex,
    email,
    password,
    contactNumber,
    nationality,
    governmentIdType,
    governmentId,
  }: SignupPayload): Promise<SignupResult> => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedFullName = fullName.trim();
    const normalizedSex = sex.trim();
    const normalizedNationality = normalizeOptionalValue(nationality);

    if (normalizeOptionalValue(contactNumber) === null) {
      return {
        success: false,
        error: "Contact number is required.",
      };
    }

    if (!isValidPhilippineMobile(contactNumber)) {
      return {
        success: false,
        error:
          "Please enter a valid Philippine mobile number (e.g., +63 912 345 6789).",
      };
    }

    if (normalizeOptionalValue(governmentIdType) === null) {
      return {
        success: false,
        error: "ID type is required.",
      };
    }

    if (normalizeOptionalValue(governmentId) === null) {
      return {
        success: false,
        error: "ID number is required.",
      };
    }

    const normalizedContactNumber =
      normalizePhilippineMobileForStorage(contactNumber);
    const normalizedGovernmentId = buildGovernmentIdForStorage(
      governmentIdType,
      governmentId
    );

    if (!normalizedGovernmentId) {
      return {
        success: false,
        error: "Please provide a valid ID type and ID number.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedFullName,
        },
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session?.user) {
      const { error: profileError } = await supabase.rpc("create_patient_profile", {
        p_fullname: normalizedFullName,
        p_dateofbirth: dateOfBirth,
        p_sex: normalizedSex,
        p_nationality: normalizedNationality,
        p_contactnumber: normalizedContactNumber,
        p_governmentid: normalizedGovernmentId,
      });

      if (profileError) {
        await supabase.auth.signOut();
        setUser(null);

        return {
          success: false,
          error: formatProfileSetupError(profileError.message),
        };
      }

      await logAuthAuditEvent("PROFILE_COMPLETED", {
        entityId: data.session.user.id,
        username: normalizedEmail,
        details: "Patient profile created during immediate authenticated signup.",
      });

      setUser(mapUser(data.session.user));

      return { success: true };
    }

    const { error: stagedProfileError } = await supabase.rpc(
      "stage_patient_signup",
      {
        p_email: normalizedEmail,
        p_fullname: normalizedFullName,
        p_dateofbirth: dateOfBirth,
        p_sex: normalizedSex,
        p_nationality: normalizedNationality,
        p_contactnumber: normalizedContactNumber,
        p_governmentid: normalizedGovernmentId,
      }
    );

    if (stagedProfileError) {
      await supabase.auth.signOut();
      setUser(null);

      return {
        success: false,
        error: formatPendingSignupError(stagedProfileError.message),
      };
    }

    await logAuthAuditEvent("SIGNUP_STAGED", {
      username: normalizedEmail,
      details:
        "Signup details staged pending email confirmation before profile completion.",
    });

    return {
      success: true,
      requiresEmailConfirmation: true,
    };
  };

  const retryAccountSetup = async (): Promise<AuthResult> => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "You must be signed in to retry setup." };
    }

    const result = await ensureUserAccountAfterLogin(currentUser.id);

    if (!result.success) {
      return result;
    }

    if (result.completedFromPending) {
      await logAuthAuditEvent("EMAIL_CONFIRMED", {
        entityId: currentUser.id,
        username: normalizeEmail(currentUser.email ?? ""),
        details:
          "Confirmed account completed setup via manual retry in authenticated session.",
      });

      await logAuthAuditEvent("PROFILE_COMPLETED", {
        entityId: currentUser.id,
        username: normalizeEmail(currentUser.email ?? ""),
        details: "Patient profile created from pending signup via retry setup.",
      });
    }

    setUser(mapUser(currentUser));

    return { success: true };
  };

  const resendSignupConfirmation = async (email: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuthAuditEvent("SIGNUP_CONFIRM_RESEND", {
      username: normalizedEmail,
      details: "User requested signup confirmation email resend.",
    });

    return { success: true };
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: getPasswordResetRedirectTo() }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuthAuditEvent("PASSWORD_RESET_REQUEST", {
      username: normalizedEmail,
      details: "Password reset email requested.",
    });

    return { success: true };
  };

  const logout = async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    setUser(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem(LAST_ACTIVE_KEY);
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        retryAccountSetup,
        resendSignupConfirmation,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
