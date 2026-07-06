import React, { useState } from 'react';
import { db } from '../lib/db';
import { UserProfile, UserRole } from '../types';
import { GraduationCap, User, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [role, setRole] = useState<UserRole>('student');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let user: UserProfile;
      if (isRegistering) {
        if (!name.trim()) throw new Error('Name is required');
        user = await db.auth.signUp(email, password, name, role);
      } else {
        user = await db.auth.signIn(email, password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail: string, demoPass: string, demoRole: UserRole) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole(demoRole);
    setIsRegistering(false);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center px-4 relative">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 dark:bg-fuchsia-500/5 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo and Greeting */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-2xl shadow-lg mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 dark:from-indigo-400 dark:via-purple-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
            Kids Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Professional Kahoot & Quizizz style math exam builder
          </p>
        </div>

        {/* Card Frame (Glassmorphism) */}
        <div id="auth_card" className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          
          {/* User Role Selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/80 p-2">
            <button
              id="role_student_btn"
              type="button"
              onClick={() => { setRole('student'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'student'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <User className="h-4 w-4" />
              Student Portal
            </button>
            <button
              id="role_teacher_btn"
              type="button"
              onClick={() => { setRole('teacher'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'teacher' || role === 'admin'
                  ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Teacher Portal
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
              {isRegistering ? `Create a new ${role} account` : `Sign in as ${role}`}
            </h2>

            {error && (
              <div id="auth_error" className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="auth_name_input"
                      type="text"
                      required
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="auth_email_input"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="auth_password_input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <button
                    id="toggle_show_pass_btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="auth_submit_btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold hover:opacity-90 transition-all shadow-md active:scale-98 disabled:opacity-50 mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : isRegistering ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <button
                id="toggle_register_btn"
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>

        {/* Demo Credentials Shortcuts for easy review */}
        <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 backdrop-blur-md text-center text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">💡 Demo Accounts for Instant Review:</p>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <button
              id="demo_teacher_btn"
              onClick={() => fillDemoCreds('teacher@mathquest.com', 'teacher123', 'teacher')}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium transition-all"
            >
              Teacher login
            </button>
            <button
              id="demo_student_btn"
              onClick={() => fillDemoCreds('student@mathquest.com', 'student123', 'student')}
              className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 font-medium transition-all"
            >
              Student login
            </button>
            <button
              id="demo_admin_btn"
              onClick={() => fillDemoCreds('admin@mathquest.com', 'admin123', 'admin')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 font-medium transition-all"
            >
              Admin login
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            * Or register any new account instantly! Multi-tab live connections supported.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
