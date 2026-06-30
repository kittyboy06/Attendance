import React, { useState, useEffect } from "react";
import { ArrowLeft, Key, Users, Calendar, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { saveQueuedSubmission, syncOfflineSubmissions, getQueuedSubmissions } from "../utils/offlineQueue";
import { supabase as client } from "../utils/supabaseClient";

interface RepDashboardProps {
  onBack: () => void;
}

interface Student {
  register_number: string;
  name: string;
}

interface TimetableSlot {
  id: string;
  day: string;
  period_id: string;
  period_number: number;
  period_name: string;
  period_start: string;
  period_end: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
}

export default function RepDashboard({ onBack }: RepDashboardProps) {
  // Login State
  const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("rep_token") || "");
  const [className, setClassName] = useState(localStorage.getItem("rep_class_name") || "");
  const [classId, setClassId] = useState(localStorage.getItem("rep_class_id") || "");

  // Portal State
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late">>({});
  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (token) {
        const res = await syncOfflineSubmissions(token);
        if (res.syncedCount > 0) {
          setSuccess(`Synced ${res.syncedCount} offline submissions!`);
          setTimeout(() => setSuccess(""), 4000);
        }
        updateOfflineCount();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    updateOfflineCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [token]);

  const updateOfflineCount = async () => {
    const q = await getQueuedSubmissions();
    setOfflineCount(q.length);
  };

  // Fetch classes on mount (for login dropdown)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        // Query classes table directly using Supabase client
        const { data } = await client.from("classes").select("id, name").order("name");
        if (data) setClassesList(data);
      } catch (_err) {
        // Fallback static classes if loading fails
        setClassesList([
          { id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", name: "CS-A" },
          { id: "b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e", name: "CS-B" }
        ]);
      }
    };
    fetchClasses();
  }, []);

  // Fetch timetable and students when logged in
  useEffect(() => {
    if (!token || !classId) return;

    const loadPortalData = async () => {
      setLoading(true);
      setError("");

      try {


        // Fetch students
        const { data: studData } = await client
          .from("students")
          .select("register_number, name")
          .eq("class_id", classId)
          .order("name");

        if (studData) setStudents(studData);

        // Fetch today's day name (Deno maps standard Sunday, Monday... Saturday)
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDay = days[new Date().getDay()];
        
        // Fetch timetable slots joined with subjects, teachers, and periods
        const { data: slotsData } = await client
          .from("timetable_slots")
          .select(`
            id, day, period_id,
            subjects (code, name),
            teachers (name),
            timetable_periods (*)
          `)
          .eq("class_id", classId)
          .eq("day", todayDay === "Sunday" ? "Monday" : todayDay); // fallback to Monday on Sundays for testing

        if (slotsData) {
          const formattedSlots: TimetableSlot[] = slotsData
            .filter((s: any) => s.timetable_periods?.is_academic_period !== false) // hide breaks and lunch
            .map((s: any) => ({
              id: s.id,
              day: s.day,
              period_id: s.period_id,
              period_number: s.timetable_periods?.period_number || 0,
              period_name: s.timetable_periods?.name || "Unknown",
              period_start: s.timetable_periods?.start_time || "",
              period_end: s.timetable_periods?.end_time || "",
              subject_name: s.subjects?.name || "No Subject",
              subject_code: s.subjects?.code || "N/A",
              teacher_name: s.teachers?.name || "No Teacher",
            }));
          // Sort by period_number to keep them chronological
          formattedSlots.sort((a, b) => a.period_number - b.period_number);
          setTimetable(formattedSlots);
        }
      } catch (_err) {
        setError("Failed to load class configuration details");
      } finally {
        setLoading(false);
      }
    };

    loadPortalData();
  }, [token, classId]);

  // Restore Rep session on mount
  useEffect(() => {
    const initSession = async () => {
      const savedToken = localStorage.getItem("rep_token");
      if (savedToken) {
        await client.auth.setSession({ access_token: savedToken, refresh_token: "" });
      }
    };
    initSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !password) {
      setError("Please select a class and enter the password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/rep-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ class_id: selectedClassId, password }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        await client.auth.setSession({ access_token: data.token, refresh_token: "" });
        setToken(data.token);
        setClassName(data.class_name);
        setClassId(selectedClassId);
        localStorage.setItem("rep_token", data.token);
        localStorage.setItem("rep_class_name", data.class_name);
        localStorage.setItem("rep_class_id", selectedClassId);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (_err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setToken("");
    setClassName("");
    setClassId("");
    setTimetable([]);
    setStudents([]);
    setSelectedSlotId("");
    setSelectedSlot(null);
    setAttendance({});
    setSessionId("");
    localStorage.removeItem("rep_token");
    localStorage.removeItem("rep_class_name");
    localStorage.removeItem("rep_class_id");
    await client.auth.signOut();
  };

  const handleSelectSlot = async (slot: TimetableSlot) => {
    setSelectedSlotId(slot.id);
    setSelectedSlot(slot);
    setSessionId("");
    setSessionStatus("");
    setError("");
    setSuccess("");

    // Initialize default attendance as all present
    const initialAttendance: Record<string, "present" | "absent" | "late"> = {};
    students.forEach((s) => {
      initialAttendance[s.register_number] = "present";
    });
    setAttendance(initialAttendance);

    if (!isOnline) {
      setSuccess("Offline mode: You can take attendance and save it locally.");
      setSessionStatus("draft");
      return;
    }

    setLoading(true);
    try {
      // Create or Open session from API
      const todayISO = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/create-or-open`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ timetable_slot_id: slot.id, date: todayISO }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSessionId(data.id);
        setSessionStatus(data.status);
        
        // Fetch existing attendance records if any

        const { data: recs } = await client
          .from("attendance_records")
          .select("student_register_number, status")
          .eq("session_id", data.id);

        if (recs && recs.length > 0) {
          const loadedAttendance = { ...initialAttendance };
          recs.forEach((r: any) => {
            loadedAttendance[r.student_register_number] = r.status;
          });
          setAttendance(loadedAttendance);
        }
      } else {
        setError(data.error || "Failed to initialize attendance session");
      }
    } catch (_err) {
      setError("Failed to contact API server");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = (registerNumber: string) => {
    if (sessionStatus === "finalized") return; // cannot edit finalized

    setAttendance((prev) => {
      const current = prev[registerNumber];
      let next: "present" | "absent" | "late" = "present";
      if (current === "present") next = "absent";
      else if (current === "absent") next = "late";
      return { ...prev, [registerNumber]: next };
    });
  };

  const getStatusStyle = (status: "present" | "absent" | "late") => {
    if (status === "present") return "bg-teal-accent/15 border-teal-accent/30 text-teal-accent";
    if (status === "absent") return "bg-crimson-alert/15 border-crimson-alert/30 text-crimson-alert";
    return "bg-amber-600/15 border-amber-600/30 text-amber-600";
  };

  const handleSubmit = async () => {
    if (!selectedSlotId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const records = Object.entries(attendance).map(([reg, status]) => ({
      register_number: reg,
      status,
    }));

    if (!isOnline) {
      // Save locally to IndexedDB queue
      await saveQueuedSubmission(selectedSlotId, records); // use slot ID as fallback session ID offline
      setSuccess("Submission saved locally! It will sync once internet is restored.");
      updateOfflineCount();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/submit-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId, records }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSuccess("Attendance submitted successfully as draft!");
      } else {
        setError(data.error || "Failed to submit attendance");
      }
    } catch (_err) {
      setError("Network sync failed. Saved draft to offline queue.");
      await saveQueuedSubmission(sessionId || selectedSlotId, records);
      updateOfflineCount();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto min-h-[85vh] flex flex-col justify-start py-8 px-4">
      {/* Network & Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-body"
        >
          <ArrowLeft size={16} className="mr-2" />
          Portals
        </button>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[10px] text-teal-accent font-mono uppercase tracking-wider bg-teal-accent/10 px-2 py-0.5 rounded">
              <Wifi size={10} /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-crimson-alert font-mono uppercase tracking-wider bg-crimson-alert/10 px-2 py-0.5 rounded">
              <WifiOff size={10} /> Offline
            </span>
          )}
          {offlineCount > 0 && (
            <span className="text-[10px] bg-amber-600 text-canvas font-mono px-2 py-0.5 rounded">
              {offlineCount} Pending Sync
            </span>
          )}
        </div>
      </div>

      {!token ? (
        /* Rep Login */
        <div className="glass-panel rounded-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-teal-accent/10 rounded-xl flex items-center justify-center text-teal-accent mb-3">
              <Key size={24} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-1 text-center">Department Representative Portal</h1>
            <p className="text-text-muted text-sm text-center">
              Select your department and enter your department security credentials
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1.5">
                Department / Section
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-canvas border border-zinc-800 rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-teal-accent font-body"
              >
                <option value="">Select a Department</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1.5">
                Department Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-canvas border border-zinc-800 rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-teal-accent tracking-widest"
              />
            </div>

            {error && <p className="text-crimson-alert text-xs font-body text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3 rounded-xl transition-all active:translate-y-[1px] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Access Rep Portal"}
            </button>
          </form>
        </div>
      ) : (
        /* Rep Portal Dashboard */
        <div className="flex flex-col gap-6">
          {/* Header Card */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="font-mono text-xs text-teal-accent font-semibold tracking-wider">LOGGED IN</span>
              <h2 className="font-display font-bold text-2xl text-text-primary leading-tight mt-0.5">
                {className} Representative
              </h2>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-text-muted hover:text-crimson-alert border border-zinc-800 hover:border-crimson-alert bg-zinc-950 px-4 py-2 rounded-xl transition-colors font-body"
            >
              Log Out
            </button>
          </div>

          {/* Timetable slots */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-teal-accent" />
              Today's Scheduled Periods
            </h3>

            {timetable.length === 0 ? (
              <p className="text-text-muted text-sm font-body">No schedules configured for today</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-thin">
                {timetable.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSelectSlot(slot)}
                    className={`flex-shrink-0 flex flex-col p-4 rounded-xl border text-left min-w-[150px] transition-all ${
                      selectedSlotId === slot.id
                        ? "bg-teal-accent/10 border-teal-accent text-text-primary"
                        : "bg-zinc-900/50 border-zinc-800/40 text-text-muted hover:border-zinc-700"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-teal-accent mb-0.5">
                      {slot.period_name}
                    </span>
                    <span className="font-mono text-[9px] text-text-muted mb-1.5">
                      {slot.period_start.substring(0, 5)} - {slot.period_end.substring(0, 5)}
                    </span>
                    <span className="font-body font-bold text-sm text-text-primary leading-tight mb-1">
                      {slot.subject_code}
                    </span>
                    <span className="font-body text-xs leading-none truncate max-w-[120px] mb-2">
                      {slot.subject_name}
                    </span>
                    <span className="font-body text-[10px] opacity-75">{slot.teacher_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attendance sheet */}
          {selectedSlot && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-zinc-800/50">
                <div>
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <Users size={18} className="text-teal-accent" />
                    Attendance Sheet
                  </h3>
                  <p className="text-xs text-text-muted font-body mt-0.5">
                    {selectedSlot.period_name} ({selectedSlot.period_start.substring(0, 5)} - {selectedSlot.period_end.substring(0, 5)}) — {selectedSlot.subject_name} ({selectedSlot.teacher_name})
                  </p>
                </div>
                
                {sessionStatus === "finalized" && (
                  <span className="text-xs font-semibold bg-teal-accent/15 text-teal-accent px-3 py-1 rounded-full font-body border border-teal-accent/30">
                    Finalized
                  </span>
                )}
              </div>
              
              {/* Summary Cards */}
              {students.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-body">Total Students</p>
                    <p className="text-lg font-bold font-display text-text-primary mt-1">{students.length}</p>
                  </div>
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-body">Present</p>
                    <p className="text-lg font-bold font-display text-teal-accent mt-1">
                      {students.filter(s => (attendance[s.register_number] || 'present') === 'present' || (attendance[s.register_number] || 'present') === 'late').length}
                    </p>
                  </div>
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-body">Absent</p>
                    <p className="text-lg font-bold font-display text-crimson-alert mt-1">
                      {students.filter(s => (attendance[s.register_number] || 'present') === 'absent').length}
                    </p>
                  </div>
                </div>
              )}

              {students.length === 0 ? (
                <p className="text-text-muted text-sm font-body">No students enrolled in this department</p>
              ) : (
                <div className="flex flex-col gap-2 mb-6 max-h-[350px] overflow-y-auto pr-1">
                  {students.map((student) => {
                    const status = attendance[student.register_number] || "present";
                    return (
                      <div
                        key={student.register_number}
                        onClick={() => toggleStudentStatus(student.register_number)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${getStatusStyle(
                          status
                        )}`}
                      >
                        <div>
                          <p className="font-body font-semibold text-sm text-text-primary">{student.name}</p>
                          <p className="font-mono text-[10px] text-text-muted">{student.register_number}</p>
                        </div>
                        <span className="text-xs font-bold uppercase font-mono tracking-wider">
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <p className="text-crimson-alert text-xs font-body text-center mb-4">{error}</p>}
              {success && <p className="text-teal-accent text-xs font-body text-center mb-4">{success}</p>}

              {sessionStatus !== "finalized" && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3.5 rounded-xl transition-all active:translate-y-[1px] flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw size={16} className="animate-spin" />}
                  {isOnline ? "Submit Attendance Draft" : "Save Attendance Offline"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
