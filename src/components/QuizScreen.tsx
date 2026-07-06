import React, { useState, useEffect, useRef } from 'react';
import { MathQuestion, ExamRoom } from '../types';
import { Clock, CheckCircle, ArrowRight, Save, Keyboard, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuizScreenProps {
  questions: MathQuestion[];
  room: ExamRoom;
  onAnswerSubmit: (questionId: string, answer: string, isCorrect: boolean, scoreDelta: number, currentIdx: number) => void;
  onComplete: (timeSpent: number) => void;
}

export default function QuizScreen({ questions, room, onAnswerSubmit, onComplete }: QuizScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(room.config.general.durationSeconds);
  const [startTime] = useState(Date.now());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIdx];

  // Global Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleForceSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Focus input automatically on question change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setTypedAnswer('');
    setHasSubmitted(false);
  }, [currentIdx]);

  const handleForceSubmit = () => {
    // Force-complete quiz when timer hits zero
    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    onComplete(totalSeconds);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Numbers only. No letters, no signs except minus if first char
    let value = e.target.value.replace(/\s/g, ''); // ignore all spaces
    
    // Allow empty or minus sign as first char, otherwise numbers only
    if (value === '-' || /^-?\d*$/.test(value)) {
      setTypedAnswer(value);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasSubmitted || typedAnswer === '' || typedAnswer === '-') return;

    setHasSubmitted(true);

    const parsedStudentAns = parseInt(typedAnswer, 10);
    const expectedAns = currentQuestion.answer;
    
    const isCorrect = parsedStudentAns === expectedAns;
    const pointsDelta = isCorrect ? room.config.general.pointsPerQuestion : 0;

    // Report answer up to coordinator
    onAnswerSubmit(currentQuestion.id, typedAnswer, isCorrect, pointsDelta, currentIdx);

    // Pause briefly to show saving visual, then move to next
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        const totalSeconds = Math.round((Date.now() - startTime) / 1000);
        onComplete(totalSeconds);
      }
    }, 400);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercentage = Math.round(((currentIdx) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Timer and Progress Banner */}
      <div className="flex justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-3.5 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question</span>
          <span className="text-sm font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {currentIdx + 1} of {questions.length}
          </span>
        </div>

        {/* Live Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
          timeLeft < 30 
            ? 'bg-rose-50 border-rose-200 text-rose-500 animate-pulse' 
            : 'bg-indigo-50/50 border-indigo-200/40 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400'
        }`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${progressPercentage}%` }}
          className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
        />
      </div>

      {/* Main Question Card stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-xl text-center relative"
        >
          <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
            {currentQuestion.category}
          </span>

          {/* Mathematical Expression Box */}
          <div className="py-6 sm:py-10 flex flex-col justify-center items-center">
            {currentQuestion.category === 'addition' ? (
              <div className="inline-flex flex-col items-end border-b-4 border-slate-800 dark:border-slate-200 pb-3 px-6 min-w-[150px] max-w-xs font-mono text-4xl sm:text-6xl font-black text-slate-800 dark:text-white">
                {currentQuestion.displayExpression.split(' ').map((part, idx) => {
                  const isNegative = part.startsWith('-');
                  const num = isNegative ? part.slice(1) : part;
                  const operator = isNegative ? '-' : '';
                  return (
                    <div key={idx} className="flex justify-between items-center w-full gap-6 py-1">
                      <span className="text-slate-400 dark:text-slate-500 font-bold text-3xl sm:text-4xl select-none w-8 text-left">
                        {operator}
                      </span>
                      <span className="text-right flex-1 font-black tracking-tight">
                        {num}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <h3 className="text-5xl sm:text-7xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                {currentQuestion.displayExpression}
              </h3>
            )}
            
            {/* Division specific helper subtitle */}
            {currentQuestion.category === 'division' && currentQuestion.remainder && (
              <p className="text-xs font-semibold text-slate-400 mt-3 flex items-center justify-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Find the quotient. Remainder {currentQuestion.remainder} is expected.
              </p>
            )}
          </div>

          {/* Input Box and trigger buttons */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                Type your answer below
              </label>
              <div className="relative">
                <input
                  id="quiz_answer_input"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9-]*"
                  required
                  disabled={hasSubmitted}
                  placeholder="Enter value"
                  value={typedAnswer}
                  onChange={handleInputChange}
                  className="w-full text-center py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 bg-white dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 text-2xl font-black text-slate-800 dark:text-slate-100"
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              id="quiz_submit_btn"
              type="submit"
              disabled={hasSubmitted || typedAnswer === '' || typedAnswer === '-'}
              className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-base shadow-md transition-all active:scale-98 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {hasSubmitted ? (
                <>
                  <Save className="h-5 w-5 animate-pulse" />
                  Saving Answer...
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Keyboard tip */}
          <div className="mt-8 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1 font-semibold">
            <Keyboard className="h-3.5 w-3.5" />
            Press <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">Enter ↵</kbd> on your keyboard to instantly submit
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
