import { useState } from "react";
import { User, Users, Shield, Award } from "lucide-react";
import StudentDashboard from "./components/StudentDashboard";
import RepDashboard from "./components/RepDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminDashboard from "./components/AdminDashboard";

type PortalView = "entry" | "student" | "rep" | "teacher" | "admin";

export default function App() {
  const [view, setView] = useState<PortalView>("entry");

  return (
    <div className="w-full min-h-[100dvh] flex flex-col justify-between bg-canvas text-text-primary selection:bg-teal-accent selection:text-canvas overflow-x-hidden font-body">
      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center">
        {view === "entry" && (
          <div className="w-full max-w-4xl mx-auto py-12 px-6 flex flex-col items-center">
            {/* Logo & Headline */}
            <div className="flex flex-col items-center text-center mb-12">
              <div className="w-16 h-16 bg-teal-accent/15 rounded-2xl flex items-center justify-center text-teal-accent mb-4 border border-teal-accent/20">
                <Award size={36} />
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight leading-none text-text-primary">
                College Attendance System
              </h1>
              <p className="text-text-muted text-sm max-w-md mt-3">
                Secure, period-by-period academic attendance tracker with dynamic summaries and realtime verification portals
              </p>
            </div>

             {/* Portal Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {/* Student Card */}
              <div
                onClick={() => setView("student")}
                className="glass-panel hover:border-teal-accent rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-text-muted group-hover:text-teal-accent group-hover:border-teal-accent/30 transition-colors">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary mb-1">Student Portal</h3>
                  <p className="text-text-muted text-xs leading-normal">
                    Enter your register number to view live percentage statistics and logs
                  </p>
                </div>
              </div>

              {/* Rep Card */}
              <div
                onClick={() => setView("rep")}
                className="glass-panel hover:border-teal-accent rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-text-muted group-hover:text-teal-accent group-hover:border-teal-accent/30 transition-colors">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary mb-1">Representative</h3>
                  <p className="text-text-muted text-xs leading-normal">
                    Authorized Department Reps log in here to record period attendance drafts
                  </p>
                </div>
              </div>

              {/* Teacher Card */}
              <div
                onClick={() => setView("teacher")}
                className="glass-panel hover:border-teal-accent rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-text-muted group-hover:text-teal-accent group-hover:border-teal-accent/30 transition-colors">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary mb-1">Teacher Portal</h3>
                  <p className="text-text-muted text-xs leading-normal">
                    Teachers sign off and lock pending attendance drafts using security PINs
                  </p>
                </div>
              </div>

              {/* Admin Card */}
              <div
                onClick={() => setView("admin")}
                className="glass-panel hover:border-teal-accent rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] group min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-text-muted group-hover:text-teal-accent group-hover:border-teal-accent/30 transition-colors">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary mb-1">Administration</h3>
                  <p className="text-text-muted text-xs leading-normal">
                    Configure department timetable slots, registers, and instructor directories
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "student" && <StudentDashboard onBack={() => setView("entry")} />}
        {view === "rep" && <RepDashboard onBack={() => setView("entry")} />}
        {view === "teacher" && <TeacherDashboard onBack={() => setView("entry")} />}
        {view === "admin" && <AdminDashboard onBack={() => setView("entry")} />}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-zinc-900/50 bg-zinc-950/20">
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
          SYSTEM STATUS: ONLINE // VER 1.0.0
        </span>
      </footer>
    </div>
  );
}
