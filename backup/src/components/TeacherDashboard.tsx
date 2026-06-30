import { useState, useEffect } from "react";
import { 
  ArrowLeft, CheckSquare, Shield, RefreshCw, X, LogOut, Calendar as CalendarIcon, 
  BarChart3, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, 
  Save, Lock, Unlock, AlertCircle 
} from "lucide-react";
import { supabase as client } from "../utils/supabaseClient";

interface TeacherDashboardProps {
  onBack: () => void;
}

interface DraftSession {
  id: string;
  date: string;
  status: string;
  class_name: string;
  period_id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  subject_name: string;
  subject_code: string;
  teacher_id: string;
  teacher_name: string;
  teacher_dept?: string;
  class_id: string;
  attendance_records?: { id: string; status: string }[];
}

interface Teacher {
  id: string;
  name: string;
  department?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface StudentAttendanceRecord {
  register_number: string;
  name: string;
  status: string; // 'present' | 'absent' | 'late'
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  // Navigation steps: 'setup' | 'pin' | 'dashboard' | 'edit'
  const [step, setStep] = useState<"setup" | "pin" | "dashboard" | "edit">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup / Authentication states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("I");
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [pin, setPin] = useState("");

  // Session state cache
  const [loggedInTeacher, setLoggedInTeacher] = useState<Teacher | null>(null);
  const [loggedInPin, setLoggedInPin] = useState("");

  // Dashboard Data
  const [sessionsList, setSessionsList] = useState<DraftSession[]>([]);
  const [holidaysList, setHolidaysList] = useState<{ date: string; name: string }[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    overallRate: number;
    totalStudents: number;
    totalClasses: number;
    criticalAlerts: any[];
    subjectBreakdown: any[];
  }>({
    overallRate: 0,
    totalStudents: 0,
    totalClasses: 0,
    criticalAlerts: [],
    subjectBreakdown: [],
  });

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Edit / Finalize state
  const [selectedSession, setSelectedSession] = useState<DraftSession | null>(null);
  const [editingRecords, setEditingRecords] = useState<StudentAttendanceRecord[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Load departments and teachers on mount
  useEffect(() => {
    const initializeSetup = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: deptData, error: deptErr } = await client
          .from("departments")
          .select("id, name, code")
          .order("name");

        if (deptErr) throw deptErr;
        setDepartments(deptData || []);

        const { data: teachData, error: teachErr } = await client
          .from("teachers")
          .select("id, name, department")
          .order("name");

        if (teachErr) throw teachErr;
        setTeachersList(teachData || []);
      } catch (err: any) {
        const errMsg = err.message || JSON.stringify(err);
        if (errMsg.includes("JWT expired") || errMsg.includes("expired")) {
          try {
            const keys = Object.keys(localStorage);
            const authKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
            if (authKey) localStorage.removeItem(authKey);
            sessionStorage.removeItem("admin_auth");
          } catch (_) {}
          window.location.reload();
          return;
        }
        setError("Failed to load initial configuration from database: " + errMsg);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initializeSetup();
  }, []);

  // Filter teachers list based on selected department code
  useEffect(() => {
    if (selectedDept) {
      const filtered = teachersList.filter(
        (t) => t.department?.toLowerCase() === selectedDept.code.toLowerCase()
      );
      setFilteredTeachers(filtered);
      setSelectedTeacher(null);
      setPin("");
    }
  }, [selectedDept, teachersList]);

  // Load Dashboard data whenever logged in, department, year or month changes
  useEffect(() => {
    if (loggedInTeacher && selectedDept) {
      loadDashboardData(selectedDept.id, selectedYear);
    }
  }, [loggedInTeacher, selectedDept, selectedYear, currentMonth, currentYear]);

  const loadDashboardData = async (deptId: string, yr: string) => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch sessions in this month for calendar stats and dashboard listing
      const start = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
      const end = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

      const { data: sessionsData, error: sessErr } = await client
        .from("attendance_sessions")
        .select(`
          id, date, status,
          subjects (id, name, code),
          teachers:teachers!teacher_id (id, name, department),
          timetable_slots!inner (
            class_id,
            classes!inner (id, name, department_id, year),
            timetable_periods (
              id, name, start_time, end_time
            )
          ),
          attendance_records (
            id, status
          )
        `)
        .eq("timetable_slots.classes.department_id", deptId)
        .eq("timetable_slots.classes.year", yr)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (sessErr) throw sessErr;

      // 2. Fetch student registries and stats
      const { data: summariesData, error: sumErr } = await client
        .from("student_attendance_summary")
        .select(`
          register_number, student_name, class_name,
          attended_count, total_finalized_count, attendance_percentage,
          classes!inner (id, name, department_id, year)
        `)
        .eq("classes.department_id", deptId)
        .eq("classes.year", yr);

      if (sumErr) throw sumErr;

      // 3. Fetch holidays for this month
      const { data: holidaysData } = await client
        .from("holidays")
        .select("date, name")
        .gte("date", start)
        .lte("date", end);
      if (holidaysData) setHolidaysList(holidaysData);

      // Format sessions list
      const formatted: DraftSession[] = (sessionsData || []).map((s: any) => {
        const tp = s.timetable_slots?.timetable_periods;
        return {
          id: s.id,
          date: s.date,
          status: s.status,
          class_name: s.timetable_slots?.classes?.name || "Unknown",
          class_id: s.timetable_slots?.classes?.id || "",
          period_id: tp?.id || "",
          period_name: tp?.name || "Unknown",
          period_start: tp?.start_time || "",
          period_end: tp?.end_time || "",
          subject_name: s.subjects?.name || "Unknown",
          subject_code: s.subjects?.code || "N/A",
          teacher_id: s.teachers?.id || "",
          teacher_name: s.teachers?.name || "Unknown",
          teacher_dept: s.teachers?.department || "",
          attendance_records: s.attendance_records || [],
        };
      });

      setSessionsList(formatted);

      // Compute statistics
      if (summariesData) {
        const activeSummaries = summariesData.filter((s) => s.total_finalized_count > 0);
        const overallRate = activeSummaries.length > 0
          ? Math.round(activeSummaries.reduce((acc, curr) => acc + curr.attendance_percentage, 0) / activeSummaries.length)
          : 0;

        const lowAttendance = summariesData
          .filter((s) => s.total_finalized_count > 0 && s.attendance_percentage < 75)
          .sort((a, b) => a.attendance_percentage - b.attendance_percentage);

        // Subject Breakdown calculation
        const subjectsMap: Record<string, { name: string; code: string; attended: number; total: number }> = {};
        formatted.forEach((session) => {
          if (session.status !== "finalized") return;
          const code = session.subject_code;
          if (!subjectsMap[code]) {
            subjectsMap[code] = { name: session.subject_name, code, attended: 0, total: 0 };
          }
          session.attendance_records?.forEach((rec: any) => {
            if (rec.status === "present" || rec.status === "late") {
              subjectsMap[code].attended++;
            }
            subjectsMap[code].total++;
          });
        });

        const subjectStatsList = Object.values(subjectsMap).map((sub) => ({
          ...sub,
          percentage: sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 0,
        })).sort((a, b) => b.percentage - a.percentage);

        setDashboardStats({
          overallRate,
          totalStudents: summariesData.length,
          totalClasses: formatted.filter((s) => s.status === "finalized").length,
          criticalAlerts: lowAttendance,
          subjectBreakdown: subjectStatsList,
        });
      }
    } catch (err: any) {
      const errMsg = err.message || JSON.stringify(err);
      if (errMsg.includes("JWT expired") || errMsg.includes("expired")) {
        try {
          const keys = Object.keys(localStorage);
          const authKey = keys.find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
          if (authKey) localStorage.removeItem(authKey);
          sessionStorage.removeItem("admin_auth");
        } catch (_) {}
        window.location.reload();
        return;
      }
      console.error(err);
      setError("Failed to fetch dashboard data: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper to trigger verification and login
  const handleVerifyPin = async () => {
    if (!selectedTeacher || pin.length !== 4) {
      setError("Please select your profile and enter your 4-digit PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/teacher-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacher_id: selectedTeacher.id, pin }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        await client.auth.setSession({ access_token: data.token, refresh_token: "" });
        setLoggedInTeacher(selectedTeacher);
        setLoggedInPin(pin);
        setStep("dashboard");
        setPin("");
      } else {
        setError(data.error || "Invalid secure PIN. Please try again.");
        setPin("");
      }
    } catch (err: any) {
      setError("PIN validation failed. Check connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Logout method
  const handleLogout = async () => {
    setLoggedInTeacher(null);
    setLoggedInPin("");
    setSelectedTeacher(null);
    setPin("");
    setStep("setup");
    await client.auth.signOut();
  };

  // Pin Pad helpers
  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  // Compute daily present/absent aggregates from loaded sessions for the calendar cells
  const getDailyStats = () => {
    const daily: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    sessionsList.forEach((session) => {
      const dateStr = session.date;
      if (!daily[dateStr]) {
        daily[dateStr] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      session.attendance_records?.forEach((rec: any) => {
        if (rec.status === "present") daily[dateStr].present++;
        else if (rec.status === "absent") daily[dateStr].absent++;
        else if (rec.status === "late") daily[dateStr].late++;
        daily[dateStr].total++;
      });
    });
    return daily;
  };

  const dailyStats = getDailyStats();

  // Generate calendar days
  const calendarDays = getDaysInMonth(currentYear, currentMonth);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDateFilter(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDateFilter(null);
  };

  // Filtered session list to display
  const displayedSessions = selectedDateFilter
    ? sessionsList.filter((s) => s.date === selectedDateFilter)
    : sessionsList;

  // Start editing attendance list for a session
  const handleStartEdit = async (session: DraftSession) => {
    setSelectedSession(session);
    setStep("edit");
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      // 1. Fetch all students in that class
      const { data: studentsData, error: studErr } = await client
        .from("students")
        .select("register_number, name")
        .eq("class_id", session.class_id)
        .order("name");

      if (studErr) throw studErr;

      // 2. Fetch existing records for this session
      const { data: recordsData, error: recErr } = await client
        .from("attendance_records")
        .select("student_register_number, status")
        .eq("session_id", session.id);

      if (recErr) throw recErr;

      // Map to initial records list
      const mapped = (studentsData || []).map((student) => {
        const match = (recordsData || []).find(
          (r) => r.student_register_number === student.register_number
        );
        return {
          register_number: student.register_number,
          name: student.name,
          status: match ? match.status : "present", // Default to present
        };
      });

      setEditingRecords(mapped);
    } catch (err: any) {
      setEditError("Failed to fetch students. Try again.");
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle student status in local edit state
  const toggleStudentStatus = (regNum: string, newStatus: string) => {
    setEditingRecords((prev) =>
      prev.map((r) => (r.register_number === regNum ? { ...r, status: newStatus } : r))
    );
  };

  // Submit edits via Edge Function `/sessions/teacher-update-attendance`
  const handleSaveAttendance = async (finalizeAfter = false) => {
    if (!selectedSession || !loggedInTeacher) return;
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      // Send edits to the edge function
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/teacher-update-attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: selectedSession.id,
            teacher_id: loggedInTeacher.id,
            pin: loggedInPin,
            records: editingRecords.map((r) => ({
              student_register_number: r.register_number,
              status: r.status,
            })),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update attendance records");
      }

      if (finalizeAfter) {
        // Run finalize command if requested
        const finResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/sessions/finalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: selectedSession.id,
              teacher_id: loggedInTeacher.id,
              pin: loggedInPin,
            }),
          }
        );

        const finData = await finResponse.json();
        if (!finResponse.ok) {
          throw new Error(finData.error || "Failed to lock/finalize session");
        }
        setEditSuccess("Attendance records saved & finalized successfully!");
      } else {
        setEditSuccess("Attendance records saved successfully!");
      }

      setTimeout(() => {
        setStep("dashboard");
        setSelectedSession(null);
        setEditingRecords([]);
        if (selectedDept) loadDashboardData(selectedDept.id, selectedYear);
      }, 1500);

    } catch (err: any) {
      setEditError(err.message || "Server communication error.");
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  // Revert attendance status to draft
  const handleUnlockSession = async () => {
    if (!selectedSession || !loggedInTeacher) return;
    setEditLoading(true);
    setEditError("");
    setEditSuccess("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: selectedSession.id,
            teacher_id: loggedInTeacher.id,
            pin: loggedInPin,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to unlock session");
      }

      setEditSuccess("Session unlocked and reverted to draft status.");
      setTimeout(() => {
        setStep("dashboard");
        setSelectedSession(null);
        setEditingRecords([]);
        if (selectedDept) loadDashboardData(selectedDept.id, selectedYear);
      }, 1500);

    } catch (err: any) {
      setEditError(err.message || "Failed to unlock session");
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  // ==========================================
  // RENDER SCREEN: SETUP (Step 1)
  // ==========================================
  if (step === "setup") {
    return (
      <div className="w-full max-w-md mx-auto min-h-[85vh] flex flex-col justify-center py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-body"
          >
            <ArrowLeft size={16} className="mr-2" />
            Portals
          </button>
          <span className="font-mono text-xs tracking-widest text-teal-accent">TEACHER PORTAL</span>
        </div>

        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-display font-bold text-2xl tracking-tight text-text-primary">
              Teacher Portal Login
            </h1>
            <p className="text-text-muted text-xs font-body mt-1">
              Select your academic department and teaching year
            </p>
          </div>

          {error && (
            <div className="bg-crimson-alert/15 border border-crimson-alert/30 rounded-xl p-3 text-crimson-alert text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                Department
              </label>
              <select
                value={selectedDept?.id || ""}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value);
                  setSelectedDept(dept || null);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3 text-sm text-text-primary focus:outline-none focus:border-teal-accent font-body"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                Academic Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3 text-sm text-text-primary focus:outline-none focus:border-teal-accent font-body"
              >
                {["I", "II", "III", "IV"].map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (!selectedDept) {
                  setError("Please select a department to proceed");
                  return;
                }
                setStep("pin");
                setError("");
              }}
              className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3.5 rounded-xl transition-all active:translate-y-[1px] mt-2 flex items-center justify-center gap-2"
            >
              Continue to Authentication
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER SCREEN: PIN ENTER (Step 2)
  // ==========================================
  if (step === "pin") {
    // Fallback if no teachers match filtered list: show all
    const activeTeachersList = filteredTeachers.length > 0 ? filteredTeachers : teachersList;

    return (
      <div className="w-full max-w-md mx-auto min-h-[85vh] flex flex-col justify-center py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setStep("setup")}
            className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-body"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </button>
          <span className="font-mono text-xs tracking-widest text-teal-accent">TEACHER PORTAL</span>
        </div>

        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5">
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-teal-accent font-semibold tracking-wider uppercase mb-2">
              {selectedDept?.code} — YEAR {selectedYear}
            </span>
            <h1 className="font-display font-bold text-2xl tracking-tight text-text-primary">
              Teacher Profile Security
            </h1>
            <p className="text-text-muted text-xs font-body mt-1">
              Select your profile and enter your security PIN code
            </p>
          </div>

          {error && (
            <div className="bg-crimson-alert/15 border border-crimson-alert/30 rounded-xl p-3 text-crimson-alert text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-1.5">
                Confirm Profile Name
              </label>
              <select
                value={selectedTeacher?.id || ""}
                onChange={(e) => {
                  const teacher = activeTeachersList.find((t) => t.id === e.target.value);
                  setSelectedTeacher(teacher || null);
                  setPin("");
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-3 text-sm text-text-primary focus:outline-none focus:border-teal-accent font-body"
              >
                <option value="">Select Teacher Profile</option>
                {activeTeachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.department ? `(${t.department})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {filteredTeachers.length === 0 && (
              <p className="text-[10px] text-zinc-500 font-body -mt-2">
                * No profiles loaded for {selectedDept?.code}. Showing full registry.
              </p>
            )}

            {selectedTeacher && (
              <div className="flex flex-col items-center gap-5 mt-2">
                <div className="flex gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4.5 h-4.5 rounded-full border-2 transition-all ${
                        pin.length > i
                          ? "bg-teal-accent border-teal-accent scale-110"
                          : "border-zinc-800 bg-transparent"
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 max-w-[280px] w-full mt-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num)}
                      className="keypad-btn bg-zinc-900 border border-zinc-800/80 hover:border-teal-accent/40 rounded-2xl py-3.5 text-xl font-mono font-semibold text-text-primary transition-all active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    className="keypad-btn bg-zinc-950 border border-zinc-900 text-zinc-600 rounded-2xl py-3.5 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleKeyPress("0")}
                    className="keypad-btn bg-zinc-900 border border-zinc-800/80 hover:border-teal-accent/40 rounded-2xl py-3.5 text-xl font-mono font-semibold text-text-primary transition-all active:scale-95"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="keypad-btn bg-zinc-950 border border-zinc-900 text-zinc-600 rounded-2xl py-3.5 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center"
                  >
                    Delete
                  </button>
                </div>

                <button
                  onClick={handleVerifyPin}
                  disabled={loading || pin.length !== 4}
                  className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3.5 rounded-xl transition-all active:translate-y-[1px] disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                >
                  {loading && <RefreshCw size={16} className="animate-spin" />}
                  Verify security PIN
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER SCREEN: DASHBOARD
  // ==========================================
  if (step === "dashboard") {
    // Group days in calendar by weeks
    const weeks: any[][] = [];
    let currentWeek: any[] = [];
    calendarDays.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === calendarDays.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return (
      <div className="w-full max-w-6xl mx-auto min-h-[90vh] flex flex-col justify-start py-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tracking-widest text-teal-accent font-bold uppercase">
                TEACHER DASHBOARD
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                {selectedDept?.code} — Yr {selectedYear}
              </span>
            </div>
            <h1 className="font-display font-bold text-3xl text-text-primary mt-1">
              Welcome, {loggedInTeacher?.name}
            </h1>
            <p className="text-text-muted text-xs font-body mt-0.5">
              Managing student verification, edits, and analytics.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-zinc-800 hover:border-crimson-alert/50 rounded-xl px-4 py-2 bg-zinc-950/60 hover:bg-crimson-alert/10 text-text-muted hover:text-crimson-alert transition-all text-xs font-body"
          >
            <LogOut size={14} />
            Logout Profile
          </button>
        </div>

        {error && (
          <div className="bg-crimson-alert/15 border border-crimson-alert/30 rounded-xl p-3 text-crimson-alert text-xs flex items-center gap-2 mb-6">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT SIDE: Calendar & List (3 Columns) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Interactive Calendar Card */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-start">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-bold text-base text-text-primary flex items-center gap-2">
                  <CalendarIcon size={16} className="text-teal-accent" />
                  Monthly Attendance Calendar
                </h3>
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 rounded-lg p-0.5">
                  <button
                    onClick={prevMonth}
                    className="p-1 hover:bg-zinc-900 rounded text-text-muted hover:text-text-primary transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-xs font-bold px-3 text-text-primary">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                  <button
                    onClick={nextMonth}
                    className="p-1 hover:bg-zinc-900 rounded text-text-muted hover:text-text-primary transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="font-mono text-[10px] text-zinc-500 font-bold uppercase py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="flex flex-col gap-1">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 gap-1">
                    {week.map((day, dIdx) => {
                      const stats = dailyStats[day.dateStr];
                      const holiday = holidaysList.find((h) => h.date === day.dateStr);
                      const isToday = formatDateLocal(new Date()) === day.dateStr;
                      const isSelected = selectedDateFilter === day.dateStr;

                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (stats) {
                              setSelectedDateFilter(isSelected ? null : day.dateStr);
                            }
                          }}
                          className={`min-h-[56px] p-1.5 rounded-lg border flex flex-col justify-between transition-all select-none ${
                            !day.isCurrentMonth
                              ? "bg-zinc-950/20 border-zinc-950/40 opacity-30 cursor-default"
                              : holiday
                              ? "bg-purple-950/20 border-purple-900/40 cursor-default"
                              : stats
                              ? "bg-zinc-900/30 border-zinc-800/80 hover:border-teal-accent/50 cursor-pointer"
                              : "bg-zinc-950/30 border-zinc-950/60 cursor-default"
                          } ${isToday ? "border-teal-accent/60 bg-teal-accent/5" : ""} ${
                            isSelected ? "border-teal-accent bg-teal-accent/10 ring-1 ring-teal-accent/30" : ""
                          }`}
                        >
                          <span
                            className={`font-mono text-xs font-bold block text-right leading-none ${
                              isToday ? "text-teal-accent" : "text-text-muted"
                            }`}
                          >
                            {day.date.getDate()}
                          </span>

                          {holiday ? (
                            <span 
                              className="font-body text-[8px] leading-tight text-purple-400 font-semibold truncate text-center block mt-1 py-0.5 px-1 rounded bg-purple-500/10 border border-purple-500/20" 
                              title={holiday.name}
                            >
                              {holiday.name}
                            </span>
                          ) : stats && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="font-mono text-[8px] leading-none text-teal-accent flex items-center justify-between font-semibold">
                                <span>P</span>
                                <span>{stats.present + stats.late}</span>
                              </span>
                              <span className="font-mono text-[8px] leading-none text-crimson-alert flex items-center justify-between font-semibold">
                                <span>A</span>
                                <span>{stats.absent}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Sessions List */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-start">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-900">
                <div>
                  <h3 className="font-display font-bold text-base text-text-primary flex items-center gap-2">
                    <CheckSquare size={16} className="text-teal-accent" />
                    Attendance Sessions log
                  </h3>
                  <p className="text-[10px] text-text-muted font-body mt-0.5">
                    Click any session below to edit student logs or finalize.
                  </p>
                </div>
                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-teal-accent/30 bg-teal-accent/10 text-teal-accent text-[10px] font-mono hover:bg-teal-accent/20 transition-all font-semibold"
                  >
                    Date: {selectedDateFilter.slice(5)} <X size={10} />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-6 font-body text-xs text-text-muted">
                  Fetching session registries...
                </div>
              ) : displayedSessions.length === 0 ? (
                <div className="text-center py-10 font-body text-xs text-text-muted">
                  No sessions logged for this period/filter.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {displayedSessions.map((session) => {
                    const present = session.attendance_records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
                    const absent = session.attendance_records?.filter(r => r.status === 'absent').length || 0;

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleStartEdit(session)}
                        className="bg-zinc-900/30 border border-zinc-800/80 hover:border-teal-accent/50 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-[9px] bg-teal-accent/10 text-teal-accent px-1.5 py-0.5 rounded font-bold uppercase">
                              {session.class_name}
                            </span>
                            <span className="font-mono text-[9px] text-text-muted">
                              {session.period_name} ({session.period_start.substring(0, 5)} - {session.period_end.substring(0, 5)})
                            </span>
                            <span className="font-mono text-[9px] text-zinc-500 font-medium">
                              {session.date}
                            </span>
                          </div>
                          <h4 className="font-display font-semibold text-sm text-text-primary">
                            {session.subject_name}
                          </h4>
                          <p className="text-[10px] text-text-muted font-body mt-0.5">
                            Teacher: {session.teacher_name} {session.teacher_dept ? `(${session.teacher_dept})` : ""}
                          </p>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-900">
                          {session.attendance_records && session.attendance_records.length > 0 && (
                            <div className="flex gap-2">
                              <span className="text-[9px] font-mono bg-teal-accent/10 text-teal-accent px-2 py-0.5 rounded-full font-bold">
                                P: {present}
                              </span>
                              <span className="text-[9px] font-mono bg-crimson-alert/10 text-crimson-alert px-2 py-0.5 rounded-full font-bold">
                                A: {absent}
                              </span>
                            </div>
                          )}

                          {session.status === "finalized" ? (
                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg flex items-center gap-1.5">
                              <Shield size={12} className="text-zinc-500" />
                              Finalized
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-teal-accent bg-teal-accent/15 border border-teal-accent/30 px-3 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                              <CheckSquare size={12} />
                              Draft Session
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Statistics & Analytics (2 Columns) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Core Stats Panel */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-start gap-4">
              <h3 className="font-display font-bold text-base text-text-primary flex items-center gap-2 pb-2 border-b border-zinc-900">
                <BarChart3 size={16} className="text-teal-accent" />
                Department Insights
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted font-body uppercase tracking-wider block mb-1">
                    Overall Attendance
                  </span>
                  <span className="font-mono text-3xl font-bold text-teal-accent">
                    {dashboardStats.overallRate}%
                  </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-text-muted font-body uppercase tracking-wider block mb-1">
                    Total Classes Logged
                  </span>
                  <span className="font-mono text-3xl font-bold text-text-primary">
                    {dashboardStats.totalClasses}
                  </span>
                </div>
              </div>

              {/* Subject breakdowns */}
              <div className="mt-2">
                <h4 className="text-[10px] text-text-muted font-mono uppercase tracking-wider font-bold mb-3">
                  Subject performance
                </h4>

                {dashboardStats.subjectBreakdown.length === 0 ? (
                  <p className="text-xs font-body text-text-muted">No subject stats computed yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {dashboardStats.subjectBreakdown.map((sub, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-display font-semibold text-text-primary truncate max-w-[160px]">
                            {sub.name}
                          </span>
                          <span className="font-mono text-teal-accent font-bold text-[11px] shrink-0">
                            {sub.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-950">
                          <div
                            className="bg-teal-accent h-full rounded-full transition-all duration-550"
                            style={{ width: `${sub.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Critical Low Attendance Alerts */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-start">
              <h3 className="font-display font-bold text-base text-text-primary flex items-center gap-2 pb-2 border-b border-zinc-900 mb-4">
                <AlertTriangle size={16} className="text-crimson-alert" />
                Critical Alerts (&lt;75%)
              </h3>

              {dashboardStats.criticalAlerts.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted font-body">
                  No students in this department have critical attendance logs currently.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {dashboardStats.criticalAlerts.map((student, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-crimson-alert/5 border border-crimson-alert/20"
                    >
                      <div className="truncate max-w-[170px]">
                        <h4 className="font-display font-semibold text-xs text-text-primary truncate">
                          {student.student_name}
                        </h4>
                        <span className="font-mono text-[9px] text-text-muted">
                          {student.register_number}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-crimson-alert bg-crimson-alert/15 px-2.5 py-0.5 rounded-full border border-crimson-alert/20">
                        {student.attendance_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER SCREEN: EDIT ATTENDANCE
  // ==========================================
  if (step === "edit") {
    const presentCount = editingRecords.filter((r) => r.status === "present" || r.status === "late").length;
    const absentCount = editingRecords.filter((r) => r.status === "absent").length;

    return (
      <div className="w-full max-w-2xl mx-auto min-h-[90vh] flex flex-col justify-start py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-900">
          <div>
            <span className="font-mono text-[10px] text-teal-accent font-bold tracking-wider uppercase">
              {selectedSession?.class_name} — {selectedSession?.period_name}
            </span>
            <h1 className="font-display font-bold text-2xl text-text-primary mt-1">
              Edit Attendance Registers
            </h1>
            <p className="text-text-muted text-xs font-body mt-0.5">
              {selectedSession?.subject_name} ({selectedSession?.subject_code})
            </p>
          </div>
          <button
            onClick={() => {
              setStep("dashboard");
              setSelectedSession(null);
            }}
            className="p-2 border border-zinc-900 hover:border-zinc-800 rounded-xl text-text-muted hover:text-text-primary transition-all bg-zinc-950"
          >
            <X size={16} />
          </button>
        </div>

        {editError && (
          <div className="bg-crimson-alert/15 border border-crimson-alert/30 rounded-xl p-3 text-crimson-alert text-xs flex items-center gap-2 mb-4">
            <AlertCircle size={14} className="shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        {editSuccess && (
          <div className="bg-teal-accent/15 border border-teal-accent/30 rounded-xl p-3 text-teal-accent text-xs flex items-center gap-2 mb-4">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>{editSuccess}</span>
          </div>
        )}

        {/* Action Panel and Stats counts */}
        <div className="flex justify-between items-center mb-4 p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl text-xs font-body">
          <div className="flex gap-4">
            <span className="text-text-muted font-medium">
              Present: <strong className="text-teal-accent font-mono font-bold">{presentCount}</strong>
            </span>
            <span className="text-text-muted font-medium">
              Absent: <strong className="text-crimson-alert font-mono font-bold">{absentCount}</strong>
            </span>
          </div>
          <span className="text-[10px] text-text-muted font-mono uppercase bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded font-bold">
            Total: {editingRecords.length}
          </span>
        </div>

        {/* Student Editor Grid List */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-start mb-6 max-h-[50vh] overflow-y-auto">
          {editLoading && editingRecords.length === 0 ? (
            <div className="text-center py-10 text-xs text-text-muted font-body">
              Loading student register list...
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-900">
              {editingRecords.map((record) => (
                <div
                  key={record.register_number}
                  className="flex justify-between items-center py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="truncate max-w-[280px]">
                    <h4 className="font-display font-semibold text-sm text-text-primary truncate">
                      {record.name}
                    </h4>
                    <span className="font-mono text-[10px] text-text-muted">
                      {record.register_number}
                    </span>
                  </div>

                  {/* Toggle button groups */}
                  <div className="flex border border-zinc-800 rounded-lg p-0.5 bg-zinc-950 shrink-0">
                    <button
                      onClick={() => toggleStudentStatus(record.register_number, "present")}
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-md font-bold uppercase transition-all ${
                        record.status === "present"
                          ? "bg-teal-accent text-canvas"
                          : "text-zinc-500 hover:text-text-primary"
                      }`}
                    >
                      P
                    </button>
                    <button
                      onClick={() => toggleStudentStatus(record.register_number, "late")}
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-md font-bold uppercase transition-all ${
                        record.status === "late"
                          ? "bg-amber-500 text-canvas"
                          : "text-zinc-500 hover:text-text-primary"
                      }`}
                    >
                      L
                    </button>
                    <button
                      onClick={() => toggleStudentStatus(record.register_number, "absent")}
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-md font-bold uppercase transition-all ${
                        record.status === "absent"
                          ? "bg-crimson-alert text-text-primary"
                          : "text-zinc-500 hover:text-text-primary"
                      }`}
                    >
                      A
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Bottom buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setStep("dashboard");
              setSelectedSession(null);
            }}
            disabled={editLoading}
            className="flex-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 font-body text-xs font-semibold py-3.5 rounded-xl transition-all text-text-muted hover:text-text-primary"
          >
            Cancel and Discard
          </button>

          <button
            onClick={() => handleSaveAttendance(false)}
            disabled={editLoading}
            className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-teal-accent/30 text-teal-accent font-body text-xs font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Save size={14} />
            Save changes
          </button>

          {selectedSession?.status === "draft" ? (
            <button
              onClick={() => handleSaveAttendance(true)}
              disabled={editLoading}
              className="flex-1 bg-teal-accent hover:bg-teal-hover text-canvas font-body text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:translate-y-[1px]"
            >
              <Lock size={14} />
              Finalize & Lock
            </button>
          ) : (
            <button
              onClick={handleUnlockSession}
              disabled={editLoading}
              className="flex-1 border border-crimson-alert/30 hover:border-crimson-alert/50 bg-crimson-alert/10 hover:bg-crimson-alert/20 text-crimson-alert font-body text-xs font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Unlock size={14} />
              Unlock session
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Calculates a grid of days for a monthly calendar view, showing pad days from prev/next months
 */
function getDaysInMonth(year: number, month: number) {
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sun = 0, Mon = 1, etc.
  // Align offsets: Mon = 0, Tue = 1, ..., Sun = 6
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
  
  // Previous month padding days
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthTotalDays - i;
    const date = new Date(year, month - 1, d);
    days.push({ date, isCurrentMonth: false, dateStr: formatDateLocal(date) });
  }
  
  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    days.push({ date, isCurrentMonth: true, dateStr: formatDateLocal(date) });
  }
  
  // Next month padding days to reach 35 or 42 cells grid
  const totalCells = days.length <= 35 ? 35 : 42;
  const nextMonthPadding = totalCells - days.length;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const date = new Date(year, month + 1, d);
    days.push({ date, isCurrentMonth: false, dateStr: formatDateLocal(date) });
  }
  
  return days;
}
