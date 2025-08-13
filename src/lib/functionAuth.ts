// Centralized headers for Supabase Edge Functions invocation
// Note: Using the public anon key is safe to embed in frontend code

export const SUPABASE_ANON_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U";

export type FunctionAuthOptions = {
  sub?: string | null;
  email?: string | null;
};

export const buildFunctionHeaders = (opts?: FunctionAuthOptions) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SUPABASE_ANON_JWT}`,
    apikey: SUPABASE_ANON_JWT,
    "Content-Type": "application/json",
  };

  // No external identity headers; internal Supabase auth only
  return headers;
};
