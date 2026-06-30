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
  if (!classes || classes.length === 0) {
    console.log("No classes found");
    return;
  }
  const classId = classes[0].id;
  const className = classes[0].name;
  console.log("Testing class:", className, classId);

  const { data, error } = await supabase.rpc("verify_rep_password", {
    p_class_id: classId,
    p_password: "1111"
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Verify Result:", data);
  }
}

main();
