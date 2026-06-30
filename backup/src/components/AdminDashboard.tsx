import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Calendar, Shield, Users, BookOpen, UserSquare, Clock, FolderOpen, UploadCloud, FileText, X, CheckCircle2, Pencil, Settings } from "lucide-react";
import { supabase as client } from "../utils/supabaseClient";

interface AdminDashboardProps {
  onBack: () => void;
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

interface Subject {
  id: string;
  code: string;
  name: string;
  assigned_teacher_id: string;
  teacher_name?: string;
}

interface Student {
  register_number: string;
  name: string;
  class_id: string;
  class_name?: string;
}

interface TimetablePeriod {
  id: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_academic_period: boolean;
}

interface TimetableSlot {
  id: string;
  class_id: string;
  day: string;
  period_id: string;
  subject_id: string;
  teacher_id: string;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  // Authentication State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("admin_auth") === "true" && 
    sessionStorage.getItem("admin_token") !== null
  );
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"timetable" | "teachers" | "subjects" | "classes" | "students" | "periods" | "settings">("timetable");

  // Core Data Lists
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; department_id?: string; year?: string }[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [periodsList, setPeriodsList] = useState<TimetablePeriod[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; start_date: string; end_date: string; is_active: boolean }[]>([]);

  // CRUD Forms State
  const [newYearName, setNewYearName] = useState("");
  const [newYearStart, setNewYearStart] = useState("");
  const [newYearEnd, setNewYearEnd] = useState("");
  const [holidaysList, setHolidaysList] = useState<{ id: string; date: string; name: string }[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [settingsSubTab, setSettingsSubTab] = useState<"years" | "holidays">("years");
  const [adminStats, setAdminStats] = useState<{ date: string; totalStudents: number; presentToday: number; absentToday: number } | null>(null);

  // Selected state for timetable builder
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assignModal, setAssignModal] = useState<{ day: string; period_id: string } | null>(null);
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");

  // CRUD Forms State
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPin, setNewTeacherPin] = useState("");
  const [newTeacherDept, setNewTeacherDept] = useState("General");
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubTeacherId, setNewSubTeacherId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newClassDeptId, setNewClassDeptId] = useState("");
  const [newClassYear, setNewClassYear] = useState("I");
  const [newClassSection, setNewClassSection] = useState("");
  const [newClassPassword, setNewClassPassword] = useState("reppass123");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState("");

  // Dynamic Periods CRUD State
  const [newPeriodNum, setNewPeriodNum] = useState<number | "">("");
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");
  const [newPeriodIsAcademic, setNewPeriodIsAcademic] = useState(true);

  // CSV Import States
  const [csvModal, setCsvModal] = useState<{ type: "teachers" | "subjects" | "students" | "periods" | "classes" } | null>(null);
  const [csvText, setCsvText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    type: "teacher" | "subject" | "department" | "class" | "student" | "period" | "academic_year" | "holiday";
    id: string;
    data: any;
  } | null>(null);

  // Folder UI State
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const [dbError, setDbError] = useState("");
  const [dbSuccess, setDbSuccess] = useState("");

  // Helper to load all DB collections
  const loadDatabase = async () => {
    try {


      const { data: teachData } = await client.from("teachers").select("id, name, department").order("name");
      if (teachData) setTeachers(teachData);

      const { data: subData } = await client.from("subjects").select(`
        id, code, name, assigned_teacher_id,
        teachers (name)
      `).order("name");
      if (subData) {
        const formatted = subData.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          assigned_teacher_id: s.assigned_teacher_id,
          teacher_name: s.teachers?.name || "Unassigned"
        }));
        setSubjects(formatted);
      }

      const { data: deptData } = await client.from("departments").select("id, name, code").order("name");
      if (deptData) {
        setDepartments(deptData);
        if (deptData.length > 0 && !newClassDeptId) {
          setNewClassDeptId(prev => prev || deptData[0].id);
        }
      }

      const { data: clsData } = await client.from("classes").select("id, name, department_id, year").order("name");
      if (clsData) {
        setClasses(clsData);
        if (clsData.length > 0 && !selectedClassId) {
          setSelectedClassId(clsData[0].id);
        }
      }

      const { data: studData } = await client.from("students").select(`
        register_number, name, class_id,
        classes (name)
      `).order("name");
      if (studData) {
        const formatted = studData.map((s: any) => ({
          register_number: s.register_number,
          name: s.name,
          class_id: s.class_id,
          class_name: s.classes?.name || "Unknown"
        }));
        setStudents(formatted);
      }

      const { data: slotsData } = await client.from("timetable_slots").select("*");
      if (slotsData) setTimetableSlots(slotsData);

      const { data: periodsData } = await client
        .from("timetable_periods")
        .select("*")
        .order("period_number");
      if (periodsData) setPeriodsList(periodsData);

      const { data: ayData } = await client
        .from("academic_years")
        .select("*")
        .order("start_date", { ascending: false });
      if (ayData) setAcademicYears(ayData);

      const { data: holData } = await client
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });
      if (holData) setHolidaysList(holData);

      // Fetch dynamic stats for Admin
      const { data: dateData } = await client
        .from("attendance_sessions")
        .select("date")
        .order("date", { ascending: false })
        .limit(1);

      if (dateData && dateData.length > 0) {
        const targetDate = dateData[0].date;
        const { data: sessions } = await client
          .from("attendance_sessions")
          .select("id")
          .eq("date", targetDate);

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s) => s.id);
          const { data: records } = await client
            .from("attendance_records")
            .select("status")
            .in("session_id", sessionIds);

          if (records) {
            const present = records.filter((r) => r.status === "present" || r.status === "late").length;
            const absent = records.filter((r) => r.status === "absent").length;
            setAdminStats({
              date: targetDate,
              totalStudents: studData ? studData.length : 0,
              presentToday: present,
              absentToday: absent
            });
          }
        } else {
          setAdminStats({
            date: targetDate,
            totalStudents: studData ? studData.length : 0,
            presentToday: 0,
            absentToday: 0
          });
        }
      } else {
        setAdminStats({
          date: new Date().toISOString().split("T")[0],
          totalStudents: studData ? studData.length : 0,
          presentToday: 0,
          absentToday: 0
        });
      }

    } catch (_err) {
      setDbError("Failed to synchronize tables with database");
    }
  };

  useEffect(() => {
    const initSession = async () => {
      const token = sessionStorage.getItem("admin_token");
      if (token) {
        await client.auth.setSession({ access_token: token, refresh_token: "" });
      }
      loadDatabase();
    };
    if (isAuthenticated) {
      initSession();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("Missing email or password");
      return;
    }

    setLoading(true);
    setAuthError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/admin-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        await client.auth.setSession({ access_token: data.token, refresh_token: "" });
        sessionStorage.setItem("admin_token", data.token);
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (_err) {
      setAuthError("Network request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_token");
    await client.auth.signOut();
  };

  // Timetable builder helpers
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getSlotDetails = (day: string, periodId: string) => {
    const slot = timetableSlots.find((s) => s.class_id === selectedClassId && s.day === day && s.period_id === periodId);
    if (!slot) return null;

    const sub = subjects.find((s) => s.id === slot.subject_id);
    const teach = teachers.find((t) => t.id === slot.teacher_id);

    return {
      slot_id: slot.id,
      subject_code: sub?.code || "Unknown",
      subject_name: sub?.name || "Unknown subject",
      teacher_name: teach?.name || "Unknown teacher",
    };
  };

  const handleOpenAssign = (day: string, periodId: string) => {
    const existing = timetableSlots.find((s) => s.class_id === selectedClassId && s.day === day && s.period_id === periodId);
    setAssignSubjectId(existing?.subject_id || "");
    setAssignTeacherId(existing?.teacher_id || "");
    setAssignModal({ day, period_id: periodId });
  };

  const handleSaveSlot = async () => {
    if (!assignModal || !selectedClassId || !assignSubjectId || !assignTeacherId) return;

    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {


      // Check if slot exists to update or insert
      const existing = timetableSlots.find(
        (s) => s.class_id === selectedClassId && s.day === assignModal.day && s.period_id === assignModal.period_id
      );

      let error;
      if (existing) {
        // Update
        const { error: err } = await client
          .from("timetable_slots")
          .update({ subject_id: assignSubjectId, teacher_id: assignTeacherId })
          .eq("id", existing.id);
        error = err;
      } else {
        // Insert
        const { error: err } = await client
          .from("timetable_slots")
          .insert({
            class_id: selectedClassId,
            day: assignModal.day,
            period_id: assignModal.period_id,
            subject_id: assignSubjectId,
            teacher_id: assignTeacherId
          });
        error = err;
      }

      if (error) throw error;

      setDbSuccess("Slot configured successfully!");
      setAssignModal(null);
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to save slot details");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");
    try {
      const { data, error } = await client
        .from("timetable_slots")
        .delete()
        .eq("id", slotId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Deletion failed: Slot not found or permission denied");
      }
      loadDatabase();
      setDbSuccess("Slot deleted successfully!");
    } catch (err: any) {
      setDbError(err.message || "Deletion failed");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Periods CRUD Operations
  const addPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPeriodNum === "" || !newPeriodName || !newPeriodStart || !newPeriodEnd) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const startTime = newPeriodStart.length === 5 ? `${newPeriodStart}:00` : newPeriodStart;
      const endTime = newPeriodEnd.length === 5 ? `${newPeriodEnd}:00` : newPeriodEnd;

      const { error } = await client.from("timetable_periods").insert({
        period_number: Number(newPeriodNum),
        name: newPeriodName,
        start_time: startTime,
        end_time: endTime,
        is_academic_period: newPeriodIsAcademic
      });
      if (error) throw error;

      setDbSuccess(`Added period ${newPeriodName}!`);
      setNewPeriodNum("");
      setNewPeriodName("");
      setNewPeriodStart("");
      setNewPeriodEnd("");
      setNewPeriodIsAcademic(true);
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add period");
    } finally {
      setLoading(false);
    }
  };

  // CSV Parsing helper
  const parseCSVText = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    return lines
      .map(line => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.length > 0 && row.some(cell => cell !== ""));
  };

  // File drag-and-drop / select handlers
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (file.type !== "text/csv" && !file.name.endsWith(".csv") && file.type !== "application/vnd.ms-excel") {
      setImportError("Please upload a valid CSV file.");
      return;
    }
    setImportError("");
    setImportSuccess("");
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
    };
    reader.onerror = () => {
      setImportError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const getPreviewRows = (): string[][] => {
    if (!csvText) return [];
    const rows = parseCSVText(csvText);
    return rows.slice(0, 4); // Header + first 3 data rows
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const resetCsvImportState = () => {
    setCsvModal(null);
    setCsvText("");
    setImportError("");
    setImportSuccess("");
    setSelectedFile(null);
    setIsDragging(false);
  };

  // CSV Bulk Import Handler
  const handleCsvImport = async () => {
    if (!csvModal || !csvText.trim()) return;

    setLoading(true);
    setImportError("");
    setImportSuccess("");

    try {
      const rows = parseCSVText(csvText);
      if (rows.length < 2) {
        setImportError("CSV must contain at least a header row and one data row.");
        setLoading(false);
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim());

      if (csvModal.type === "teachers") {
        const nameIdx = headers.indexOf("name");
        const pinIdx = headers.indexOf("pin");
        const deptIdx = headers.indexOf("department");

        if (nameIdx === -1 || pinIdx === -1) {
          setImportError("CSV must contain 'name' and 'pin' columns.");
          setLoading(false);
          return;
        }

        const dataToInsert = [];
        for (let i = 1; i < rows.length; i++) {
          const name = rows[i][nameIdx];
          const pin = rows[i][pinIdx];
          const departmentStr = deptIdx !== -1 && rows[i][deptIdx] ? rows[i][deptIdx].trim() : "General";
          if (!name || !pin) continue;
          if (!/^[0-9]{4}$/.test(pin)) {
            setImportError(`Row ${i + 1}: PIN must be exactly 4 digits. Got '${pin}'`);
            setLoading(false);
            return;
          }

          const matchedDept = departments.find(
            (d) => d.code.toLowerCase() === departmentStr.toLowerCase() ||
                   d.name.toLowerCase() === departmentStr.toLowerCase()
          );
          if (!matchedDept) {
            setImportError(`Row ${i + 1}: Department '${departmentStr}' not found. Please create it first.`);
            setLoading(false);
            return;
          }

          dataToInsert.push({ name, pin_hash: pin, department: matchedDept.code });
        }

        if (dataToInsert.length === 0) {
          setImportError("No records to import.");
          setLoading(false);
          return;
        }

        const { error } = await client.from("teachers").insert(dataToInsert);
        if (error) throw error;
        setImportSuccess(`Successfully imported ${dataToInsert.length} teachers!`);
      } else if (csvModal.type === "subjects") {
        const codeIdx = headers.indexOf("code");
        const nameIdx = headers.indexOf("name");
        let teacherIdx = headers.indexOf("assigned_teacher_name");
        if (teacherIdx === -1) teacherIdx = headers.indexOf("teacher_name");
        if (teacherIdx === -1) teacherIdx = headers.indexOf("teacher");

        if (codeIdx === -1 || nameIdx === -1) {
          setImportError("CSV must contain 'code' and 'name' columns.");
          setLoading(false);
          return;
        }

        const dataToInsert = [];
        for (let i = 1; i < rows.length; i++) {
          const code = rows[i][codeIdx];
          const name = rows[i][nameIdx];
          const teacherName = teacherIdx !== -1 ? rows[i][teacherIdx] : "";
          if (!code || !name) continue;

          let assigned_teacher_id = null;
          if (teacherName) {
            const t = teachers.find(
              (teach) => teach.name.toLowerCase() === teacherName.toLowerCase().trim()
            );
            if (!t) {
              setImportError(
                `Row ${i + 1}: Teacher '${teacherName}' not found in registered teachers.`
              );
              setLoading(false);
              return;
            }
            assigned_teacher_id = t.id;
          }
          dataToInsert.push({ code, name, assigned_teacher_id });
        }

        if (dataToInsert.length === 0) {
          setImportError("No records to import.");
          setLoading(false);
          return;
        }

        const { error } = await client.from("subjects").insert(dataToInsert);
        if (error) throw error;
        setImportSuccess(`Successfully imported ${dataToInsert.length} subjects!`);
      } else if (csvModal.type === "classes") {
        let deptIdx = headers.indexOf("department");
        if (deptIdx === -1) deptIdx = headers.indexOf("department_code");
        if (deptIdx === -1) deptIdx = headers.indexOf("dept");

        let yearIdx = headers.indexOf("year");
        if (yearIdx === -1) yearIdx = headers.indexOf("yr");

        let sectionIdx = headers.indexOf("section");
        if (sectionIdx === -1) sectionIdx = headers.indexOf("sec");

        let passwordIdx = headers.indexOf("password");
        if (passwordIdx === -1) passwordIdx = headers.indexOf("rep_password");

        if (deptIdx === -1 || yearIdx === -1 || passwordIdx === -1) {
          setImportError("CSV must contain 'department', 'year', and 'password' columns.");
          setLoading(false);
          return;
        }

        const dataToInsert = [];
        for (let i = 1; i < rows.length; i++) {
          const deptStr = rows[i][deptIdx];
          const yearStr = rows[i][yearIdx] ? rows[i][yearIdx].trim().replace(/\s*yr/i, "").toUpperCase() : "";
          const sectionStr = sectionIdx !== -1 && rows[i][sectionIdx] ? rows[i][sectionIdx].trim().toUpperCase() : "";
          const password = rows[i][passwordIdx];

          if (!deptStr || !yearStr || !password) continue;

          if (!["I", "II", "III", "IV"].includes(yearStr)) {
            setImportError(`Row ${i + 1}: Year must be I, II, III, or IV. Got '${yearStr}'`);
            setLoading(false);
            return;
          }

          const dept = departments.find(
            (d) => d.code.toLowerCase() === deptStr.toLowerCase() || d.name.toLowerCase() === deptStr.toLowerCase()
          );
          if (!dept) {
            setImportError(`Row ${i + 1}: Department '${deptStr}' not found. Please create the department first.`);
            setLoading(false);
            return;
          }

          const finalName = sectionStr
            ? `${dept.code} - ${yearStr} Yr - ${sectionStr}`
            : `${dept.code} - ${yearStr} Yr`;

          dataToInsert.push({
            name: finalName,
            rep_password: password,
            department_id: dept.id,
            year: yearStr
          });
        }

        if (dataToInsert.length === 0) {
          setImportError("No records to import.");
          setLoading(false);
          return;
        }

        for (const item of dataToInsert) {
          const { error } = await client.rpc("execute_sql_query", {
            query_text: `INSERT INTO classes (name, rep_password_hash, department_id, year) VALUES ('${item.name}', crypt('${item.rep_password}', gen_salt('bf', 10)), '${item.department_id}', '${item.year}') ON CONFLICT (name) DO UPDATE SET rep_password_hash = crypt('${item.rep_password}', gen_salt('bf', 10)), department_id = '${item.department_id}', year = '${item.year}'`
          });
          if (error) {
            // Fallback basic upsert
            await client.from("classes").upsert({
              name: item.name,
              rep_password_hash: item.rep_password,
              department_id: item.department_id,
              year: item.year
            }, { onConflict: "name" });
          }
        }

        setImportSuccess(`Successfully imported ${dataToInsert.length} classes!`);
      } else if (csvModal.type === "students") {
        let regIdx = headers.indexOf("register_number");
        if (regIdx === -1) regIdx = headers.indexOf("reg_no");
        if (regIdx === -1) regIdx = headers.indexOf("register_no");

        const nameIdx = headers.indexOf("name");

        let classIdx = headers.indexOf("class_name");
        if (classIdx === -1) classIdx = headers.indexOf("class");

        let deptIdx = headers.indexOf("department");
        if (deptIdx === -1) deptIdx = headers.indexOf("department_code");
        if (deptIdx === -1) deptIdx = headers.indexOf("dept");

        let yearIdx = headers.indexOf("year");
        if (yearIdx === -1) yearIdx = headers.indexOf("yr");

        let sectionIdx = headers.indexOf("section");
        if (sectionIdx === -1) sectionIdx = headers.indexOf("sec");

        if (regIdx === -1 || nameIdx === -1 || (classIdx === -1 && (deptIdx === -1 || yearIdx === -1))) {
          setImportError(
            "CSV must contain 'register_number', 'name', and either 'class_name' or ('department' and 'year') columns."
          );
          setLoading(false);
          return;
        }

        const dataToInsert = [];
        for (let i = 1; i < rows.length; i++) {
          const reg = rows[i][regIdx];
          const name = rows[i][nameIdx];
          if (!reg || !name) continue;

          if (reg.length !== 16 || !/^\d+$/.test(reg)) {
            setImportError(
              `Row ${i + 1}: Register number must be exactly 16 digits. Got '${reg}'`
            );
            setLoading(false);
            return;
          }

          let cls = null;
          if (classIdx !== -1 && rows[i][classIdx]) {
            const className = rows[i][classIdx].trim();
            cls = classes.find(
              (c) => c.name.toLowerCase() === className.toLowerCase()
            );
          } else {
            const deptStr = deptIdx !== -1 && rows[i][deptIdx] ? rows[i][deptIdx].trim() : "";
            const yearStr = yearIdx !== -1 && rows[i][yearIdx] ? rows[i][yearIdx].trim().replace(/\s*yr/i, "").toUpperCase() : "";
            const sectionStr = sectionIdx !== -1 && rows[i][sectionIdx] ? rows[i][sectionIdx].trim().toUpperCase() : "";

            const dept = departments.find(
              (d) => d.code.toLowerCase() === deptStr.toLowerCase() || d.name.toLowerCase() === deptStr.toLowerCase()
            );
            if (dept && yearStr) {
              const expectedName = sectionStr
                ? `${dept.code} - ${yearStr} Yr - ${sectionStr}`
                : `${dept.code} - ${yearStr} Yr`;
              cls = classes.find(
                (c) => c.name.toLowerCase() === expectedName.toLowerCase()
              );
            }
          }

          if (!cls) {
            const classInfo = classIdx !== -1 && rows[i][classIdx]
              ? `Class '${rows[i][classIdx]}'`
              : `Class for Dept: '${rows[i][deptIdx]}', Year: '${rows[i][yearIdx]}', Section: '${rows[i][sectionIdx] || ""}'`;
            setImportError(
              `Row ${i + 1}: ${classInfo} not found. Please create the class first.`
            );
            setLoading(false);
            return;
          }

          dataToInsert.push({ register_number: reg, name, class_id: cls.id });
        }

        if (dataToInsert.length === 0) {
          setImportError("No records to import.");
          setLoading(false);
          return;
        }

        const { error } = await client.from("students").insert(dataToInsert);
        if (error) throw error;
        setImportSuccess(`Successfully imported ${dataToInsert.length} students!`);
      } else if (csvModal.type === "periods") {
        let numIdx = headers.indexOf("period_number");
        if (numIdx === -1) numIdx = headers.indexOf("period_no");
        if (numIdx === -1) numIdx = headers.indexOf("number");

        const nameIdx = headers.indexOf("name");

        let startIdx = headers.indexOf("start_time");
        if (startIdx === -1) startIdx = headers.indexOf("start");

        let endIdx = headers.indexOf("end_time");
        if (endIdx === -1) endIdx = headers.indexOf("end");

        let acadIdx = headers.indexOf("is_academic_period");
        if (acadIdx === -1) acadIdx = headers.indexOf("is_academic");
        if (acadIdx === -1) acadIdx = headers.indexOf("academic");

        if (
          numIdx === -1 ||
          nameIdx === -1 ||
          startIdx === -1 ||
          endIdx === -1 ||
          acadIdx === -1
        ) {
          setImportError(
            "CSV must contain 'period_number', 'name', 'start_time', 'end_time', and 'is_academic_period' columns."
          );
          setLoading(false);
          return;
        }

        const dataToInsert = [];
        for (let i = 1; i < rows.length; i++) {
          const pNumStr = rows[i][numIdx];
          const name = rows[i][nameIdx];
          const start = rows[i][startIdx];
          const end = rows[i][endIdx];
          const acadStr = rows[i][acadIdx];
          if (!pNumStr || !name || !start || !end || !acadStr) continue;

          const period_number = parseInt(pNumStr, 10);
          if (isNaN(period_number)) {
            setImportError(`Row ${i + 1}: Period number must be an integer.`);
            setLoading(false);
            return;
          }

          const is_academic_period =
            acadStr.toLowerCase() === "true" ||
            acadStr === "1" ||
            acadStr.toLowerCase() === "yes";

          const startTime = start.length === 5 ? `${start}:00` : start;
          const endTime = end.length === 5 ? `${end}:00` : end;

          dataToInsert.push({
            period_number,
            name,
            start_time: startTime,
            end_time: endTime,
            is_academic_period,
          });
        }

        if (dataToInsert.length === 0) {
          setImportError("No records to import.");
          setLoading(false);
          return;
        }

        const { error } = await client
          .from("timetable_periods")
          .upsert(dataToInsert, { onConflict: "period_number" });
        if (error) throw error;
        setImportSuccess(`Successfully imported/updated ${dataToInsert.length} periods!`);
      }

      setCsvText("");
      setSelectedFile(null);
      loadDatabase();
    } catch (err: any) {
      setImportError(err.message || "Failed to process and import CSV data.");
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || newTeacherPin.length !== 4) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {

      
      // Hashing the teacher PIN using crypt() server-side (p_pin_hash computed by DB)
      const { error } = await client.rpc("execute_sql_query", {
        query_text: `INSERT INTO teachers (name, pin_hash, department) VALUES ('${newTeacherName}', crypt('${newTeacherPin}', gen_salt('bf', 10)), '${newTeacherDept}')`
      });

      // RPC call fallback if execute_sql_query is disabled or restricted
      if (error) {
        // We'll fall back to standard raw insert and hash in postgres via RPC function
        const { error: insertErr } = await client.from("teachers").insert({
          name: newTeacherName,
          pin_hash: newTeacherPin,
          department: newTeacherDept
        });
        if (insertErr) throw insertErr;
      }

      setDbSuccess(`Added teacher ${newTeacherName}!`);
      setNewTeacherName("");
      setNewTeacherPin("");
      setNewTeacherDept("General");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add teacher");
    } finally {
      setLoading(false);
    }
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCode || !newSubName || !newSubTeacherId) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {

      const { error } = await client.from("subjects").insert({
        code: newSubCode,
        name: newSubName,
        assigned_teacher_id: newSubTeacherId
      });
      if (error) throw error;

      setDbSuccess(`Added subject ${newSubName}!`);
      setNewSubCode("");
      setNewSubName("");
      setNewSubTeacherId("");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add subject");
    } finally {
      setLoading(false);
    }
  };

  const addDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const { error } = await client.from("departments").insert({
        name: newDeptName.trim(),
        code: newDeptCode.trim().toUpperCase()
      });
      if (error) throw error;

      setDbSuccess(`Added department ${newDeptName}!`);
      setNewDeptName("");
      setNewDeptCode("");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add department");
    } finally {
      setLoading(false);
    }
  };

  const addClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassDeptId) {
      setDbError("Please select a department");
      return;
    }
    if (!newClassYear) {
      setDbError("Please select an academic year");
      return;
    }
    if (!newClassPassword.trim()) {
      setDbError("Please enter a representative password");
      return;
    }
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const dept = departments.find(d => d.id === newClassDeptId);
      if (!dept) throw new Error("Selected department not found");

      const finalName = newClassSection.trim()
        ? `${dept.code} - ${newClassYear} Yr - ${newClassSection.trim()}`
        : `${dept.code} - ${newClassYear} Yr`;

      // Hashing the password via crypt() in DB SQL execution
      const { error } = await client.rpc("execute_sql_query", {
        query_text: `INSERT INTO classes (name, rep_password_hash, department_id, year) VALUES ('${finalName}', crypt('${newClassPassword}', gen_salt('bf', 10)), '${newClassDeptId}', '${newClassYear}')`
      });

      if (error) {
        // Fallback basic insert
        const { error: insertErr } = await client.from("classes").insert({
          name: finalName,
          rep_password_hash: newClassPassword,
          department_id: newClassDeptId,
          year: newClassYear
        });
        if (insertErr) throw insertErr;
      }

      setDbSuccess(`Created class ${finalName}!`);
      setNewClassSection("");
      setNewClassPassword("reppass123");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentReg.length !== 16 || !newStudentName || !newStudentClassId) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {

      const { error } = await client.from("students").insert({
        register_number: newStudentReg,
        name: newStudentName,
        class_id: newStudentClassId
      });
      if (error) throw error;

      setDbSuccess(`Registered student ${newStudentName}!`);
      setNewStudentReg("");
      setNewStudentName("");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const addAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName || !newYearStart || !newYearEnd) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const { error } = await client.from("academic_years").insert({
        name: newYearName,
        start_date: newYearStart,
        end_date: newYearEnd,
        is_active: academicYears.length === 0
      });
      if (error) throw error;

      setDbSuccess(`Added academic year ${newYearName}!`);
      setNewYearName("");
      setNewYearStart("");
      setNewYearEnd("");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add academic year");
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const { error } = await client.from("holidays").insert({
        date: newHolidayDate,
        name: newHolidayName
      });
      if (error) throw error;

      setDbSuccess(`Added holiday: ${newHolidayName}!`);
      setNewHolidayDate("");
      setNewHolidayName("");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to add holiday");
    } finally {
      setLoading(false);
    }
  };

  const toggleSaturdayHoliday = async (dateStr: string) => {
    setLoading(true);
    setDbError("");
    setDbSuccess("");
    try {
      const existingHol = holidaysList.find((h) => h.date === dateStr);
      if (existingHol) {
        const { error } = await client.from("holidays").delete().eq("id", existingHol.id);
        if (error) throw error;
        setDbSuccess(`Removed Saturday Holiday for ${dateStr}!`);
      } else {
        const { error } = await client.from("holidays").insert({
          date: dateStr,
          name: "Saturday Holiday"
        });
        if (error) throw error;
        setDbSuccess(`Marked ${dateStr} as Saturday Holiday!`);
      }
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to toggle Saturday holiday");
    } finally {
      setLoading(false);
    }
  };

  const getSaturdaysInActiveYear = () => {
    const activeYear = academicYears.find((y) => y.is_active);
    if (!activeYear) return [];
    try {
      const start = new Date(activeYear.start_date);
      const end = new Date(activeYear.end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
      const saturdays: string[] = [];
      let current = new Date(start);
      let count = 0;
      while (current.getDay() !== 6 && count < 10) {
        current.setDate(current.getDate() + 1);
        count++;
      }
      count = 0;
      while (current <= end && count < 100) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        saturdays.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 7);
        count++;
      }
      return saturdays;
    } catch (_err) {
      return [];
    }
  };

  const handleSetActiveYear = async (id: string) => {
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const { error: deactivateError } = await client
        .from("academic_years")
        .update({ is_active: false })
        .neq("id", id);
      if (deactivateError) throw deactivateError;

      const { error: activateError } = await client
        .from("academic_years")
        .update({ is_active: true })
        .eq("id", id);
      if (activateError) throw activateError;

      setDbSuccess("Academic year activated successfully!");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to set active academic year");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (table: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this record from ${table}?`)) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");
    try {
      const { data, error } = await client
        .from(table)
        .delete()
        .eq(table === "students" ? "register_number" : "id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Deletion failed: Record not found or permission denied");
      }
      setDbSuccess("Record deleted successfully!");
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Deletion failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setLoading(true);
    setDbError("");
    setDbSuccess("");

    try {
      const { type, id, data } = editingRecord;

      if (type === "teacher") {
        if (!data.name) throw new Error("Name is required");
        let error;
        if (data.pin) {
          if (data.pin.length !== 4) throw new Error("PIN must be exactly 4 digits");
          const { error: rpcErr } = await client.rpc("execute_sql_query", {
            query_text: `UPDATE teachers SET name = '${data.name}', department = '${data.department}', pin_hash = crypt('${data.pin}', gen_salt('bf', 10)) WHERE id = '${id}'`
          });
          error = rpcErr;
          if (error) {
            const { error: updateErr } = await client
              .from("teachers")
              .update({ name: data.name, department: data.department, pin_hash: data.pin })
              .eq("id", id);
            error = updateErr;
          }
        } else {
          const { error: updateErr } = await client
            .from("teachers")
            .update({ name: data.name, department: data.department })
            .eq("id", id);
          error = updateErr;
        }
        if (error) throw error;
        setDbSuccess("Teacher updated successfully!");

      } else if (type === "subject") {
        if (!data.code || !data.name || !data.assigned_teacher_id) {
          throw new Error("Code, Name, and Assigned Teacher are required");
        }
        const { error } = await client
          .from("subjects")
          .update({
            code: data.code,
            name: data.name,
            assigned_teacher_id: data.assigned_teacher_id
          })
          .eq("id", id);
        if (error) throw error;
        setDbSuccess("Subject updated successfully!");

      } else if (type === "department") {
        if (!data.name || !data.code) throw new Error("Name and Code are required");
        const { error } = await client
          .from("departments")
          .update({
            name: data.name,
            code: data.code.toUpperCase()
          })
          .eq("id", id);
        if (error) throw error;
        setDbSuccess("Department updated successfully!");

      } else if (type === "class") {
        if (!data.department_id || !data.year) throw new Error("Department and Year are required");
        const dept = departments.find(d => d.id === data.department_id);
        if (!dept) throw new Error("Selected department not found");

        const finalName = data.section && data.section.trim()
          ? `${dept.code} - ${data.year} Yr - ${data.section.trim()}`
          : `${dept.code} - ${data.year} Yr`;

        let error;
        if (data.password) {
          const { error: rpcErr } = await client.rpc("execute_sql_query", {
            query_text: `UPDATE classes SET name = '${finalName}', department_id = '${data.department_id}', year = '${data.year}', rep_password_hash = crypt('${data.password}', gen_salt('bf', 10)) WHERE id = '${id}'`
          });
          error = rpcErr;
          if (error) {
            const { error: updateErr } = await client
              .from("classes")
              .update({
                name: finalName,
                department_id: data.department_id,
                year: data.year,
                rep_password_hash: data.password
              })
              .eq("id", id);
            error = updateErr;
          }
        } else {
          const { error: updateErr } = await client
            .from("classes")
            .update({
              name: finalName,
              department_id: data.department_id,
              year: data.year
            })
            .eq("id", id);
          error = updateErr;
        }
        if (error) throw error;
        setDbSuccess("Class updated successfully!");

      } else if (type === "student") {
        if (!data.name || !data.class_id || !data.register_number) {
          throw new Error("Name, Register Number, and Class are required");
        }
        const { error } = await client
          .from("students")
          .update({
            register_number: data.register_number,
            name: data.name,
            class_id: data.class_id
          })
          .eq("register_number", id);
        if (error) throw error;
        setDbSuccess("Student updated successfully!");

      } else if (type === "period") {
        if (!data.period_number || !data.name || !data.start_time || !data.end_time) {
          throw new Error("All fields are required");
        }
        const { error } = await client
          .from("timetable_periods")
          .update({
            period_number: parseInt(data.period_number, 10),
            name: data.name,
            start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
            end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
            is_academic_period: data.is_academic_period
          })
          .eq("id", id);
        if (error) throw error;
        setDbSuccess("Period updated successfully!");
      } else if (type === "academic_year") {
        if (!data.name || !data.start_date || !data.end_date) {
          throw new Error("All academic year fields are required");
        }
        const { error } = await client
          .from("academic_years")
          .update({
            name: data.name,
            start_date: data.start_date,
            end_date: data.end_date,
          })
          .eq("id", id);
        if (error) throw error;
        setDbSuccess("Academic year updated successfully!");
      } else if (type === "holiday") {
        if (!data.date || !data.name) {
          throw new Error("All fields are required");
        }
        const { error } = await client
          .from("holidays")
          .update({
            date: data.date,
            name: data.name,
          })
          .eq("id", id);
        if (error) throw error;
        setDbSuccess("Holiday updated successfully!");
      }

      setEditingRecord(null);
      loadDatabase();
    } catch (err: any) {
      setDbError(err.message || "Failed to update record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[85vh] flex flex-col justify-start py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-body"
        >
          <ArrowLeft size={16} className="mr-2" />
          Portals
        </button>
        <span className="font-mono text-xs tracking-widest text-teal-accent">ADMIN DASHBOARD</span>
      </div>

      {!isAuthenticated ? (
        /* Admin Login */
        <div className="glass-panel rounded-2xl p-8 max-w-md mx-auto w-full">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-teal-accent/10 rounded-xl flex items-center justify-center text-teal-accent mb-3">
              <Shield size={24} />
            </div>
            <h1 className="font-display font-bold text-2xl mb-1 text-center">System Administration</h1>
            <p className="text-text-muted text-sm text-center">Access restricted to college administrators</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                placeholder="admin@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-canvas border border-zinc-800 rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-teal-accent font-body"
              />
            </div>

            <div>
              <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-canvas border border-zinc-800 rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-teal-accent"
              />
            </div>

            {authError && <p className="text-crimson-alert text-xs font-body text-center">{authError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3 rounded-xl transition-all active:translate-y-[1px]"
            >
              {loading ? "Logging in..." : "Access Control Center"}
            </button>
          </form>
        </div>
      ) : (
        /* Authenticated Admin Control Panel */
        <div className="flex flex-col gap-6">
          {/* Dashboard Header */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="font-mono text-xs text-teal-accent font-semibold tracking-wider">ROOT ACCESS CONTROL</span>
              <h2 className="font-display font-bold text-2xl mt-0.5">College Schedule & Registry</h2>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-text-muted hover:text-crimson-alert border border-zinc-800 hover:border-crimson-alert bg-zinc-950 px-4 py-2 rounded-xl transition-colors font-body"
            >
              Close Admin Session
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-800 gap-6 overflow-x-auto pb-0.5">
            {[
              { id: "timetable", label: "Timetable Grid", icon: Calendar },
              { id: "teachers", label: "Teachers", icon: UserSquare },
              { id: "subjects", label: "Subjects", icon: BookOpen },
              { id: "classes", label: "Departments", icon: Shield },
              { id: "students", label: "Students", icon: Users },
              { id: "periods", label: "Periods", icon: Clock },
              { id: "settings", label: "General Settings", icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-3 font-body text-sm font-semibold tracking-wide border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-teal-accent text-teal-accent"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Global Statistics Cards */}
          {adminStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="glass-panel rounded-2xl p-5 border border-zinc-800/40 bg-zinc-950/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-teal-accent">
                  <Users size={48} />
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-body font-semibold">Total Students</p>
                <p className="text-3xl font-display font-black text-text-primary mt-2">{adminStats.totalStudents}</p>
                <p className="text-[10px] text-text-muted font-body mt-1">Registered across all departments</p>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-zinc-800/40 bg-zinc-950/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-teal-accent">
                  <CheckCircle2 size={48} />
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-body font-semibold">Present Today</p>
                <p className="text-3xl font-display font-black text-teal-accent mt-2">{adminStats.presentToday}</p>
                <p className="text-[10px] text-text-muted font-body mt-1">
                  Active sessions log on {adminStats.date}
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-zinc-800/40 bg-zinc-950/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 text-crimson-alert">
                  <X size={48} />
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-body font-semibold">Absent Today</p>
                <p className="text-3xl font-display font-black text-crimson-alert mt-2">{adminStats.absentToday}</p>
                <p className="text-[10px] text-text-muted font-body mt-1">
                  Absentees on {adminStats.date}
                </p>
              </div>
            </div>
          )}

          {dbError && <p className="text-crimson-alert text-xs text-center font-body">{dbError}</p>}
          {dbSuccess && <p className="text-teal-accent text-xs text-center font-body">{dbSuccess}</p>}

          {/* Timetable tab */}
          {activeTab === "timetable" && (
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/40">
                <h3 className="font-display font-bold text-lg">Department Schedule Editor</h3>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-xs rounded-xl py-2 px-4 focus:outline-none focus:border-teal-accent font-body"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid representation */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-3 text-[10px] text-text-muted font-mono uppercase tracking-widest w-24">Day</th>
                      {periodsList.map((p) => (
                        <th key={p.id} className="p-3 text-[10px] text-text-muted font-mono uppercase tracking-widest">
                          {p.name}
                          <span className="block text-[8px] text-text-muted/60 normal-case font-body font-normal mt-0.5">
                            {p.start_time.substring(0, 5)} - {p.end_time.substring(0, 5)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day} className="border-b border-zinc-900 hover:bg-zinc-950/20">
                        <td className="p-3 font-display font-semibold text-sm text-text-primary">{day}</td>
                        {periodsList.map((period) => {
                          const slot = getSlotDetails(day, period.id);
                          if (!period.is_academic_period) {
                            return (
                              <td key={period.id} className="p-2">
                                <div className="bg-zinc-950 border border-zinc-900 text-center py-2 px-1 rounded-lg text-[10px] font-body font-medium text-text-muted/60 select-none flex flex-col justify-center items-center h-full min-h-[46px] cursor-not-allowed">
                                  <span className="truncate w-full font-semibold">{period.name}</span>
                                  <span className="text-[8px] opacity-60 font-mono mt-0.5 leading-none">
                                    {period.start_time.substring(0, 5)}-{period.end_time.substring(0, 5)}
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={period.id} className="p-2">
                              {slot ? (
                                <div className="bg-zinc-900 border border-zinc-800/60 p-1.5 rounded-lg text-[10px] flex flex-col justify-between min-h-[46px]">
                                  <div className="flex items-center justify-between w-full gap-1">
                                    <p className="font-bold text-text-primary truncate">{slot.subject_code}</p>
                                    <button
                                      onClick={() => handleDeleteSlot(slot.slot_id)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors flex-shrink-0"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-center text-[8px] text-text-muted mt-0.5 gap-1">
                                    <span className="truncate max-w-[55%]">{slot.subject_name}</span>
                                    <span className="text-teal-accent truncate max-w-[40%] font-medium">{slot.teacher_name}</span>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenAssign(day, period.id)}
                                  className="w-full border border-dashed border-zinc-800 hover:border-teal-accent hover:bg-teal-accent/5 rounded-lg py-2.5 text-center text-zinc-600 hover:text-teal-accent transition-all text-xs font-body font-semibold"
                                >
                                  + Assign
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Teachers tab */}
          {activeTab === "teachers" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                <h3 className="font-display font-bold text-lg mb-4">Add Teacher</h3>
                <form onSubmit={addTeacher} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Dr. Alan Turing"
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Security PIN (4 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={newTeacherPin}
                      onChange={(e) => setNewTeacherPin(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Department
                    </label>
                    <select
                      value={newTeacherDept}
                      onChange={(e) => setNewTeacherDept(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.code}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Add Teacher Profile
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                  <h3 className="font-display font-bold text-lg">Registered Teacher Profiles</h3>
                  <button
                    onClick={() => setCsvModal({ type: "teachers" })}
                    className="text-xs text-teal-accent border border-teal-accent/20 bg-teal-accent/5 hover:bg-teal-accent/10 px-3 py-1 rounded-xl font-body font-semibold transition-all"
                  >
                    Import CSV
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const deptTeachers = teachers.filter(t => 
                      (t.department || "General").toLowerCase() === dept.code.toLowerCase() ||
                      (t.department || "General").toLowerCase() === dept.name.toLowerCase()
                    );
                    const isExpanded = !!expandedFolders[`teachers_${dept.id}`];
                    return (
                      <div key={dept.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`teachers_${dept.id}`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">{dept.name}</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {deptTeachers.length} Teachers
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {deptTeachers.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No teachers registered in this department.</p>
                            ) : (
                              deptTeachers.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <span className="font-body text-xs font-semibold text-text-primary">{t.name}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "teacher",
                                        id: t.id,
                                        data: { name: t.name, department: t.department || "General", pin: "" }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Teacher"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("teachers", t.id)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Teacher"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Folder for All Teachers */}
                  {(() => {
                    const isExpanded = !!expandedFolders[`teachers_all`];
                    return (
                      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`teachers_all`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">All Registered Teachers</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {teachers.length} Total
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {teachers.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No teachers registered.</p>
                            ) : (
                              teachers.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-body text-xs font-semibold text-text-primary">{t.name}</span>
                                    <span className="font-mono text-[9px] text-teal-accent">{t.department || "General"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "teacher",
                                        id: t.id,
                                        data: { name: t.name, department: t.department || "General", pin: "" }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Teacher"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("teachers", t.id)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Teacher"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Subjects tab */}
          {activeTab === "subjects" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                <h3 className="font-display font-bold text-lg mb-4">Register Subject</h3>
                <form onSubmit={addSubject} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      placeholder="CS-301"
                      value={newSubCode}
                      onChange={(e) => setNewSubCode(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      placeholder="Operating Systems"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Assign Default Teacher
                    </label>
                    <select
                      value={newSubTeacherId}
                      onChange={(e) => setNewSubTeacherId(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Create Subject
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                  <h3 className="font-display font-bold text-lg">Subject Catalog</h3>
                  <button
                    onClick={() => setCsvModal({ type: "subjects" })}
                    className="text-xs text-teal-accent border border-teal-accent/20 bg-teal-accent/5 hover:bg-teal-accent/10 px-3 py-1 rounded-xl font-body font-semibold transition-all"
                  >
                    Import CSV
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {classes.map((cls) => {
                    const classSubjects = subjects.filter(sub => 
                      timetableSlots.some(s => s.class_id === cls.id && s.subject_id === sub.id)
                    );
                    const isExpanded = !!expandedFolders[`subjects_${cls.id}`];
                    return (
                      <div key={cls.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`subjects_${cls.id}`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">{cls.name}</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {classSubjects.length} Scheduled
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {classSubjects.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No subjects assigned to this class.</p>
                            ) : (
                              classSubjects.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <div>
                                    <span className="font-mono text-xs text-teal-accent font-semibold mr-2">{s.code}</span>
                                    <span className="font-body font-semibold text-text-primary">{s.name}</span>
                                    <p className="text-[9px] text-text-muted mt-0.5">Instructor: {s.teacher_name}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "subject",
                                        id: s.id,
                                        data: { code: s.code, name: s.name, assigned_teacher_id: s.assigned_teacher_id }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Subject"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("subjects", s.id)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Subject"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Folder for All Subjects */}
                  {(() => {
                    const isExpanded = !!expandedFolders[`subjects_all`];
                    return (
                      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`subjects_all`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">All Registered Subjects</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {subjects.length} Total
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {subjects.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No subjects registered.</p>
                            ) : (
                              subjects.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <div>
                                    <span className="font-mono text-xs text-teal-accent font-semibold mr-2">{s.code}</span>
                                    <span className="font-body font-semibold text-text-primary">{s.name}</span>
                                    <p className="text-[9px] text-text-muted mt-0.5">Instructor: {s.teacher_name}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "subject",
                                        id: s.id,
                                        data: { code: s.code, name: s.name, assigned_teacher_id: s.assigned_teacher_id }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Subject"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("subjects", s.id)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Subject"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Departments & Classes tab */}
          {activeTab === "classes" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Forms Column */}
              <div className="flex flex-col gap-6 md:col-span-1">
                {/* Form 1: Add Department */}
                <div className="glass-panel rounded-2xl p-6 h-fit">
                  <h3 className="font-display font-bold text-lg mb-4">Add Department</h3>
                  <form onSubmit={addDepartment} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Department Name
                      </label>
                      <input
                        type="text"
                        placeholder="Computer Science & Eng"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Department Code (e.g. CSE)
                      </label>
                      <input
                        type="text"
                        placeholder="CSE"
                        value={newDeptCode}
                        onChange={(e) => setNewDeptCode(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Create Department
                    </button>
                  </form>
                </div>

                {/* Form 2: Add Class */}
                <div className="glass-panel rounded-2xl p-6 h-fit">
                  <h3 className="font-display font-bold text-lg mb-4">Add Class</h3>
                  <form onSubmit={addClass} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Select Department
                      </label>
                      <select
                        value={newClassDeptId}
                        onChange={(e) => setNewClassDeptId(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
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
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Academic Year
                      </label>
                      <select
                        value={newClassYear}
                        onChange={(e) => setNewClassYear(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                      >
                        <option value="I">I Year</option>
                        <option value="II">II Year</option>
                        <option value="III">III Year</option>
                        <option value="IV">IV Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Section / Suffix (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. A, B or leave blank"
                        value={newClassSection}
                        onChange={(e) => setNewClassSection(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Rep Shared Password
                      </label>
                      <input
                        type="password"
                        placeholder="reppass123"
                        value={newClassPassword}
                        onChange={(e) => setNewClassPassword(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Add Class
                    </button>
                  </form>
                </div>
              </div>

              {/* List Column */}
              <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                  <h3 className="font-display font-bold text-lg">Registered Departments & Classes</h3>
                  <button
                    onClick={() => setCsvModal({ type: "classes" })}
                    className="text-xs text-teal-accent border border-teal-accent/20 bg-teal-accent/5 hover:bg-teal-accent/10 px-3 py-1 rounded-xl font-body font-semibold transition-all"
                  >
                    Import CSV
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
                  {departments.map((dept) => {
                    const deptClasses = classes.filter((c) => c.department_id === dept.id);
                    const isExpanded = !!expandedFolders[`dept_folder_${dept.id}`];
                    return (
                      <div key={dept.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`dept_folder_${dept.id}`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">{dept.name} ({dept.code})</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {deptClasses.length} Classes
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-4 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-3 text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-text-muted uppercase tracking-wider font-body">Department Code</span>
                              <span className="font-mono text-text-primary font-semibold">{dept.code}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-text-muted uppercase tracking-wider font-body">Classes under this Department</span>
                              {deptClasses.length === 0 ? (
                                <p className="text-[10px] text-text-muted italic py-1">No classes added to this department yet.</p>
                              ) : (
                                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                                  {deptClasses.map((c) => (
                                    <div
                                      key={c.id}
                                      className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-body font-semibold text-text-primary">{c.name}</span>
                                        <span className="font-mono text-[9px] text-text-muted">Year: {c.year}</span>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const sectionMatch = c.name.match(/-\s*([A-Za-z0-9])$/);
                                            const sectionVal = sectionMatch ? sectionMatch[1] : "";
                                            setEditingRecord({
                                              type: "class",
                                              id: c.id,
                                              data: {
                                                department_id: c.department_id || dept.id,
                                                year: c.year || "I",
                                                section: sectionVal,
                                                password: ""
                                              }
                                            });
                                          }}
                                          className="text-xs text-text-primary border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 px-2 py-1.5 rounded-lg transition-colors font-body"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteRecord("classes", c.id)}
                                          className="text-xs text-crimson-alert border border-crimson-alert/20 bg-crimson-alert/5 hover:bg-crimson-alert/10 px-2 py-1.5 rounded-lg transition-colors font-body"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end items-center mt-2 pt-2 border-t border-zinc-800/30">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord({
                                    type: "department",
                                    id: dept.id,
                                    data: { name: dept.name, code: dept.code }
                                  })}
                                  className="text-xs text-text-primary border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 px-3 py-1.5 rounded-xl font-body font-semibold transition-all"
                                >
                                  Edit Department
                                </button>
                                <button
                                  onClick={() => deleteRecord("departments", dept.id)}
                                  className="text-xs text-crimson-alert border border-crimson-alert/20 bg-crimson-alert/5 hover:bg-crimson-alert/10 px-3 py-1.5 rounded-xl font-body font-semibold transition-all"
                                >
                                  Delete Department
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Students tab */}
          {activeTab === "students" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                <h3 className="font-display font-bold text-lg mb-4">Register Student</h3>
                <form onSubmit={addStudent} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Register Number (16 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="2026010101010101"
                      value={newStudentReg}
                      onChange={(e) => setNewStudentReg(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Student Name
                    </label>
                    <input
                      type="text"
                      placeholder="Aravind Swamy"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Department Assignment
                    </label>
                    <select
                      value={newStudentClassId}
                      onChange={(e) => setNewStudentClassId(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    >
                      <option value="">Select Department</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Register Student
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                  <h3 className="font-display font-bold text-lg">Student Registry</h3>
                  <button
                    onClick={() => setCsvModal({ type: "students" })}
                    className="text-xs text-teal-accent border border-teal-accent/20 bg-teal-accent/5 hover:bg-teal-accent/10 px-3 py-1 rounded-xl font-body font-semibold transition-all"
                  >
                    Import CSV
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {classes.map((cls) => {
                    const classStudents = students.filter(s => s.class_id === cls.id);
                    const isExpanded = !!expandedFolders[`students_${cls.id}`];
                    return (
                      <div key={cls.id} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`students_${cls.id}`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">{cls.name}</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {classStudents.length} Students
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {classStudents.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No students registered in this class.</p>
                            ) : (
                              classStudents.map((s) => (
                                <div
                                  key={s.register_number}
                                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <div>
                                    <span className="font-body font-semibold text-text-primary">{s.name}</span>
                                    <p className="text-[9px] text-text-muted font-mono mt-0.5">{s.register_number}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "student",
                                        id: s.register_number,
                                        data: { register_number: s.register_number, name: s.name, class_id: s.class_id }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Student"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("students", s.register_number)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Student"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Folder for All Students */}
                  {(() => {
                    const isExpanded = !!expandedFolders[`students_all`];
                    return (
                      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                        <button
                          type="button"
                          onClick={() => toggleFolder(`students_all`)}
                          className="w-full flex items-center justify-between p-3 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen size={15} className={isExpanded ? "text-teal-accent" : "text-text-muted"} />
                            <span className="font-body text-xs font-bold text-text-primary">All Registered Students</span>
                            <span className="text-[9px] text-text-muted font-mono uppercase bg-zinc-950 px-1.5 py-0.25 rounded">
                              {students.length} Total
                            </span>
                          </div>
                          <span className="text-zinc-600 text-xs font-mono">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950/10 border-t border-zinc-900/60 flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {students.length === 0 ? (
                              <p className="text-[10px] text-text-muted font-body italic py-1">No students registered.</p>
                            ) : (
                              students.map((s) => (
                                <div
                                  key={s.register_number}
                                  className="flex items-center justify-between p-2.5 bg-zinc-900/30 border border-zinc-800/40 rounded-lg text-xs"
                                >
                                  <div>
                                    <span className="font-body font-semibold text-text-primary">{s.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="font-mono text-[9px] text-text-muted">{s.register_number}</span>
                                      <span className="font-mono text-[9px] bg-zinc-900 text-teal-accent px-1.5 py-0.25 rounded">
                                        {s.class_name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRecord({
                                        type: "student",
                                        id: s.register_number,
                                        data: { register_number: s.register_number, name: s.name, class_id: s.class_id }
                                      })}
                                      className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                      title="Edit Student"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRecord("students", s.register_number)}
                                      className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                      title="Delete Student"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Periods tab */}
          {activeTab === "periods" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                <h3 className="font-display font-bold text-lg mb-4">Add Timetable Period</h3>
                <form onSubmit={addPeriod} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Period Number / Order
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newPeriodNum}
                      onChange={(e) => setNewPeriodNum(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Period Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="Period 1 or Morning Break"
                      value={newPeriodName}
                      onChange={(e) => setNewPeriodName(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newPeriodStart}
                        onChange={(e) => setNewPeriodStart(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newPeriodEnd}
                        onChange={(e) => setNewPeriodEnd(e.target.value)}
                        className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="isAcademicToggle"
                      checked={newPeriodIsAcademic}
                      onChange={(e) => setNewPeriodIsAcademic(e.target.checked)}
                      className="rounded bg-canvas border-zinc-800 text-teal-accent focus:ring-teal-accent h-4 w-4"
                    />
                    <label htmlFor="isAcademicToggle" className="text-xs text-text-muted select-none cursor-pointer">
                      Academic Class Period (e.g. subject teaching)
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Add Period Definition
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                  <h3 className="font-display font-bold text-lg">Configured Timetable Periods</h3>
                  <button
                    onClick={() => setCsvModal({ type: "periods" })}
                    className="text-xs text-teal-accent border border-teal-accent/20 bg-teal-accent/5 hover:bg-teal-accent/10 px-3 py-1 rounded-xl font-body font-semibold transition-all"
                  >
                    Import CSV
                  </button>
                </div>
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {periodsList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-teal-accent">#{p.period_number}</span>
                          <span className="font-body text-sm font-semibold text-text-primary">{p.name}</span>
                          <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.25 rounded ${
                            p.is_academic_period 
                              ? "bg-teal-accent/15 text-teal-accent border border-teal-accent/25" 
                              : "bg-zinc-800 text-text-muted"
                          }`}>
                            {p.is_academic_period ? "Academic" : "Break / Lunch"}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-mono mt-1">
                          Duration: {p.start_time.substring(0, 5)} - {p.end_time.substring(0, 5)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRecord({
                            type: "period",
                            id: p.id,
                            data: {
                              period_number: p.period_number,
                              name: p.name,
                              start_time: p.start_time.substring(0, 5),
                              end_time: p.end_time.substring(0, 5),
                              is_academic_period: p.is_academic_period
                            }
                          })}
                          className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                          title="Edit Period"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecord("timetable_periods", p.id)}
                          className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                          title="Delete Period"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Settings tab */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6">
              {/* Sub-navigation */}
              <div className="flex border-b border-zinc-850 pb-px">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("years")}
                  className={`pb-3 text-xs font-body font-semibold px-4 relative transition-colors ${
                    settingsSubTab === "years"
                      ? "text-teal-accent"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Academic Years
                  {settingsSubTab === "years" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-accent" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab("holidays")}
                  className={`pb-3 text-xs font-body font-semibold px-4 relative transition-colors ${
                    settingsSubTab === "holidays"
                      ? "text-teal-accent"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Holidays & Saturdays
                  {settingsSubTab === "holidays" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-accent" />
                  )}
                </button>
              </div>

              {settingsSubTab === "years" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Form */}
                  <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                    <h3 className="font-display font-bold text-lg mb-4">Configure Academic Year</h3>
                    <form onSubmit={addAcademicYear} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Academic Year Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 2026-2027"
                          value={newYearName}
                          onChange={(e) => setNewYearName(e.target.value)}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newYearStart}
                          onChange={(e) => setNewYearStart(e.target.value)}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newYearEnd}
                          onChange={(e) => setNewYearEnd(e.target.value)}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Define Academic Year
                      </button>
                    </form>
                  </div>

                  {/* List */}
                  <div className="glass-panel rounded-2xl p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                      <h3 className="font-display font-bold text-lg">Academic Years</h3>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {academicYears.length === 0 ? (
                        <p className="text-xs text-text-muted font-body py-4 text-center">No academic years defined yet.</p>
                      ) : (
                        academicYears.map((ay) => (
                          <div
                            key={ay.id}
                            className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-body text-sm font-semibold text-text-primary">{ay.name}</span>
                                <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.25 rounded ${
                                  ay.is_active 
                                    ? "bg-teal-accent/15 text-teal-accent border border-teal-accent/25" 
                                    : "bg-zinc-800 text-text-muted"
                                }`}>
                                  {ay.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted font-mono mt-1">
                                Boundaries: {ay.start_date} to {ay.end_date}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!ay.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleSetActiveYear(ay.id)}
                                  className="text-[10px] text-teal-accent border border-teal-accent/25 bg-teal-accent/5 hover:bg-teal-accent/10 px-2 py-1 rounded-lg font-body font-semibold transition-all"
                                >
                                  Set Active
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingRecord({
                                  type: "academic_year",
                                  id: ay.id,
                                  data: {
                                    name: ay.name,
                                    start_date: ay.start_date,
                                    end_date: ay.end_date
                                  }
                                })}
                                className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                title="Edit Year"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRecord("academic_years", ay.id)}
                                className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                title="Delete Year"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Holiday Form */}
                  <div className="glass-panel rounded-2xl p-6 h-fit md:col-span-1">
                    <h3 className="font-display font-bold text-lg mb-4">Add Holiday</h3>
                    <form onSubmit={addHoliday} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Holiday Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Christmas Day, Diwali"
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Add Holiday
                      </button>
                    </form>
                  </div>

                  {/* Holidays List */}
                  <div className="glass-panel rounded-2xl p-6 md:col-span-1">
                    <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                      <h3 className="font-display font-bold text-lg">Configured Holidays</h3>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {holidaysList.length === 0 ? (
                        <p className="text-xs text-text-muted font-body py-4 text-center">No holidays defined yet.</p>
                      ) : (
                        holidaysList
                          .filter((h) => h.name !== "Saturday Holiday")
                          .map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl"
                            >
                              <div>
                                <span className="font-body text-xs font-semibold text-text-primary block truncate max-w-[120px]" title={h.name}>
                                  {h.name}
                                </span>
                                <p className="text-[10px] text-text-muted font-mono mt-1">
                                  {h.date}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord({
                                    type: "holiday",
                                    id: h.id,
                                    data: {
                                      name: h.name,
                                      date: h.date
                                    }
                                  })}
                                  className="text-zinc-600 hover:text-teal-accent transition-colors p-1"
                                  title="Edit Holiday"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteRecord("holidays", h.id)}
                                  className="text-zinc-600 hover:text-crimson-alert transition-colors p-1"
                                  title="Delete Holiday"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Saturdays Manager */}
                  <div className="glass-panel rounded-2xl p-6 md:col-span-1">
                    <div className="flex items-center justify-between mb-4 pb-1 border-b border-zinc-800/20">
                      <h3 className="font-display font-bold text-lg">Saturdays Manager</h3>
                    </div>
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {!academicYears.some((ay) => ay.is_active) ? (
                        <p className="text-xs text-text-muted font-body py-4 text-center">Define & activate an academic year to manage Saturdays.</p>
                      ) : getSaturdaysInActiveYear().length === 0 ? (
                        <p className="text-xs text-text-muted font-body py-4 text-center">No Saturdays found in active academic year.</p>
                      ) : (
                        getSaturdaysInActiveYear().map((satDate) => {
                          const isHoliday = holidaysList.some((h) => h.date === satDate);
                          return (
                            <div
                              key={satDate}
                              className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl"
                            >
                              <div>
                                <span className="font-body text-xs font-semibold text-text-primary block">
                                  {satDate}
                                </span>
                                <span className={`text-[8px] font-mono uppercase tracking-wider px-1 py-0.25 rounded inline-block mt-1 ${
                                  isHoliday 
                                    ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" 
                                    : "bg-zinc-800 text-text-muted"
                                }`}>
                                  {isHoliday ? "Saturday Holiday" : "Working Saturday"}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => toggleSaturdayHoliday(satDate)}
                                className={`text-[10px] px-2 py-1 rounded-lg font-body font-semibold transition-all border ${
                                  isHoliday
                                    ? "text-zinc-400 border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900"
                                    : "text-purple-400 border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10"
                                }`}
                              >
                                {isHoliday ? "Make Working" : "Mark Holiday"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timetable Assignment Modal */}
          {assignModal && (
            <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="glass-panel rounded-2xl p-6 w-full max-w-sm flex flex-col relative">
                <button
                  onClick={() => setAssignModal(null)}
                  className="absolute right-4 top-4 text-text-muted hover:text-text-primary"
                >
                  &times;
                </button>
                <h3 className="font-display font-bold text-lg mb-4">
                  Configure {periodsList.find(p => p.id === assignModal.period_id)?.name || "Period"} ({assignModal.day})
                </h3>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Subject
                    </label>
                    <select
                      value={assignSubjectId}
                      onChange={(e) => setAssignSubjectId(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                      Assigned Instructor
                    </label>
                    <select
                      value={assignTeacherId}
                      onChange={(e) => setAssignTeacherId(e.target.value)}
                      className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSaveSlot}
                    disabled={loading || !assignSubjectId || !assignTeacherId}
                    className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-2.5 rounded-xl text-xs mt-2 transition-all active:translate-y-[1px]"
                  >
                    Save Slot Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CSV Import Modal */}
          {csvModal && (
            <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="glass-panel rounded-2xl p-6 w-full max-w-lg flex flex-col relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={resetCsvImportState}
                  className="absolute right-4 top-4 text-text-muted hover:text-text-primary text-xl"
                >
                  &times;
                </button>
                <h3 className="font-display font-bold text-lg mb-2">
                  Import {csvModal.type.charAt(0).toUpperCase() + csvModal.type.slice(1)} via CSV
                </h3>
                <p className="text-text-muted text-xs font-body mb-4">
                  {csvModal.type === "teachers" && "Format: name,pin (4-digit number),department (code/name, optional)"}
                  {csvModal.type === "subjects" && "Format: code,name,assigned_teacher_name (optional)"}
                  {csvModal.type === "classes" && "Format: department (code/name),year (I to IV),section (optional),password"}
                  {csvModal.type === "students" && "Format: register_number (16 digits),name,class_name OR register_number,name,department,year,section (optional)"}
                  {csvModal.type === "periods" && "Format: period_number,name,start_time (HH:MM),end_time (HH:MM),is_academic_period (true/false)"}
                </p>

                {/* Drag and Drop Zone */}
                {!selectedFile && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all mb-4 group ${
                      isDragging
                        ? "border-teal-accent bg-teal-accent/5"
                        : "border-zinc-800 hover:border-zinc-700 bg-canvas"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-file-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                    />
                    <label htmlFor="csv-file-upload" className="w-full flex flex-col items-center justify-center cursor-pointer">
                      <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${
                        isDragging ? "text-teal-accent" : "text-text-muted group-hover:text-teal-accent"
                      }`} />
                      <span className="text-xs text-text-primary font-body font-semibold">
                        Drag & drop your CSV file here
                      </span>
                      <span className="text-[10px] text-text-muted mt-1 font-body">
                        or click to browse local files
                      </span>
                    </label>
                  </div>
                )}

                {/* Selected File & Preview Container */}
                {selectedFile && csvText && (
                  <div className="w-full border border-zinc-800 rounded-xl p-3 bg-zinc-900/40 flex flex-col mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <FileText className="w-8 h-8 text-teal-accent mr-3 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate font-body">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-text-muted font-body">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setCsvText("");
                          setImportError("");
                          setImportSuccess("");
                        }}
                        className="text-text-muted hover:text-crimson-alert p-1 transition-colors rounded-lg hover:bg-zinc-800"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Preview Table */}
                    {(() => {
                      const previewRows = getPreviewRows();
                      if (previewRows.length > 0) {
                        return (
                          <div className="mt-3 border-t border-zinc-800 pt-3">
                            <p className="text-[10px] text-text-muted font-body mb-2 uppercase tracking-wider font-semibold">
                              Preview (First 3 rows):
                            </p>
                            <div className="overflow-x-auto max-h-36 border border-zinc-800 rounded-lg">
                              <table className="w-full text-[10px] font-mono text-left border-collapse">
                                <thead>
                                  <tr className="bg-zinc-950/80 border-b border-zinc-800">
                                    {previewRows[0].map((h, i) => (
                                      <th key={i} className="px-2 py-1 text-text-primary font-bold border-r border-zinc-805 last:border-r-0 whitespace-nowrap bg-zinc-900/50">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {previewRows.slice(1).map((row, ri) => (
                                    <tr key={ri} className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/20">
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1 text-text-muted border-r border-zinc-800 last:border-r-0 max-w-[120px] truncate">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Import Alert Status */}
                {importError && (
                  <div className="flex items-start gap-2 text-crimson-alert bg-crimson-alert/5 border border-crimson-alert/20 rounded-xl p-3 text-xs font-body mb-4">
                    <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
                {importSuccess && (
                  <div className="flex items-start gap-2 text-teal-accent bg-teal-accent/5 border border-teal-accent/20 rounded-xl p-3 text-xs font-body mb-4">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={resetCsvImportState}
                    className="text-xs text-text-muted border border-zinc-800 hover:text-text-primary px-4 py-2 rounded-xl transition-colors font-body"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCsvImport}
                    disabled={loading || !csvText.trim()}
                    className="text-xs bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? "Importing..." : "Import Data"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Edit Record Modal */}
          {editingRecord && (
            <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="glass-panel rounded-2xl p-6 w-full max-w-md flex flex-col relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="absolute right-4 top-4 text-text-muted hover:text-text-primary text-xl"
                >
                  &times;
                </button>
                <h3 className="font-display font-bold text-lg mb-4 text-text-primary">
                  Edit {editingRecord.type.charAt(0).toUpperCase() + editingRecord.type.slice(1)}
                </h3>

                <form onSubmit={updateRecord} className="flex flex-col gap-4">
                  {/* TEACHER EDIT FORM */}
                  {editingRecord.type === "teacher" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Teacher Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Department
                        </label>
                        <select
                          value={editingRecord.data.department}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, department: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          New Security PIN (4 digits)
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Leave blank to keep current PIN"
                          value={editingRecord.data.pin || ""}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, pin: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* SUBJECT EDIT FORM */}
                  {editingRecord.type === "subject" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Subject Code
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.code}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, code: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Assigned Teacher
                        </label>
                        <select
                          required
                          value={editingRecord.data.assigned_teacher_id}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, assigned_teacher_id: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        >
                          <option value="">Select a Teacher</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* DEPARTMENT EDIT FORM */}
                  {editingRecord.type === "department" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Department Code (e.g. CSE)
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.code}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, code: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Department Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                    </>
                  )}

                  {/* CLASS EDIT FORM */}
                  {editingRecord.type === "class" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Department
                        </label>
                        <select
                          required
                          value={editingRecord.data.department_id}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, department_id: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Academic Year
                        </label>
                        <select
                          required
                          value={editingRecord.data.year}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, year: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        >
                          <option value="I">I Year</option>
                          <option value="II">II Year</option>
                          <option value="III">III Year</option>
                          <option value="IV">IV Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Section / Suffix (e.g. A, B, or empty)
                        </label>
                        <input
                          type="text"
                          maxLength={1}
                          value={editingRecord.data.section || ""}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, section: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          New Representative Password
                        </label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          value={editingRecord.data.password || ""}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, password: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                    </>
                  )}

                  {/* STUDENT EDIT FORM */}
                  {editingRecord.type === "student" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Register Number (16 digits)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={editingRecord.data.register_number}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, register_number: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Student Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Class
                        </label>
                        <select
                          required
                          value={editingRecord.data.class_id}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, class_id: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* PERIOD EDIT FORM */}
                  {editingRecord.type === "period" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Period Number
                        </label>
                        <input
                          type="number"
                          required
                          value={editingRecord.data.period_number}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, period_number: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Period Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={editingRecord.data.start_time}
                            onChange={(e) => setEditingRecord({
                              ...editingRecord,
                              data: { ...editingRecord.data, start_time: e.target.value }
                            })}
                            className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={editingRecord.data.end_time}
                            onChange={(e) => setEditingRecord({
                              ...editingRecord,
                              data: { ...editingRecord.data, end_time: e.target.value }
                            })}
                            className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="editPeriodIsAcademic"
                          checked={editingRecord.data.is_academic_period}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, is_academic_period: e.target.checked }
                          })}
                          className="rounded border-zinc-800 text-teal-accent focus:ring-0 focus:ring-offset-0 bg-canvas"
                        />
                        <label htmlFor="editPeriodIsAcademic" className="text-xs text-text-primary font-body select-none">
                          Is Academic Period (uncheck for breaks/lunch)
                        </label>
                      </div>
                    </>
                  )}

                  {/* ACADEMIC YEAR EDIT FORM */}
                  {editingRecord.type === "academic_year" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Academic Year Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          placeholder="e.g. 2026-2027"
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={editingRecord.data.start_date}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, start_date: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          required
                          value={editingRecord.data.end_date}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, end_date: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* HOLIDAY EDIT FORM */}
                  {editingRecord.type === "holiday" && (
                    <>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Holiday Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingRecord.data.name}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, name: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-body"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted uppercase tracking-wider font-body mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={editingRecord.data.date}
                          onChange={(e) => setEditingRecord({
                            ...editingRecord,
                            data: { ...editingRecord.data, date: e.target.value }
                          })}
                          className="w-full bg-canvas border border-zinc-800 rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-teal-accent font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(null)}
                      className="text-xs text-text-muted border border-zinc-800 hover:text-text-primary px-4 py-2 rounded-xl transition-colors font-body"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="text-xs bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
