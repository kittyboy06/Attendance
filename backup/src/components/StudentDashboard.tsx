import React, { useState } from "react";
import { Search, Calendar, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";

interface StudentDashboardProps {
  onBack: () => void;
}

interface AttendanceLog {
  date: string;
  period: number;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  status: "present" | "absent" | "late";
}

interface StudentData {
  student_name: string;
  class_name: string;
  summary: {
    attended: number;
    total: number;
    percentage: number;
  };
  history: AttendanceLog[];
}

export default function StudentDashboard({ onBack }: StudentDashboardProps) {
  const [registerNumber, setRegisterNumber] = useState("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent" | "late">("all");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerNumber.length !== 16) {
      setError("Please enter a valid 16-digit register number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/student/dashboard?register_number=${registerNumber}`
      );
      const data = await response.json();

      if (response.ok) {
        setStudentData(data);
      } else {
        setError(data.error || "Student not found");
      }
    } catch (_err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRingColor = (percentage: number) => {
    if (percentage >= 75) return "#0D9488"; // Teal/Emerald Accent
    if (percentage >= 60) return "#D97706"; // Amber
    return "#E11D48"; // Crimson Alert
  };

  // SVG circular ring properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  // Counts and filtering for history
  const counts = studentData ? {
    all: studentData.history.length,
    present: studentData.history.filter(h => h.status === "present").length,
    absent: studentData.history.filter(h => h.status === "absent").length,
    late: studentData.history.filter(h => h.status === "late").length,
  } : { all: 0, present: 0, absent: 0, late: 0 };

  const filteredHistory = studentData
    ? studentData.history.filter(log => statusFilter === "all" || log.status === statusFilter)
    : [];

  const strokeDashoffset = studentData
    ? circumference - (studentData.summary.percentage / 100) * circumference
    : circumference;

  return (
    <div className="w-full max-w-xl mx-auto min-h-[85vh] flex flex-col justify-start py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-body"
        >
          <ArrowLeft size={16} className="mr-2" />
          Portals
        </button>
        <span className="font-mono text-xs tracking-widest text-teal-accent">STUDENT PORTAL</span>
      </div>

      {!studentData ? (
        /* Search Form */
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center">
          <h1 className="font-display font-bold text-2xl mb-2 text-center">Student Dashboard</h1>
          <p className="text-text-muted text-sm text-center mb-6">
            Enter your 16-digit register number to view live attendance records
          </p>

          <form onSubmit={handleSearch} className="w-full flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                maxLength={16}
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="2026010101010101"
                className="w-full bg-canvas border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm font-mono tracking-widest text-text-primary focus:outline-none focus:border-teal-accent transition-colors"
                disabled={loading}
              />
              <div className="absolute right-3 top-3 text-zinc-600">
                <Search size={18} />
              </div>
            </div>

            {error && <p className="text-crimson-alert text-xs font-body text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-accent hover:bg-teal-hover text-canvas font-body font-semibold py-3 rounded-xl transition-all active:translate-y-[1px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Searching..." : "Access Dashboard"}
            </button>
          </form>
        </div>
      ) : (
        /* Stats & History View */
        <div className="flex flex-col gap-6">
          {/* Top Profile Card */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
            {/* Progress Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="#27272A"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Foreground Active Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke={getRingColor(studentData.summary.percentage)}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="progress-ring-circle"
                />
              </svg>
              {/* Central Text */}
              <div className="absolute flex flex-col items-center">
                <span className="font-mono font-bold text-2xl text-text-primary">
                  {studentData.summary.percentage}%
                </span>
                <span className="text-[10px] text-text-muted font-body uppercase tracking-wider">
                  Attendance
                </span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display font-bold text-2xl text-text-primary leading-tight">
                {studentData.student_name}
              </h2>
              <p className="text-teal-accent font-mono text-sm font-semibold mb-3">
                {studentData.class_name}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-zinc-800/50 pt-3">
                <div>
                  <p className="text-[10px] text-text-muted font-body uppercase tracking-wider">
                    Attended Periods
                  </p>
                  <p className="font-mono text-base font-semibold text-text-primary">
                    {studentData.summary.attended} / {studentData.summary.total}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-body uppercase tracking-wider">
                    Required Minimum
                  </p>
                  <p className="font-mono text-base font-semibold text-text-muted">75.00%</p>
                </div>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="glass-panel rounded-2xl p-6 flex-1">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-teal-accent" />
              Attendance Log
            </h3>

            {/* Filter Group */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(["all", "present", "absent", "late"] as const).map((status) => {
                const isActive = statusFilter === status;
                const count = counts[status];
                
                let activeClass = "bg-teal-accent text-canvas border-transparent";
                let statusLabel = "All";
                
                if (status === "present") {
                  statusLabel = "Present";
                  activeClass = "bg-teal-accent/20 border-teal-accent/50 text-teal-accent";
                } else if (status === "absent") {
                  statusLabel = "Absent";
                  activeClass = "bg-crimson-alert/20 border-crimson-alert/50 text-crimson-alert";
                } else if (status === "late") {
                  statusLabel = "Late";
                  activeClass = "bg-amber-600/20 border-amber-600/50 text-amber-600";
                }
                
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold font-body transition-all flex-shrink-0 ${
                      isActive 
                        ? activeClass 
                        : "bg-zinc-950/40 border-zinc-800/60 text-text-muted hover:text-text-primary hover:border-zinc-700"
                    }`}
                  >
                    {statusLabel}
                    <span className={`px-1.5 py-0.25 rounded-md text-[10px] ${
                      isActive 
                        ? (status === "all" ? "bg-teal-hover text-canvas" : "bg-white/10") 
                        : "bg-zinc-900 text-text-muted"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 size={36} className="text-zinc-700 mb-3" />
                <p className="text-text-muted text-sm font-body">
                  No {statusFilter === "all" ? "" : statusFilter} attendance logs found
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredHistory.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/40"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          Period {log.period}
                        </span>
                        <span className="font-mono text-xs text-text-muted">{log.date}</span>
                      </div>
                      <h4 className="font-body font-semibold text-sm text-text-primary">
                        {log.subject_name}
                      </h4>
                      <p className="text-xs text-text-muted font-body">{log.teacher_name}</p>
                    </div>

                    <div>
                      {log.status === "present" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-teal-accent font-body bg-teal-accent/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={12} />
                          Present
                        </span>
                      )}
                      {log.status === "absent" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-crimson-alert font-body bg-crimson-alert/10 px-2.5 py-1 rounded-full">
                          <XCircle size={12} />
                          Absent
                        </span>
                      )}
                      {log.status === "late" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 font-body bg-amber-600/10 px-2.5 py-1 rounded-full">
                          <AlertTriangle size={12} />
                          Late
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setStudentData(null);
              setStatusFilter("all");
            }}
            className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-text-primary font-body text-sm py-3 rounded-xl transition-all"
          >
            Check Another Register Number
          </button>
        </div>
      )}
    </div>
  );
}
