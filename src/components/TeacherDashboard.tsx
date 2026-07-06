import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { ExamConfig, ExamRoom, UserProfile } from '../types';
import ExamBuilder from './ExamBuilder';
import LiveRoomManager from './LiveRoomManager';
import { Plus, Users, LayoutDashboard, Clock, PlayCircle, ClipboardList, HelpCircle, AlertCircle, ChevronRight, BarChart, Settings, PlusCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface TeacherDashboardProps {
  user: UserProfile;
}

export default function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Router views: 'list' | 'build' | 'live'
  const [view, setView] = useState<'list' | 'build' | 'live'>('list');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.rooms.getTeacherRooms(user.id);
      setRooms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user.id]);

  const handleBuildExam = async (config: ExamConfig, roomSettings: { password?: string; maxStudents: number; lateJoinEnabled: boolean }) => {
    try {
      setBuilding(true);
      setError(null);
      const newRoom = await db.rooms.create(
        config,
        user.id,
        user.name,
        roomSettings.password,
        roomSettings.maxStudents,
        roomSettings.lateJoinEnabled
      );

      // Successfully built! Automatically select room and open live manager
      setSelectedRoomCode(newRoom.code);
      setView('live');
    } catch (err: any) {
      setError(err.message || 'Failed to generate custom exam room.');
    } finally {
      setBuilding(false);
    }
  };

  const handleOpenLiveRoom = (code: string) => {
    setSelectedRoomCode(code);
    setView('live');
  };

  const handleExitLiveRoom = () => {
    setSelectedRoomCode(null);
    setView('list');
    fetchRooms();
  };

  // Top level stats cards
  const totalRoomsCount = rooms.length;
  const activeRoomsCount = rooms.filter(r => r.status === 'active' || r.status === 'lobby').length;
  const completedRoomsCount = rooms.filter(r => r.status === 'ended').length;

  return (
    <div className="space-y-6">
      
      {/* 1. BUILD VIEW */}
      {view === 'build' && (
        <ExamBuilder
          onBuild={handleBuildExam}
          onCancel={() => setView('list')}
          loading={building}
        />
      )}

      {/* 2. LIVE ROOM VIEW */}
      {view === 'live' && selectedRoomCode && (
        <LiveRoomManager
          roomCode={selectedRoomCode}
          user={user}
          onExit={handleExitLiveRoom}
        />
      )}

      {/* 3. PRIMARY LIST DASHBOARD */}
      {view === 'list' && (
        <div className="space-y-6">
          {/* Header & Create action */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <LayoutDashboard className="h-7 w-7 text-indigo-500" />
                Teacher Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, Professor {user.name}</p>
            </div>
            <button
              id="create_exam_room_btn"
              onClick={() => setView('build')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              Build Exam Room
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Rooms Built', val: totalRoomsCount, desc: 'All mental math contests', color: 'border-indigo-500/10' },
              { label: 'Active Lobbies', val: activeRoomsCount, desc: 'Lobbies or tests in-progress', color: 'border-amber-500/15' },
              { label: 'Completed Contests', val: completedRoomsCount, desc: 'Finished with locked scores', color: 'border-emerald-500/10' },
            ].map((metric, idx) => (
              <div
                key={idx}
                className={`p-5 border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-sm`}
              >
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{metric.label}</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{metric.val}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{metric.desc}</p>
              </div>
            ))}
          </div>

          {/* Rooms List Section */}
          <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="font-bold text-slate-800 dark:text-white">Your Historical Exam Rooms</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Click on any code to enter its live monitor or see details</p>
            </div>

            {loading ? (
              <div className="text-center py-24 text-slate-400">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-indigo-500 mb-2" />
                <p className="text-sm font-semibold">Fetching rooms...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-rose-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : rooms.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {rooms.map((room) => {
                  const date = new Date(room.createdAt).toLocaleDateString();

                  // Count math operations configured
                  const ops: string[] = [];
                  if (room.config.addition.enabled) ops.push('Addition');
                  if (room.config.subtraction.enabled) ops.push('Subtraction');
                  if (room.config.multiplication.enabled) ops.push('Multiplication');
                  if (room.config.division.enabled) ops.push('Division');

                  return (
                    <div
                      id={`room_card_${room.code}`}
                      key={room.id}
                      onClick={() => handleOpenLiveRoom(room.code)}
                      className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer group"
                    >
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-black font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-xl border border-indigo-100/40 dark:border-indigo-900/40">
                            {room.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            room.status === 'lobby' ? 'bg-amber-100 text-amber-700' :
                            room.status === 'active' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {room.status === 'lobby' ? 'Lobby Open' :
                             room.status === 'active' ? 'Active Test' : 'Completed'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ops.map((op, oIdx) => (
                            <span key={oIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded-md">
                              {op}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Built: {date} • Max Students: {room.maxStudents} • Duration: {Math.round(room.config.general.durationSeconds / 60)}m
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {room.questions.length} Questions
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Points: {room.config.general.pointsPerQuestion} / ea
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 text-slate-400">
                <ClipboardList className="h-12 w-12 mx-auto stroke-1 opacity-30 mb-2" />
                <p className="text-sm font-semibold">No Exam Rooms Built Yet</p>
                <p className="text-xs text-slate-400 mt-1">Get started by clicking "Build Exam Room" above!</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
