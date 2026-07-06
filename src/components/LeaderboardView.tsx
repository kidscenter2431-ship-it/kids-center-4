import { Participant, ExamRoom } from '../types';
import { Award, Trophy, Medal, Download, Printer, Search, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

interface LeaderboardViewProps {
  participants: Participant[];
  room: ExamRoom;
  onRefresh?: () => void;
  isTeacher?: boolean;
}

export default function LeaderboardView({ participants, room, onRefresh, isTeacher = false }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Sort participants by score (descending), then correct answers (desc), then time spent (ascending)
  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aAccuracy = a.correctAnswers / (a.correctAnswers + a.wrongAnswers || 1);
    const bAccuracy = b.correctAnswers / (b.correctAnswers + b.wrongAnswers || 1);
    if (bAccuracy !== aAccuracy) {
      return bAccuracy - aAccuracy;
    }
    return a.timeSpent - b.timeSpent;
  });

  // Podium mappings
  const firstPlace = sortedParticipants[0] || null;
  const secondPlace = sortedParticipants[1] || null;
  const thirdPlace = sortedParticipants[2] || null;

  const filteredParticipants = sortedParticipants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Download results as Excel/CSV
  const handleDownloadExcel = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Rank,Student Name,Score,Correct Answers,Wrong Answers,Accuracy (%),Time Spent (s)\n';

    sortedParticipants.forEach((p, idx) => {
      const accuracy = Math.round((p.correctAnswers / (room.questions.length || 1)) * 100);
      const row = `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.score},${p.correctAnswers},${p.wrongAnswers},${accuracy}%,${p.timeSpent}\n`;
      csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Exam_Results_Room_${room.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Card PDF
  const handlePrintPDF = () => {
    window.print();
  };

  const getAccuracyColor = (pct: number) => {
    if (pct >= 85) return 'text-emerald-500';
    if (pct >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-8 print:bg-white print:text-black">
      {/* Header and Download Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Results Leaderboard
          </span>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1.5">
            Exam Complete! Results & Statistics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Room Code: <span className="font-mono font-bold text-indigo-500">{room.code}</span> • Total Questions: {room.questions.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              id="refresh_results_btn"
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            id="download_excel_btn"
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Excel (CSV)
          </button>
          <button
            id="print_pdf_btn"
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Report PDF
          </button>
        </div>
      </div>

      {/* Styled Printable Header */}
      <div className="hidden print:block border-b-2 border-slate-200 pb-4 mb-6">
        <h1 className="text-3xl font-black text-slate-900">KIDS CENTER - EXAM REPORT CARD</h1>
        <p className="text-sm text-slate-500 mt-1">
          Date: {new Date(room.createdAt).toLocaleDateString()} • Room Code: {room.code} • Teacher: Newton
        </p>
      </div>

      {/* Podium Visualization */}
      {sortedParticipants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-6 items-end print:hidden">
          {/* 2ND PLACE */}
          <div className="order-2 md:order-1">
            {secondPlace ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full border-2 border-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xl shadow-md">
                    {secondPlace.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 p-1 rounded-full border border-white">
                    <Medal className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-center w-full">
                  <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[150px] mx-auto">{secondPlace.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{secondPlace.score} pts</p>
                </div>
                {/* 2nd pedestal */}
                <div className="w-full h-24 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-900 dark:to-slate-800/80 border-t border-slate-300 dark:border-slate-800 rounded-t-xl mt-4 shadow-inner flex items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-400">2</span>
                </div>
              </motion.div>
            ) : (
              <div className="h-1" />
            )}
          </div>

          {/* 1ST PLACE */}
          <div className="order-1 md:order-2">
            {firstPlace ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-400 bg-amber-500/10 flex items-center justify-center font-bold text-amber-500 text-2xl shadow-xl animate-bounce-slow">
                    {firstPlace.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 p-1.5 rounded-full border-2 border-white shadow-md">
                    <Trophy className="h-5 w-5 text-yellow-100 animate-pulse" />
                  </div>
                </div>
                <div className="text-center w-full">
                  <p className="font-black text-slate-800 dark:text-white text-base truncate max-w-[180px] mx-auto">{firstPlace.name}</p>
                  <p className="text-xs text-amber-500 font-bold">{firstPlace.score} pts</p>
                </div>
                {/* 1st pedestal */}
                <div className="w-full h-32 bg-gradient-to-t from-amber-500/20 to-amber-400/10 dark:from-amber-950/20 dark:to-amber-900/10 border-t-2 border-amber-400 rounded-t-2xl mt-4 shadow-md flex items-center justify-center">
                  <span className="text-5xl font-black text-amber-500/80">1</span>
                </div>
              </motion.div>
            ) : (
              <div className="h-1" />
            )}
          </div>

          {/* 3RD PLACE */}
          <div className="order-3">
            {thirdPlace ? (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <div className="w-14 h-14 rounded-full border-2 border-amber-700 bg-amber-900/5 flex items-center justify-center font-bold text-amber-700 text-lg shadow-md">
                    {thirdPlace.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-700 text-white p-1 rounded-full border border-white">
                    <Medal className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-center w-full">
                  <p className="font-bold text-slate-800 dark:text-white text-xs truncate max-w-[130px] mx-auto">{thirdPlace.name}</p>
                  <p className="text-xs text-amber-700 font-semibold">{thirdPlace.score} pts</p>
                </div>
                {/* 3rd pedestal */}
                <div className="w-full h-18 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-900 dark:to-slate-800/80 border-t border-slate-300 dark:border-slate-800 rounded-t-xl mt-4 shadow-inner flex items-center justify-center">
                  <span className="text-3xl font-bold text-amber-800/60">3</span>
                </div>
              </motion.div>
            ) : (
              <div className="h-1" />
            )}
          </div>
        </div>
      )}

      {/* Results Search and List */}
      <div className="border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
        
        {/* Search Input */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap justify-between items-center gap-4 print:hidden">
          <h3 className="font-bold text-slate-800 dark:text-white">Participants Results Table</h3>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="results_search_input"
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          {filteredParticipants.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-16">Rank</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6 text-center">Accuracy</th>
                  <th className="py-4 px-6 text-center">Correct / Wrong</th>
                  <th className="py-4 px-6 text-center">Time Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {filteredParticipants.map((p, idx) => {
                  const totalAns = p.correctAnswers + p.wrongAnswers;
                  const accuracy = Math.round((p.correctAnswers / (room.questions.length || 1)) * 100);

                  return (
                    <tr
                      id={`result_row_${p.id}`}
                      key={p.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all text-slate-700 dark:text-slate-300 font-medium"
                    >
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-slate-100 text-slate-700' :
                          idx === 2 ? 'bg-amber-900/10 text-amber-800' :
                          'bg-transparent text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {p.name}
                        {p.disconnected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">Offline</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-indigo-600 dark:text-indigo-400">{p.score}</td>
                      <td className={`py-4 px-6 text-center font-bold ${getAccuracyColor(accuracy)}`}>
                        {accuracy}%
                      </td>
                      <td className="py-4 px-6 text-center text-xs">
                        <div className="flex items-center justify-center gap-3">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle className="h-3.5 w-3.5" /> {p.correctAnswers}
                          </span>
                          <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-semibold">
                            <XCircle className="h-3.5 w-3.5" /> {p.wrongAnswers}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {p.timeSpent}s
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Award className="h-12 w-12 mx-auto stroke-1 opacity-30 mb-2" />
              <p className="text-sm">No participant records matching your search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
