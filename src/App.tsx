import { useEffect, useState } from 'react';
import { db } from './lib/db';
import { UserProfile } from './types';
import AuthScreen from './components/AuthScreen';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminPanel from './components/AdminPanel';
import ThemeToggle from './components/ThemeToggle';
import { GraduationCap, LogOut, Shield, Sparkles, User, RefreshCw, HelpCircle, Laptop } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminActiveTab, setAdminActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');

  useEffect(() => {
    // Check for active session on load
    const checkSession = async () => {
      try {
        const sessionUser = await db.auth.getCurrentUser();
        setUser(sessionUser);
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    if (profile.role === 'admin') {
      setAdminActiveTab('admin');
    }
  };

  const handleSignOut = async () => {
    await db.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-semibold">Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors font-sans antialiased">
      {/* 1. AUTH SCREEN (IF NOT LOGGED IN) */}
      {!user ? (
        <div className="py-10">
          {/* Header containing just theme toggle */}
          <div className="max-w-7xl mx-auto px-4 flex justify-end">
            <ThemeToggle />
          </div>
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      ) : (
        /* 2. LOGGED IN SHELL */
        <div className="flex flex-col min-h-screen">
          {/* Main Global Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              
              {/* Logo / Title */}
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 text-white shadow-md">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <span className="font-black text-sm tracking-tight bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                  Kids Center
                </span>
              </div>

              {/* Center Navigation for Admins (To let them test easily!) */}
              {user.role === 'admin' && (
                <div className="hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/60 text-xs">
                  <button
                    id="admin_nav_admin"
                    onClick={() => setAdminActiveTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      adminActiveTab === 'admin'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    Admin Board
                  </button>
                  <button
                    id="admin_nav_teacher"
                    onClick={() => setAdminActiveTab('teacher')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      adminActiveTab === 'teacher'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <GraduationCap className="h-3 w-3" />
                    Teacher Mode
                  </button>
                  <button
                    id="admin_nav_student"
                    onClick={() => setAdminActiveTab('student')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      adminActiveTab === 'student'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <User className="h-3 w-3" />
                    Student Mode
                  </button>
                </div>
              )}

              {/* Right Header Controls */}
              <div className="flex items-center gap-3">
                
                {/* Profile card (desktop only) */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{user.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                    user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                    user.role === 'teacher' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <ThemeToggle />

                <button
                  id="sign_out_btn"
                  onClick={handleSignOut}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 bg-white/80 dark:bg-slate-900/80 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-sm cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>

            </div>
          </header>

          {/* Mobile Admin Mode Helper Bar */}
          {user.role === 'admin' && (
            <div className="md:hidden flex border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-100 dark:bg-slate-950 p-2 justify-center gap-2 text-xs font-bold">
              <button
                id="admin_nav_admin_mob"
                onClick={() => setAdminActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg ${adminActiveTab === 'admin' ? 'bg-white dark:bg-slate-900 text-indigo-600' : 'text-slate-500'}`}
              >
                Admin
              </button>
              <button
                id="admin_nav_teacher_mob"
                onClick={() => setAdminActiveTab('teacher')}
                className={`px-3 py-1.5 rounded-lg ${adminActiveTab === 'teacher' ? 'bg-white dark:bg-slate-900 text-indigo-600' : 'text-slate-500'}`}
              >
                Teacher Mode
              </button>
              <button
                id="admin_nav_student_mob"
                onClick={() => setAdminActiveTab('student')}
                className={`px-3 py-1.5 rounded-lg ${adminActiveTab === 'student' ? 'bg-white dark:bg-slate-900 text-indigo-600' : 'text-slate-500'}`}
              >
                Student Mode
              </button>
            </div>
          )}

          {/* Main Content Workspace Grid */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* WORKSPACE SELECTION */}
            {user.role === 'admin' ? (
              <div>
                {adminActiveTab === 'admin' && <AdminPanel user={user} />}
                {adminActiveTab === 'teacher' && <TeacherDashboard user={user} />}
                {adminActiveTab === 'student' && <StudentDashboard user={user} onExit={() => setAdminActiveTab('admin')} />}
              </div>
            ) : user.role === 'teacher' ? (
              <TeacherDashboard user={user} />
            ) : (
              <StudentDashboard user={user} onExit={() => {}} />
            )}

          </main>
        </div>
      )}
    </div>
  );
}
