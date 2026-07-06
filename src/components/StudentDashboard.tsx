import React, { useEffect, useState, useRef } from 'react';
import { db, subscribeToRoom, RoomConnection } from '../lib/db';
import { ExamRoom, Participant, UserProfile } from '../types';
import QuizScreen from './QuizScreen';
import LeaderboardView from './LeaderboardView';
import { KeyRound, User, Play, Clock, Users, ArrowRight, ShieldAlert, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentDashboardProps {
  user: UserProfile;
  onExit: () => void;
}

type StudentState = 'join_form' | 'lobby' | 'countdown' | 'quiz' | 'ended';

export default function StudentDashboard({ user, onExit }: StudentDashboardProps) {
  const [studentState, setStudentState] = useState<StudentState>('join_form');
  const [roomCode, setRoomCode] = useState(() => {
    // Check if '?join=XXXXXX' is present in URL to prefill
    const params = new URLSearchParams(window.location.search);
    return params.get('join') || '';
  });
  const [roomPassword, setRoomPassword] = useState('');
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('student_name') || user.name || '';
  });

  const [activeRoom, setActiveRoom] = useState<ExamRoom | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connectionRef = useRef<RoomConnection | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state transitions with server room status changes
  useEffect(() => {
    if (!activeRoom) return;

    if (activeRoom.status === 'lobby' && studentState !== 'lobby') {
      setStudentState('lobby');
    } else if (activeRoom.status === 'countdown' && studentState !== 'countdown' && studentState !== 'quiz') {
      setStudentState('countdown');
      triggerCountdown();
    } else if (activeRoom.status === 'active' && studentState !== 'quiz' && studentState !== 'ended') {
      setStudentState('quiz');
    } else if (activeRoom.status === 'ended' && studentState !== 'ended') {
      setStudentState('ended');
    }
  }, [activeRoom?.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) connectionRef.current.disconnect();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const triggerCountdown = () => {
    let count = 5;
    setCountdown(count);

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(countdownTimerRef.current!);
        setCountdown(null);
        setStudentState('quiz');
      }
    }, 1000);
  };

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formattedCode = roomCode.trim().replace(/\s/g, '');
    if (formattedCode.length !== 6) {
      setError('Please enter a valid 6-digit room code');
      setLoading(false);
      return;
    }

    if (!studentName.trim()) {
      setError('Please enter your name to join');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Room Details
      const room = await db.rooms.getByCode(formattedCode);
      if (!room) {
        throw new Error('Exam room not found. Check the code!');
      }

      // Check Password if set
      if (room.password && room.password !== roomPassword.trim()) {
        throw new Error('Incorrect room password');
      }

      // Save Student Name locally
      localStorage.setItem('student_name', studentName.trim());

      // 2. Connect via Real-Time WebSockets
      const conn = subscribeToRoom(
        formattedCode,
        user.id,
        studentName.trim(),
        (data) => {
          setActiveRoom(data.room);
          setParticipants(data.participants);

          const me = data.participants.find(p => p.userId === user.id);
          if (me) {
            setLocalParticipant(me);
          }
        },
        () => {
          // Kicked handler
          alert('You have been removed from the exam room by the teacher.');
          handleLeaveRoom();
        }
      );

      connectionRef.current = conn;
      setStudentState('lobby');
    } catch (err: any) {
      setError(err.message || 'Failed to join the room. Try again.');
    } finally {
      setLoading(false);
    }
  };

 const handleToggleReady = () => {
 console.log(localParticipant);
console.log(connectionRef.current);
  console.log(localParticipant);
  if (!connectionRef.current || !localParticipant) return;
const handleToggleReady = () => {
  console.log("localParticipant:", localParticipant);

  if (!connectionRef.current || !localParticipant) return;

  connectionRef.current.sendAction("ready", {
    isReady: !localParticipant.isReady
  });
};
  // تحديث محلي فوري
  setLocalParticipant({
    ...localParticipant,
    isReady: !localParticipant.isReady
  });

  connectionRef.current.sendAction("ready", {
    isReady: !localParticipant.isReady
  });
};
  const handleAnswerSubmit = (questionId: string, answer: string, isCorrect: boolean, scoreDelta: number, currentIdx: number) => {
    if (!connectionRef.current || !localParticipant || !activeRoom) return;

    const newScore = localParticipant.score + scoreDelta;
    const correctVal = localParticipant.correctAnswers + (isCorrect ? 1 : 0);
    const wrongVal = localParticipant.wrongAnswers + (!isCorrect ? 1 : 0);
    const newProgress = Math.min(((currentIdx + 1) / activeRoom.questions.length) * 100, 100);

    connectionRef.current.sendAction('submit_answer', {
      questionId,
      answer,
      score: newScore,
      correctAnswers: correctVal,
      wrongAnswers: wrongVal,
      progress: newProgress,
      currentQuestionIndex: currentIdx + 1,
      timeSpent: localParticipant.timeSpent // updated periodically or on complete
    });
  };

  const handleQuizComplete = (timeSpent: number) => {
    if (!connectionRef.current || !localParticipant) return;

    // Report completed stats
    connectionRef.current.sendAction('submit_answer', {
      questionId: 'complete',
      answer: 'complete',
      score: localParticipant.score,
      correctAnswers: localParticipant.correctAnswers,
      wrongAnswers: localParticipant.wrongAnswers,
      progress: 100,
      currentQuestionIndex: activeRoom!.questions.length,
      timeSpent
    });

    setStudentState('ended');
  };

  const handleLeaveRoom = () => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    setActiveRoom(null);
    setLocalParticipant(null);
    setParticipants([]);
    setStudentState('join_form');
    onExit();
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)]">
      {/* Background blurs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* 1. JOIN FORM */}
      {studentState === 'join_form' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto py-12 px-4"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Join Live Math Room</h2>
            <p className="text-sm text-slate-500 mt-2">Enter the room code shared by your teacher to join the competition</p>
          </div>

          <div id="join_room_card" className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl">
            {error && (
              <div id="join_error" className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoinLobby} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  6-Digit Room Code
                </label>
                <input
                  id="room_code_input"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 543128"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))} // digits only
                  className="w-full text-center tracking-widest text-2xl font-black px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-300 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Your Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="student_name_input"
                    type="text"
                    required
                    placeholder="Enter name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Room Password (If Required)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="room_password_input"
                    type="password"
                    placeholder="Leave blank if none"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                id="join_submit_btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Validating...' : 'Join Exam Lobby'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* 2. LOBBY */}
      {studentState === 'lobby' && activeRoom && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-xl mx-auto py-8 px-4 space-y-6"
        >
          <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg text-center space-y-4">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Math LOBBY Connected
            </span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Waiting in Lobby...</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Teacher: <span className="font-bold text-slate-700 dark:text-slate-200">{activeRoom.teacherName}</span> • Questions count: {activeRoom.questions.length}
            </p>

            <div className="py-4">
              <button
                id="ready_toggle_btn"
                onClick={handleToggleReady}
                className={`px-8 py-4 rounded-2xl text-base font-black shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 ${
                  localParticipant?.isReady
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {localParticipant?.isReady ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    I am READY!
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Click to Toggle READY
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400">The exam starts automatically as soon as the teacher clicks "Launch Exam".</p>
          </div>

          {/* Lobby grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2 px-1">
              <Users className="h-4 w-4" />
              Lobby participants ({participants.length}):
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 border rounded-xl flex items-center gap-2.5 text-xs font-bold truncate ${
                    p.isReady
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${p.isReady ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="truncate flex-1">{p.name} {p.userId === user.id && '(You)'}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. LOCAL COUNTDOWN */}
      {studentState === 'countdown' && (
        <div className="fixed inset-0 bg-indigo-950/95 backdrop-blur-md flex flex-col justify-center items-center z-50 text-white">
          <motion.h3
            initial={{ scale: 0.5 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-9xl font-black mb-4 tracking-tighter text-amber-400"
          >
            {countdown && countdown > 0 ? countdown : 'GO!'}
          </motion.h3>
          <p className="text-xl font-bold text-slate-300">Exam is launching now. Get Ready!</p>
        </div>
      )}

      {/* 4. ACTIVE QUIZ STAGE */}
      {studentState === 'quiz' && activeRoom && (
        <div className="py-8 px-4">
          <QuizScreen
            questions={activeRoom.questions}
            room={activeRoom}
            onAnswerSubmit={handleAnswerSubmit}
            onComplete={handleQuizComplete}
          />
        </div>
      )}

      {/* 5. ENDED/LEADERBOARD VIEW */}
      {studentState === 'ended' && activeRoom && (
        <div className="py-8 px-4 space-y-6">
          {/* Release Score conditions */}
          {activeRoom.config.general.showScoreImmediately || activeRoom.status === 'ended' ? (
            <LeaderboardView
              room={activeRoom}
              participants={participants}
            />
          ) : (
            <div className="max-w-md mx-auto text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-md space-y-4">
              <Clock className="h-12 w-12 text-indigo-500 mx-auto animate-bounce" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Exam Completed!</h2>
              <p className="text-sm text-slate-400">Your answers have been securely logged. The teacher is waiting for all students to complete before releasing scores.</p>
              <button
                id="student_leave_btn"
                onClick={handleLeaveRoom}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all"
              >
                Exit Lobby
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
