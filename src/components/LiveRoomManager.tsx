import { useEffect, useState, useRef } from 'react';
import { ExamRoom, Participant, UserProfile } from '../types';
import { subscribeToRoom, RoomConnection } from '../lib/db';
import LeaderboardView from './LeaderboardView';
import { Copy, Shield, Users, Lock, Unlock, Play, GraduationCap, Power, AlertTriangle, ShieldCheck, CheckCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveRoomManagerProps {
  roomCode: string;
  user: UserProfile;
  onExit: () => void;
}

export default function LiveRoomManager({ roomCode, user, onExit }: LiveRoomManagerProps) {
  const [room, setRoom] = useState<ExamRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const connectionRef = useRef<RoomConnection | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Establish WebSocket/Supabase Realtime room synchronization
    const conn = subscribeToRoom(
      roomCode,
      user.id,
      user.name,
      (data) => {
        setRoom(data.room);
        setParticipants(data.participants);

        // If the server room status changes to countdown, handle countdown timer locally
        if (data.room.status === 'countdown' && countdown === null) {
          triggerCountdown();
        }
      },
      () => {
        // Handle teacher disconnect (teachers usually aren't kicked, but just in case)
        onExit();
      }
    );

    connectionRef.current = conn;

    return () => {
      if (connectionRef.current) connectionRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomCode]);

  const triggerCountdown = () => {
    let currentCount = 5;
    setCountdown(currentCount);

    timerRef.current = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);

      if (currentCount <= 0) {
        clearInterval(timerRef.current!);
        setCountdown(null);
        // Instruct server to change status to Active
        if (connectionRef.current) {
          connectionRef.current.sendAction('start_exam', {});
        }
      }
    }, 1000);
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/?join=${roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleLock = () => {
    if (!room || !connectionRef.current) return;
    connectionRef.current.sendAction('lock_room', { isLocked: !room.isLocked });
  };

  const handleKickStudent = (studentUserId: string) => {
    if (!connectionRef.current) return;
    connectionRef.current.sendAction('kick_student', { studentUserId });
  };

  const handleStartExamFlow = () => {
    if (!connectionRef.current) return;
    connectionRef.current.sendAction('start_countdown', {});
  };

  const handleEndExamFlow = () => {
    if (!connectionRef.current || !window.confirm('Are you sure you want to end this exam? This will force-submit all students.')) return;
    connectionRef.current.sendAction('end_exam', {});
  };

  if (!room) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-semibold">Connecting to Exam Room...</p>
      </div>
    );
  }

  // Calculate some analytics
  const readyStudents = participants.filter(p => p.isReady).length;
  const totalStudents = participants.length;

  return (
    <div className="space-y-6 relative">
      
      {/* COUNTDOWN SCREEN overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-indigo-950/95 backdrop-blur-md flex flex-col justify-center items-center z-50 text-white"
          >
            <motion.h3
              initial={{ scale: 0.5 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-8xl font-black mb-4 tracking-tighter text-amber-400"
            >
              {countdown > 0 ? countdown : 'GO!'}
            </motion.h3>
            <p className="text-xl font-bold text-slate-300">Exam is launching. Prepare!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Code Box */}
        <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Live Room Code</p>
          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider my-1.5 font-mono">
            {room.code}
          </p>
          <button
            id="copy_link_btn"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied Link!' : 'Copy Invite Link'}
          </button>
        </div>

        {/* Status Indicators */}
        <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center">Exam Progress</p>
          <div className="flex items-center justify-center gap-2.5 mt-2">
            <span className={`h-2.5 w-2.5 rounded-full animate-ping ${
              room.status === 'lobby' ? 'bg-amber-400' :
              room.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'
            }`} />
            <span className="text-base font-black text-slate-800 dark:text-white capitalize">
              {room.status === 'lobby' ? 'Waiting in Lobby' :
               room.status === 'active' ? 'Exam Active' : 'Exam Complete'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            {room.questions.length} questions generated
          </p>
        </div>

        {/* Student Counters */}
        <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm flex flex-col justify-center text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Joined Students</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white my-1">
            {totalStudents} <span className="text-sm text-slate-400">/ {room.maxStudents}</span>
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {room.status === 'lobby' ? `${readyStudents} of ${totalStudents} ready` : 'Answering Questions...'}
          </p>
        </div>

        {/* Action button */}
        <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-4 shadow-sm flex flex-col justify-center gap-2">
          {room.status === 'lobby' ? (
            <button
              id="start_exam_btn"
              onClick={handleStartExamFlow}
              disabled={totalStudents === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-95 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Launch Exam
            </button>
          ) : room.status === 'active' ? (
            <button
              id="end_exam_btn"
              onClick={handleEndExamFlow}
              className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Power className="h-4 w-4" />
              End Exam Now
            </button>
          ) : (
            <button
              id="close_room_btn"
              onClick={onExit}
              className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              Exit to Dashboard
            </button>
          )}
          <div className="flex justify-between items-center px-1">
            <button
              id="toggle_lock_btn"
              onClick={handleToggleLock}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              {room.isLocked ? (
                <>
                  <Lock className="h-3 w-3 text-amber-500" /> Unlock Room
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 text-indigo-500" /> Lock Room
                </>
              )}
            </button>
            <span className="text-[10px] text-slate-400">
              LateJoin: {room.lateJoinEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Body based on Room Status */}
      {room.status === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Grid (Lobby) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-indigo-500" />
                Lobby Participants
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Wait for everyone to click "Ready"</p>
            </div>

            {participants.length > 0 ? (
              <div id="lobby_students_grid" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {participants.map((student) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={student.id}
                    className={`relative p-4 border rounded-2xl flex flex-col items-center text-center shadow-sm transition-all ${
                      student.isReady
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400'
                        : 'border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shadow-sm mb-2 ${
                      student.isReady ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-xs truncate w-full px-1">{student.name}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1 block">
                      {student.isReady ? 'Ready' : 'Joined'}
                    </span>

                    {/* Kick Action Button */}
                    <button
                      id={`kick_${student.userId}_btn`}
                      type="button"
                      onClick={() => handleKickStudent(student.userId)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                      title="Kick student"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                <Users className="h-12 w-12 mx-auto stroke-1 opacity-30 mb-2.5 animate-pulse" />
                <p className="text-sm font-semibold">Waiting for participants to join...</p>
                <p className="text-xs text-slate-400 mt-1">Provide students with room code <span className="font-mono font-bold text-indigo-500">{room.code}</span></p>
              </div>
            )}
          </div>

          {/* Exam Details Sidebar */}
          <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
              Exam Parameters
            </h4>
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              {room.config.addition.enabled && (
                <div className="flex justify-between">
                  <span>Addition (Horizontal):</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {room.config.addition.numQuestions} Qs • {room.config.addition.digits} Digits • {room.config.addition.termsCount} Factors
                  </span>
                </div>
              )}
              {room.config.subtraction.enabled && (
                <div className="flex justify-between">
                  <span>Subtraction:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {room.config.subtraction.numQuestions} Qs • {room.config.subtraction.digits} Digits
                  </span>
                </div>
              )}
              {room.config.multiplication.enabled && (
                <div className="flex justify-between">
                  <span>Multiplication:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {room.config.multiplication.numQuestions} Qs • {room.config.multiplication.digits1 || 2} Digits × {room.config.multiplication.digits2 || 1} Digit
                  </span>
                </div>
              )}
              {room.config.division.enabled && (
                <div className="flex justify-between">
                  <span>Division:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {room.config.division.numQuestions} Qs • {room.config.division.dividendDigits || 2} Digits ÷ {room.config.division.divisorDigits || 1} Digit
                  </span>
                </div>
              )}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 space-y-2">
                <div className="flex justify-between">
                  <span>Duration Limit:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{Math.round(room.config.general.durationSeconds / 60)} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Points per question:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{room.config.general.pointsPerQuestion} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-Submit:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{room.config.general.autoSubmit ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE GAME progress watcher */}
      {room.status === 'active' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-1">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-500 animate-pulse" />
              Live Progress Monitoring
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{participants.length} Active Students Answering</p>
          </div>

          <div id="live_progress_container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((student) => {
              const answered = student.progress; // This is directly a progress percentage 0 to 100
              const isFinished = answered >= 100;

              return (
                <motion.div
                  layoutId={`student_card_${student.id}`}
                  key={student.id}
                  className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl p-4 shadow-sm relative flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                        {student.name}
                        {student.disconnected && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-400">Offline</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Question {student.currentQuestionIndex + 1} of {room.questions.length}
                      </p>
                    </div>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{student.score} pts</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span className="text-slate-400">Progress</span>
                      <span className={isFinished ? 'text-emerald-500' : 'text-slate-600'}>
                        {isFinished ? 'Completed' : `${Math.round(answered)}%`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${answered}%` }}
                        className={`h-full rounded-full ${
                          isFinished 
                            ? 'bg-emerald-500' 
                            : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Tiny details */}
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/50">
                    <span className="text-emerald-600">Correct: {student.correctAnswers}</span>
                    <span className="text-rose-500">Wrong: {student.wrongAnswers}</span>
                    <span>Time: {student.timeSpent}s</span>
                  </div>
                </motion.div>
              );
            })}

            {participants.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-400">
                <p>No students participated in this exam yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENDED LEADERBOARD view */}
      {room.status === 'ended' && (
        <LeaderboardView
          room={room}
          participants={participants}
          isTeacher={true}
        />
      )}

    </div>
  );
}
