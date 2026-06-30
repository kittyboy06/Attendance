import React, { useState } from 'react';
import { Shield, User, GraduationCap, ClipboardList, AlertCircle, ArrowRight } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'none' | 'student' | 'rep' | 'teacher' | 'admin'>('none');
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole: typeof role) => {
    setRole(selectedRole);
    setInputVal('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) {
      setError('Please fill in the required field.');
      return;
    }

    if (role === 'student') {
      if (inputVal.length !== 16 || isNaN(Number(inputVal))) {
        setError('Register number must be exactly 16 digits.');
        return;
      }
      setError('');
      alert(`Accessing Student Dashboard for Register No: ${inputVal}`);
    } else if (role === 'teacher') {
      if (inputVal.length !== 4 || isNaN(Number(inputVal))) {
        setError('PIN must be exactly 4 digits.');
        return;
      }
      setError('');
      alert(`Verifying Teacher PIN...`);
    } else {
      setError('');
      alert(`Logging in as ${role}...`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
              ChronosAttend
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
            College Attendance Portal
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow flex flex-col justify-center items-center w-full z-10">
        {role === 'none' ? (
          <div className="w-full text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                College Attendance System
              </h1>
              <p className="text-slate-400 max-w-xl mx-auto text-base md:text-lg">
                Access your personalized dashboard. Authenticate using your credentials to view, submit, or manage attendance records.
              </p>
            </div>

            {/* Grid of Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl pt-4">
              {/* Student */}
              <button
                onClick={() => handleRoleSelect('student')}
                className="group relative flex flex-col items-start p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-left transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-200 group-hover:text-white">Student Dashboard</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Enter your 16-digit register number to track your academic attendance history and live percentage.
                </p>
                <div className="mt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  Access Portal <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Class Rep */}
              <button
                onClick={() => handleRoleSelect('rep')}
                className="group relative flex flex-col items-start p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-left transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-emerald-500/5"
              >
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-200 group-hover:text-white">Class Representative</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Log in with your shared class password to create daily period attendance sheets and submit draft lists.
                </p>
                <div className="mt-6 flex items-center text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                  Access Portal <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Teacher */}
              <button
                onClick={() => handleRoleSelect('teacher')}
                className="group relative flex flex-col items-start p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-left transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-200 group-hover:text-white">Teacher Verification</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Validate and lock representative submissions using your unique 4-digit PIN for class periods.
                </p>
                <div className="mt-6 flex items-center text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                  Verify Period <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </button>

              {/* Admin */}
              <button
                onClick={() => handleRoleSelect('admin')}
                className="group relative flex flex-col items-start p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-left transition-all duration-300 hover:border-purple-500/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-purple-500/5"
              >
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-200 group-hover:text-white">Administrator</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Manage timetables dynamically, configure academic periods, register teachers, and oversee departments.
                </p>
                <div className="mt-6 flex items-center text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                  Admin Login <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>

            <button
              onClick={() => handleRoleSelect('none')}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center mb-6"
            >
              &larr; Back to Selection
            </button>

            <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2 mb-2">
              {role === 'student' && 'Student Login'}
              {role === 'rep' && 'Class Representative'}
              {role === 'teacher' && 'Teacher Verification'}
              {role === 'admin' && 'Administrator'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {role === 'student' && 'Enter your 16-digit university registration code.'}
              {role === 'rep' && 'Provide the password assigned to your class.'}
              {role === 'teacher' && 'Confirm representative records with your 4-digit PIN.'}
              {role === 'admin' && 'Log in using your administrator system credentials.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  {role === 'student' && '16-Digit Registration Number'}
                  {role === 'rep' && 'Class Password'}
                  {role === 'teacher' && '4-Digit PIN'}
                  {role === 'admin' && 'Admin Email'}
                </label>

                {role === 'admin' ? (
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="admin@college.edu"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                ) : (
                  <input
                    type={role === 'rep' ? 'password' : 'text'}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={
                      role === 'student'
                        ? 'e.g. 2026100938274615'
                        : role === 'teacher'
                        ? 'e.g. 1234'
                        : 'Enter Password'
                    }
                    maxLength={role === 'student' ? 16 : role === 'teacher' ? 4 : undefined}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 flex justify-center items-center gap-2 group"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950/20 py-6 text-center text-xs text-slate-500">
        <p>&copy; 2026 ChronosAttend College Attendance Portal. Built with React & Supabase.</p>
      </footer>
    </div>
  );
}
