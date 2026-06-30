import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envText = fs.readFileSync(".env", "utf-8");
const env = {};
envText.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const parts = trimmed.split("=");
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
});

const supabaseUrl = env["VITE_SUPABASE_URL"];
const supabaseKey = env["VITE_SUPABASE_ANON_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: classes } = await supabase.from("classes").select("id, name").limit(1);
  const classId = classes[0].id;
  const className = classes[0].name;

  const response = await fetch(`${env["VITE_API_URL"]}/auth/rep-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ class_id: classId, password: "1111" }),
  });
  const authData = await response.json();
  const token = authData.token;

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
  console.log("Token Payload:", payload);

  // Instantiate client with global x-custom-auth-token header
  const authenticatedClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-custom-auth-token': token
      }
    }
  });

  // Query get_custom_jwt_claims
  const { data: jwtCheck, error: jwtErr } = await authenticatedClient.rpc("execute_sql_query", {
    query_text: "SELECT public.get_custom_jwt_claims() as claims",
    passcode: "CollegeAttendanceSystemSecureSeedPasscode2026"
  });

  if (jwtErr) {
    console.error("JWT check error:", jwtErr);
  } else {
    console.log("PostgreSQL auth check:", JSON.stringify(jwtCheck, null, 2));
  }
}

main();
