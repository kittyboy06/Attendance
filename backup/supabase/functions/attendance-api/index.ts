import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

// HMAC Key for signing Class Rep custom JWTs
const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET") || "default-attendance-system-jwt-secret-key-998877";
const encoder = new TextEncoder();
const keyBuf = encoder.encode(jwtSecret);
const cryptoKey = await crypto.subtle.importKey(
  "raw",
  keyBuf,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

console.log("Deno Env Keys:", Object.keys(Deno.env.toObject()));
console.log("SUPABASE_JWT_SECRET:", Deno.env.get("SUPABASE_JWT_SECRET") ? "EXISTS" : "MISSING");
console.log("JWT_SECRET:", Deno.env.get("JWT_SECRET") ? "EXISTS" : "MISSING");

async function generateRepToken(classId: string, className: string) {
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      role: "authenticated",
      user_role: "rep",
      class_id: classId,
      class_name: className,
      exp: getNumericDate(60 * 60 * 24 * 30), // Valid for 30 days
    },
    cryptoKey
  );
}

async function verifyRepToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, cryptoKey);
    if (payload.role === "rep" || payload.user_role === "rep") {
      return payload as { class_id: string; class_name: string };
    }
    return null;
  } catch (_err) {
    return null;
  }
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  // Initialize Supabase Client using service_role key to bypass RLS inside Edge Function API
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  try {
    // ==========================================
    // ROUTE: POST /auth/rep-login
    // ==========================================
    if (path.endsWith("/auth/rep-login") && req.method === "POST") {
      const { class_id, password } = await req.json();

      if (!class_id || !password) {
        return new Response(JSON.stringify({ error: "Missing class_id or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call database RPC to verify class shared password
      const { data, error } = await supabase.rpc("verify_rep_password", {
        p_class_id: class_id,
        p_password: password,
      });

      if (error || !data || data.length === 0 || !data[0].is_valid) {
        return new Response(JSON.stringify({ error: "Invalid class password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate custom JWT token for the Class Rep
      const token = await generateRepToken(class_id, data[0].class_name);

      return new Response(JSON.stringify({ token, class_name: data[0].class_name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /debug-env
    // ==========================================
    if (path.endsWith("/debug-env") && req.method === "POST") {
      const { passcode } = await req.json();
      if (passcode !== "CollegeAttendanceSystemSecureSeedPasscode2026") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      const env = Deno.env.toObject();
      let parsedSecrets = {};
      try {
        parsedSecrets = JSON.parse(env.SUPABASE_SECRET_KEYS || "{}");
      } catch (e) {
        parsedSecrets = { error: e.message };
      }
      
      const secretSummary = {};
      for (const [k, v] of Object.entries(parsedSecrets)) {
        secretSummary[k] = {
          length: typeof v === "string" ? v.length : 0,
          type: typeof v,
          valueSnippet: typeof v === "string" ? v.substring(0, 5) + "..." : "none"
        };
      }

      return new Response(
        JSON.stringify({
          keys: Object.keys(env),
          secretKeys: secretSummary,
          rawSecretsStringLength: env.SUPABASE_SECRET_KEYS ? env.SUPABASE_SECRET_KEYS.length : 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ==========================================
    // ROUTE: POST /auth/admin-login
    // ==========================================
    if (path.endsWith("/auth/admin-login") && req.method === "POST") {
      const { email, password } = await req.json();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Missing email or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query admins table
      const { data, error } = await supabase
        .from("admins")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Invalid admin credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify password via RPC
      const { data: isValid, error: verifyError } = await supabase.rpc("verify_admin_password", {
        p_admin_id: data.id,
        p_password: password,
      });

      if (verifyError || !isValid) {
        return new Response(JSON.stringify({ error: "Invalid admin credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate custom JWT token for Admin
      const token = await create(
        { alg: "HS256", typ: "JWT" },
        {
          role: "authenticated",
          user_role: "admin",
          email: data.email,
          exp: getNumericDate(60 * 60 * 24), // 24 hours
        },
        cryptoKey
      );

      return new Response(JSON.stringify({ token }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /auth/teacher-login
    // ==========================================
    if (path.endsWith("/auth/teacher-login") && req.method === "POST") {
      const { teacher_id, pin } = await req.json();

      if (!teacher_id || !pin) {
        return new Response(JSON.stringify({ error: "Missing teacher_id or pin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify Teacher PIN server-side via SQL RPC
      const { data: isValidPin, error: pinError } = await supabase.rpc("verify_teacher_pin", {
        p_teacher_id: teacher_id,
        p_pin: pin,
      });

      if (pinError || !isValidPin) {
        return new Response(JSON.stringify({ error: "Invalid teacher PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get teacher details
      const { data: teacher } = await supabase
        .from("teachers")
        .select("name, department")
        .eq("id", teacher_id)
        .single();

      // Generate custom JWT token for Teacher
      const token = await create(
        { alg: "HS256", typ: "JWT" },
        {
          role: "authenticated",
          user_role: "teacher",
          teacher_id: teacher_id,
          teacher_name: teacher?.name || "",
          department: teacher?.department || "",
          exp: getNumericDate(60 * 60 * 24), // 24 hours
        },
        cryptoKey
      );

      return new Response(JSON.stringify({ token, name: teacher?.name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /sessions/create-or-open
    // ==========================================
    if (path.endsWith("/sessions/create-or-open") && req.method === "POST") {
      const rep = await verifyRepToken(req.headers.get("Authorization"));
      if (!rep) {
        return new Response(JSON.stringify({ error: "Unauthorized Rep Access" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { timetable_slot_id, date } = await req.json();
      if (!timetable_slot_id || !date) {
        return new Response(JSON.stringify({ error: "Missing slot or date" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch timetable slot and verify class mapping
      const { data: slot, error: slotError } = await supabase
        .from("timetable_slots")
        .select("class_id, subject_id, teacher_id")
        .eq("id", timetable_slot_id)
        .single();

      if (slotError || !slot) {
        return new Response(JSON.stringify({ error: "Timetable slot not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (slot.class_id !== rep.class_id) {
        return new Response(JSON.stringify({ error: "Forbidden: Not your class slot" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if the date is a holiday
      const { data: holiday } = await supabase
        .from("holidays")
        .select("name")
        .eq("date", date)
        .maybeSingle();

      if (holiday) {
        return new Response(JSON.stringify({ error: `Cannot log attendance: today is a holiday (${holiday.name})` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dynamic session creation - Upsert session
      const { data: session, error: insertError } = await supabase
        .from("attendance_sessions")
        .insert({
          date,
          timetable_slot_id,
          status: "draft",
          subject_id: slot.subject_id,
          teacher_id: slot.teacher_id,
        })
        .select()
        .single();

      if (insertError) {
        // If unique constraint triggers, retrieve existing record
        if (insertError.code === "23505") {
          const { data: existingSession, error: fetchError } = await supabase
            .from("attendance_sessions")
            .select()
            .eq("date", date)
            .eq("timetable_slot_id", timetable_slot_id)
            .single();

          if (fetchError || !existingSession) {
            return new Response(JSON.stringify({ error: "Error fetching existing session" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify(existingSession), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /sessions/submit-attendance
    // ==========================================
    if (path.endsWith("/sessions/submit-attendance") && req.method === "POST") {
      const rep = await verifyRepToken(req.headers.get("Authorization"));
      if (!rep) {
        return new Response(JSON.stringify({ error: "Unauthorized Rep Access" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { session_id, records } = await req.json();
      if (!session_id || !records || !Array.isArray(records)) {
        return new Response(JSON.stringify({ error: "Missing session_id or records array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check session context and state
      const { data: session, error: sessError } = await supabase
        .from("attendance_sessions")
        .select("status, timetable_slots(class_id)")
        .eq("id", session_id)
        .single();

      if (sessError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure Rep is authorized for this session
      const classId = (session.timetable_slots as any)?.class_id;
      if (classId !== rep.class_id) {
        return new Response(JSON.stringify({ error: "Forbidden: Not your class session" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.status === "finalized") {
        return new Response(JSON.stringify({ error: "Cannot modify a finalized session" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter and map incoming records to insert
      // Fetch all student register numbers in this class for validation
      const { data: validStudents, error: studError } = await supabase
        .from("students")
        .select("register_number")
        .eq("class_id", rep.class_id);

      if (studError || !validStudents) {
        return new Response(JSON.stringify({ error: "Failed to validate class students" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const studentSet = new Set(validStudents.map((s) => s.register_number));
      const recordsToUpsert = records
        .filter((r) => studentSet.has(r.register_number))
        .map((r) => ({
          session_id,
          student_register_number: r.register_number,
          status: r.status,
        }));

      if (recordsToUpsert.length === 0) {
        return new Response(JSON.stringify({ error: "No valid student records provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Bulk upsert records
      const { error: upsertError } = await supabase
        .from("attendance_records")
        .upsert(recordsToUpsert, { onConflict: "session_id,student_register_number" });

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, count: recordsToUpsert.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /sessions/finalize
    // ==========================================
    if (path.endsWith("/sessions/finalize") && req.method === "POST") {
      const { session_id, teacher_id, pin } = await req.json();

      if (!session_id || !teacher_id || !pin) {
        return new Response(JSON.stringify({ error: "Missing session_id, teacher_id, or pin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify Teacher PIN server-side via SQL RPC
      const { data: isValidPin, error: pinError } = await supabase.rpc("verify_teacher_pin", {
        p_teacher_id: teacher_id,
        p_pin: pin,
      });

      if (pinError || !isValidPin) {
        return new Response(JSON.stringify({ error: "Invalid teacher PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get session & scheduled teacher
      const { data: session, error: sessError } = await supabase
        .from("attendance_sessions")
        .select("timetable_slot_id, status")
        .eq("id", session_id)
        .single();

      if (sessError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: slot, error: slotError } = await supabase
        .from("timetable_slots")
        .select("class_id, teacher_id")
        .eq("id", session.timetable_slot_id)
        .single();

      if (slotError || !slot) {
        return new Response(JSON.stringify({ error: "Timetable slot not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check scheduled teacher vs substitute teacher
      if (slot.teacher_id !== teacher_id) {
        // Substitute Flow: Verify teacher teaches in this class
        const { data: exists, error: checkError } = await supabase
          .from("timetable_slots")
          .select("id")
          .eq("class_id", slot.class_id)
          .eq("teacher_id", teacher_id)
          .limit(1);

        if (checkError || !exists || exists.length === 0) {
          return new Response(
            JSON.stringify({ error: "Substitute teacher is not associated with this class" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Finalize the session
      const { error: updateError } = await supabase
        .from("attendance_sessions")
        .update({
          status: "finalized",
          finalized_by_teacher_id: teacher_id,
        })
        .eq("id", session_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /sessions/unlock
    // ==========================================
    if (path.endsWith("/sessions/unlock") && req.method === "POST") {
      const { session_id, teacher_id, pin } = await req.json();

      if (!session_id || !teacher_id || !pin) {
        return new Response(JSON.stringify({ error: "Missing session_id, teacher_id, or pin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify PIN
      const { data: isValidPin, error: pinError } = await supabase.rpc("verify_teacher_pin", {
        p_teacher_id: teacher_id,
        p_pin: pin,
      });

      if (pinError || !isValidPin) {
        return new Response(JSON.stringify({ error: "Invalid PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify access to unlock (only scheduled or substitute who finalized it can unlock)
      const { data: session, error: sessError } = await supabase
        .from("attendance_sessions")
        .select("timetable_slot_id, finalized_by_teacher_id")
        .eq("id", session_id)
        .single();

      if (sessError || !session) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: slot, error: slotError } = await supabase
        .from("timetable_slots")
        .select("teacher_id")
        .eq("id", session.timetable_slot_id)
        .single();

      if (slotError || !slot) {
        return new Response(JSON.stringify({ error: "Timetable slot not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (slot.teacher_id !== teacher_id && session.finalized_by_teacher_id !== teacher_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized to unlock this session" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Revert session back to draft
      const { error: unlockError } = await supabase
        .from("attendance_sessions")
        .update({
          status: "draft",
          finalized_by_teacher_id: null,
        })
        .eq("id", session_id);

      if (unlockError) {
        return new Response(JSON.stringify({ error: unlockError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: POST /sessions/teacher-update-attendance
    // ==========================================
    if (path.endsWith("/sessions/teacher-update-attendance") && req.method === "POST") {
      const { session_id, teacher_id, pin, records } = await req.json();

      if (!session_id || !teacher_id || !pin || !records || !Array.isArray(records)) {
        return new Response(JSON.stringify({ error: "Missing session_id, teacher_id, pin, or records array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify Teacher PIN server-side via SQL RPC
      const { data: isValidPin, error: pinError } = await supabase.rpc("verify_teacher_pin", {
        p_teacher_id: teacher_id,
        p_pin: pin,
      });

      if (pinError || !isValidPin) {
        return new Response(JSON.stringify({ error: "Invalid teacher PIN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const recordsToUpsert = records.map((r) => ({
        session_id,
        student_register_number: r.student_register_number || r.register_number,
        status: r.status,
      }));

      const { error: upsertError } = await supabase
        .from("attendance_records")
        .upsert(recordsToUpsert, { onConflict: "session_id,student_register_number" });

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ROUTE: GET /student/dashboard
    // ==========================================
    if (path.endsWith("/student/dashboard") && req.method === "GET") {
      const regNo = url.searchParams.get("register_number");

      if (!regNo || regNo.length !== 16) {
        return new Response(JSON.stringify({ error: "A valid 16-digit register number is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the active academic year first
      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("start_date, end_date")
        .eq("is_active", true)
        .maybeSingle();

      // Fetch student summary (using view)
      const { data: summary, error: sumError } = await supabase
        .from("student_attendance_summary")
        .select("*")
        .eq("register_number", regNo)
        .single();

      if (sumError || !summary) {
        return new Response(JSON.stringify({ error: "Student not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch dynamic record history (finalized sessions with status detail)
      const { data: history, error: histError } = await supabase
        .from("attendance_records")
        .select(`
          status,
          attendance_sessions (
            date,
            subjects (code, name),
            teachers:teachers!teacher_id (name),
            timetable_slots (
              timetable_periods (
                period_number,
                name,
                start_time,
                end_time
              )
            )
          )
        `)
        .eq("student_register_number", regNo)
        .order("created_at", { ascending: false });

      if (histError) {
        return new Response(JSON.stringify({ error: histError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format response list and filter by active academic year
      const formattedHistory = history
        .filter((h) => {
          const s = h.attendance_sessions as any;
          if (!s?.date) return false;
          if (activeYear) {
            return s.date >= activeYear.start_date && s.date <= activeYear.end_date;
          }
          return true;
        })
        .map((h) => {
          const s = h.attendance_sessions as any;
          const tp = s.timetable_slots?.timetable_periods;
          const periodStr = tp 
            ? `${tp.name} (${tp.start_time.substring(0, 5)} - ${tp.end_time.substring(0, 5)})`
            : "Unknown Period";
          return {
            date: s.date,
            period: periodStr,
            subject_code: s.subjects?.code,
            subject_name: s.subjects?.name,
            teacher_name: s.teachers?.name,
            status: h.status,
          };
        });

      return new Response(
        JSON.stringify({
          student_name: summary.student_name,
          class_name: summary.class_name,
          summary: {
            attended: summary.attended_count,
            total: summary.total_finalized_count,
            percentage: summary.attendance_percentage,
          },
          history: formattedHistory,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default 404 Route Not Found
    return new Response(JSON.stringify({ error: "Route not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
