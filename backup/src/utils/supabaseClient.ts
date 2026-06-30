import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clear expired session from localStorage BEFORE creating client
try {
  const keys = Object.keys(localStorage);
  const authKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
  if (authKey) {
    const tokenData = JSON.parse(localStorage.getItem(authKey) || "{}");
    if (tokenData && tokenData.expires_at) {
      const expiresAt = tokenData.expires_at * 1000;
      if (Date.now() > expiresAt - 60000) { // 1 min buffer
        localStorage.removeItem(authKey);
        sessionStorage.removeItem("admin_auth");
      }
    }
  }
} catch (e) {
  console.error("Error clearing expired session from localStorage:", e);
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers || {});
        let token = "";

        // Check rep token from localStorage
        const repToken = localStorage.getItem("rep_token");
        if (repToken) {
          token = repToken;
        }

        // Check admin token from sessionStorage
        const adminToken = sessionStorage.getItem("admin_token");
        if (adminToken) {
          token = adminToken;
        }

        // Check if there is an auth token in localStorage (set by setSession)
        if (!token) {
          try {
            const keys = Object.keys(localStorage);
            const authKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
            if (authKey) {
              const tokenData = JSON.parse(localStorage.getItem(authKey) || "{}");
              if (tokenData && tokenData.currentSession && tokenData.currentSession.access_token) {
                token = tokenData.currentSession.access_token;
              } else if (tokenData && tokenData.access_token) {
                token = tokenData.access_token;
              }
            }
          } catch (_) {}
        }

        if (token) {
          // Pass the custom token inside the custom header
          headers.set("x-custom-auth-token", token);
          
          // Force authorization header to be the valid anon key (Bearer anonKey)
          // to bypass PostgREST's PGRST301 decode error.
          headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
          headers.set("apikey", supabaseAnonKey);
        }

        options.headers = headers;
        return fetch(url, options);
      }
    }
  }
);

