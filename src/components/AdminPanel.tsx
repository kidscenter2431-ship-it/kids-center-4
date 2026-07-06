import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { AppStatistics, UserProfile } from '../types';
import { Shield, Users, ClipboardList, Trash2, ShieldAlert, KeyRound, RefreshCw, AlertCircle, CheckCircle, BarChart } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminPanelProps {
  user: UserProfile;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [stats, setStats] = useState<AppStatistics | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banLoading, setBanLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appStats, allUsers] = await Promise.all([
        db.admin.getStatistics(),
        db.admin.getAllUsers()
      ]);
      setStats(appStats);
      setUsers(allUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBanUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to ban ${email}? This will immediately terminate their active exam session.`)) return;

    try {
      setBanLoading(email);
      await db.admin.banUser(email);
      // Reload lists
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to ban user');
    } finally {
      setBanLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Stats */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="text-indigo-600 h-7 w-7" />
            Administrative Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage teachers, students, rooms, and audit stats</p>
        </div>
        <button
          id="admin_refresh_btn"
          onClick={loadData}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-indigo-500 mb-2.5" />
          <p className="text-sm font-semibold">Loading system audit records...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-500 border border-rose-500/15 bg-rose-500/5 rounded-2xl">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Audit Metrics */}
          <div id="admin_stats_grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Created Lobbies', val: stats?.totalRooms || 0, desc: 'All generated codes', icon: <ClipboardList className="text-indigo-500" /> },
              { label: 'Registered Educators', val: stats?.totalTeachers || 0, desc: 'Teacher profiles', icon: <Users className="text-amber-500" /> },
              { label: 'Enrolled Students', val: stats?.totalStudents || 0, desc: 'Active student users', icon: <Users className="text-fuchsia-500" /> },
              { label: 'Tests Completed', val: stats?.totalExamsCompleted || 0, desc: 'Exams finished', icon: <CheckCircle className="text-emerald-500" /> },
            ].map((metric, idx) => (
              <div
                key={idx}
                className="p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-sm flex items-center gap-4"
              >
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  {metric.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{metric.label}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{metric.val}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">{metric.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Users audit table */}
          <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white">Active User Directory</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Ban users or delete duplicate educator accounts</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Joined At</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                  {users.map((u) => (
                    <tr
                      id={`admin_user_row_${u.id}`}
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-300 font-medium transition-all"
                    >
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{u.name}</td>
                      <td className="py-4 px-6 font-mono text-xs">{u.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                          u.role === 'teacher' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-center">
                        {u.role !== 'admin' ? (
                          <button
                            id={`ban_user_${u.id}_btn`}
                            onClick={() => handleBanUser(u.email)}
                            disabled={banLoading === u.email}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Ban User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">Immutable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
