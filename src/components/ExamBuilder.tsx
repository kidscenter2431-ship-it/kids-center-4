import { useState } from 'react';
import { ExamConfig, ExamRoom } from '../types';
import { Plus, Minus, Hash, RotateCcw, HelpCircle, ChevronRight, Settings, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ExamBuilderProps {
  onBuild: (config: ExamConfig, roomSettings: { password?: string; maxStudents: number; lateJoinEnabled: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function ExamBuilder({ onBuild, onCancel, loading }: ExamBuilderProps) {
  // Advanced Math configuration state
  const [addition, setAddition] = useState({
    enabled: true,
    numQuestions: 10,
    digits: 2,
    termsCount: 3, // default horizontal e.g. 54 23 -9
    carryEnabled: true,
    minVal: 1,
    maxVal: 99
  });

  const [subtraction, setSubtraction] = useState({
    enabled: false,
    numQuestions: 10,
    digits: 2,
    horizontal: true,
    borrowEnabled: true,
    alwaysPositive: true
  });

  const [multiplication, setMultiplication] = useState({
    enabled: false,
    digits1: 2,
    digits2: 1,
    numQuestions: 10
  });

  const [division, setDivision] = useState({
    enabled: false,
    dividendDigits: 2,
    divisorDigits: 1,
    exactOnly: true,
    allowRemainder: false,
    numQuestions: 10
  });

  const [general, setGeneral] = useState({
    totalQuestions: 10,
    randomOrder: true,
    durationSeconds: 300, // 5 minutes
    pointsPerQuestion: 10,
    autoSubmit: true,
    showAnswersAfter: true,
    showScoreImmediately: true
  });

  // Room parameters
  const [password, setPassword] = useState('');
  const [maxStudents, setMaxStudents] = useState(50);
  const [lateJoinEnabled, setLateJoinEnabled] = useState(true);

  const [activeTab, setActiveTab] = useState<'addition' | 'subtraction' | 'multiplication' | 'division' | 'general'>('addition');

  const handleGenerate = () => {
    // Compile and trigger build
    const compiledConfig: ExamConfig = {
      addition,
      subtraction,
      multiplication,
      division,
      general: {
        ...general,
        // Make sure totalQuestions matches the sum of enabled categories if smaller
        totalQuestions: general.totalQuestions || 
          (addition.enabled ? addition.numQuestions : 0) +
          (subtraction.enabled ? subtraction.numQuestions : 0) +
          (multiplication.enabled ? multiplication.numQuestions : 0) +
          (division.enabled ? division.numQuestions : 0)
      }
    };

    onBuild(compiledConfig, {
      password: password.trim() || undefined,
      maxStudents,
      lateJoinEnabled
    });
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-500 animate-spin-slow" />
            Advanced Exam Room Builder
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Construct customized real-time mental math competitions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            id="builder_cancel_btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="builder_generate_btn"
            type="button"
            onClick={handleGenerate}
            disabled={loading || (!addition.enabled && !subtraction.enabled && !multiplication.enabled && !division.enabled)}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-95 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? 'Creating...' : 'Generate Exam Code'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 mb-2">Math Operations</p>
          {[
            { id: 'addition', label: 'Addition Mode', desc: 'Horizontal display, only 1 minus', enabled: addition.enabled, icon: <Plus className="h-4 w-4" /> },
            { id: 'subtraction', label: 'Subtraction Mode', desc: 'No-borrow limits, horizontal', enabled: subtraction.enabled, icon: <Minus className="h-4 w-4" /> },
            { id: 'multiplication', label: 'Multiplication Mode', desc: 'Custom tables & ranges', enabled: multiplication.enabled, icon: <Hash className="h-4 w-4" /> },
            { id: 'division', label: 'Division Mode', desc: 'Remainders & quotients', enabled: division.enabled, icon: <span className="font-bold text-xs">÷</span> },
          ].map((tab) => (
            <button
              id={`tab_${tab.id}_btn`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl border transition-all text-sm cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 dark:from-indigo-500/10 dark:to-fuchsia-500/5 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg border ${
                  tab.enabled 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {tab.icon}
                </div>
                <div>
                  <p className="font-semibold leading-tight">{tab.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{tab.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          ))}

          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-3 mt-6 mb-2">Configurations</p>
          <button
            id="tab_general_btn"
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center justify-between text-left p-3.5 rounded-xl border transition-all text-sm cursor-pointer ${
              activeTab === 'general'
                ? 'bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-500">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold leading-tight">General & Lobby Settings</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Rules, timer, security, limits</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Configurations Panel */}
        <div id="builder_config_panel" className="col-span-1 lg:col-span-3 border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 shadow-md">
          
          {/* ADDITION CONFIG */}
          {activeTab === 'addition' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Addition Configuration</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Enable and tweak custom horizontal addition algorithms</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="add_enable_checkbox"
                    type="checkbox"
                    checked={addition.enabled}
                    onChange={(e) => setAddition({ ...addition, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-300 peer-checked:bg-emerald-500" />
                  <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{addition.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              {addition.enabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Questions</label>
                    <input
                      id="add_questions_input"
                      type="number"
                      min={1}
                      max={50}
                      value={addition.numQuestions}
                      onChange={(e) => setAddition({ ...addition, numQuestions: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Digits</label>
                    <select
                      id="add_digits_select"
                      value={addition.digits}
                      onChange={(e) => setAddition({ ...addition, digits: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1 Digit (e.g. 5)</option>
                      <option value={2}>2 Digits (e.g. 54)</option>
                      <option value={3}>3 Digits (e.g. 543)</option>
                      <option value={4}>4 Digits (e.g. 5432)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Expression Length (Horizontal Numbers)
                    </label>
                    <input
                      id="add_terms_input"
                      type="number"
                      min={2}
                      max={8}
                      value={addition.termsCount}
                      onChange={(e) => setAddition({ ...addition, termsCount: parseInt(e.target.value) || 3 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                      Number of horizontal factors (e.g. 3 means: <code>80 -15 27</code>).
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Carry Over Behavior</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="add_carry_yes"
                          type="radio"
                          checked={addition.carryEnabled}
                          onChange={() => setAddition({ ...addition, carryEnabled: true })}
                          className="text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Allow Carry (Standard)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="add_carry_no"
                          type="radio"
                          checked={!addition.carryEnabled}
                          onChange={() => setAddition({ ...addition, carryEnabled: false })}
                          className="text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Disable Carry</span>
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3">
                    <Info className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-indigo-700 dark:text-indigo-400">💡 Special Addition Display Rules Applied:</p>
                      <p>• Horizontal display format with all plus signs (+) hidden completely!</p>
                      <p>• Exactly ONE subtraction term is randomized (appearing anywhere except first position).</p>
                      <p>• Subtraction term is always smaller than the preceding number to avoid invalid/negative intermediate calculations.</p>
                      <p className="italic text-[10px] mt-1 text-slate-400">Example Output: <code>54 23 16 -9 42</code> or <code>80 -15 27 31</code></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Plus className="h-12 w-12 mx-auto stroke-1 opacity-40 mb-3" />
                  <p>Addition category is currently disabled.</p>
                  <p className="text-xs mt-1">Toggle the checkbox above to enable addition mode.</p>
                </div>
              )}
            </div>
          )}

          {/* SUBTRACTION CONFIG */}
          {activeTab === 'subtraction' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Subtraction Configuration</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Generate clean standard subtraction exercises separately</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="sub_enable_checkbox"
                    type="checkbox"
                    checked={subtraction.enabled}
                    onChange={(e) => setSubtraction({ ...subtraction, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-300 peer-checked:bg-emerald-500" />
                  <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{subtraction.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              {subtraction.enabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Questions</label>
                    <input
                      id="sub_questions_input"
                      type="number"
                      min={1}
                      max={50}
                      value={subtraction.numQuestions}
                      onChange={(e) => setSubtraction({ ...subtraction, numQuestions: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Digits</label>
                    <select
                      id="sub_digits_select"
                      value={subtraction.digits}
                      onChange={(e) => setSubtraction({ ...subtraction, digits: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1 Digit (e.g. 9 - 4)</option>
                      <option value={2}>2 Digits (e.g. 54 - 23)</option>
                      <option value={3}>3 Digits (e.g. 543 - 128)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Borrowing Allowed</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="sub_borrow_yes"
                          type="radio"
                          checked={subtraction.borrowEnabled}
                          onChange={() => setSubtraction({ ...subtraction, borrowEnabled: true })}
                          className="text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Allow Borrowing</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="sub_borrow_no"
                          type="radio"
                          checked={!subtraction.borrowEnabled}
                          onChange={() => setSubtraction({ ...subtraction, borrowEnabled: false })}
                          className="text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Disable Borrowing</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Answer Bounds</label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="sub_positive_yes"
                          type="checkbox"
                          checked={subtraction.alwaysPositive}
                          onChange={(e) => setSubtraction({ ...subtraction, alwaysPositive: e.target.checked })}
                          className="rounded text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Always Positive Answers (A ≥ B)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Minus className="h-12 w-12 mx-auto stroke-1 opacity-40 mb-3" />
                  <p>Subtraction category is currently disabled.</p>
                  <p className="text-xs mt-1">Toggle the checkbox above to enable subtraction mode.</p>
                </div>
              )}
            </div>
          )}

          {/* MULTIPLICATION CONFIG */}
          {activeTab === 'multiplication' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Multiplication Configuration</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Configure number of digits for term 1 and term 2 in multiplication</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="mult_enable_checkbox"
                    type="checkbox"
                    checked={multiplication.enabled}
                    onChange={(e) => setMultiplication({ ...multiplication, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-300 peer-checked:bg-emerald-500" />
                  <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{multiplication.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              {multiplication.enabled ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Questions</label>
                      <input
                        id="mult_questions_input"
                        type="number"
                        min={1}
                        max={50}
                        value={multiplication.numQuestions}
                        onChange={(e) => setMultiplication({ ...multiplication, numQuestions: parseInt(e.target.value) || 10 })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div />

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Term 1 Digits (الرقم الأول)</label>
                      <select
                        id="mult_digits1_select"
                        value={multiplication.digits1}
                        onChange={(e) => setMultiplication({ ...multiplication, digits1: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>1 Digit (e.g. 5)</option>
                        <option value={2}>2 Digits (e.g. 54)</option>
                        <option value={3}>3 Digits (e.g. 543)</option>
                        <option value={4}>4 Digits (e.g. 5432)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Term 2 Digits (الرقم الثاني)</label>
                      <select
                        id="mult_digits2_select"
                        value={multiplication.digits2}
                        onChange={(e) => setMultiplication({ ...multiplication, digits2: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>1 Digit (e.g. 5)</option>
                        <option value={2}>2 Digits (e.g. 54)</option>
                        <option value={3}>3 Digits (e.g. 543)</option>
                        <option value={4}>4 Digits (e.g. 5432)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Hash className="h-12 w-12 mx-auto stroke-1 opacity-40 mb-3" />
                  <p>Multiplication category is currently disabled.</p>
                  <p className="text-xs mt-1">Toggle the checkbox above to enable multiplication mode.</p>
                </div>
              )}
            </div>
          )}

          {/* DIVISION CONFIG */}
          {activeTab === 'division' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Division Configuration</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Configure number of digits for dividend and divisor in division</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="div_enable_checkbox"
                    type="checkbox"
                    checked={division.enabled}
                    onChange={(e) => setDivision({ ...division, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-300 peer-checked:bg-emerald-500" />
                  <span className="ml-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{division.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              {division.enabled ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Number of Questions</label>
                      <input
                        id="div_questions_input"
                        type="number"
                        min={1}
                        max={50}
                        value={division.numQuestions}
                        onChange={(e) => setDivision({ ...division, numQuestions: parseInt(e.target.value) || 10 })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Calculation Restrictions</label>
                      <div className="space-y-2 mt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            id="div_exact_checkbox"
                            type="checkbox"
                            checked={division.exactOnly}
                            onChange={(e) => setDivision({ ...division, exactOnly: e.target.checked, allowRemainder: e.target.checked ? false : division.allowRemainder })}
                            className="rounded text-indigo-500 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-300">Exact division only (No remainders)</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            id="div_remainder_checkbox"
                            type="checkbox"
                            disabled={division.exactOnly}
                            checked={division.allowRemainder && !division.exactOnly}
                            onChange={(e) => setDivision({ ...division, allowRemainder: e.target.checked })}
                            className="rounded text-indigo-500 focus:ring-indigo-500 disabled:opacity-40"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40">Allow Remainders (Find quotient)</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Dividend Digits (المقسوم)</label>
                      <select
                        id="div_dividend_digits_select"
                        value={division.dividendDigits}
                        onChange={(e) => setDivision({ ...division, dividendDigits: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>1 Digit (e.g. 8)</option>
                        <option value={2}>2 Digits (e.g. 84)</option>
                        <option value={3}>3 Digits (e.g. 843)</option>
                        <option value={4}>4 Digits (e.g. 8432)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Divisor Digits (المقسوم عليه)</label>
                      <select
                        id="div_divisor_digits_select"
                        value={division.divisorDigits}
                        onChange={(e) => setDivision({ ...division, divisorDigits: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>1 Digit (e.g. 4)</option>
                        <option value={2}>2 Digits (e.g. 24)</option>
                        <option value={3}>3 Digits (e.g. 120)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <span className="text-3xl font-black block leading-none opacity-40 mb-3 text-slate-400">÷</span>
                  <p>Division category is currently disabled.</p>
                  <p className="text-xs mt-1">Toggle the checkbox above to enable division mode.</p>
                </div>
              )}
            </div>
          )}

          {/* GENERAL & LOBBY SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800">
                General Rules & Room Controls
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Total Questions Limit</label>
                  <input
                    id="gen_total_questions"
                    type="number"
                    min={1}
                    value={general.totalQuestions}
                    onChange={(e) => setGeneral({ ...general, totalQuestions: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Maximum questions across all enabled modes. Set 0 for uncapped sum.</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Exam Duration (Minutes)</label>
                  <input
                    id="gen_duration"
                    type="number"
                    min={1}
                    value={Math.round(general.durationSeconds / 60)}
                    onChange={(e) => setGeneral({ ...general, durationSeconds: (parseInt(e.target.value) || 5) * 60 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Auto-submits student exam when timer hits zero.</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Points per Correct Answer</label>
                  <input
                    id="gen_points"
                    type="number"
                    min={1}
                    value={general.pointsPerQuestion}
                    onChange={(e) => setGeneral({ ...general, pointsPerQuestion: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Release Scores</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="gen_release_immediately"
                        type="radio"
                        checked={general.showScoreImmediately}
                        onChange={() => setGeneral({ ...general, showScoreImmediately: true })}
                        className="text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Show score immediately</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="gen_release_later"
                        type="radio"
                        checked={!general.showScoreImmediately}
                        onChange={() => setGeneral({ ...general, showScoreImmediately: false })}
                        className="text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Release after exam ends</span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 pb-4 border-b border-slate-100 dark:border-slate-800 mt-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Optional Security & Lobby Settings</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Room Password (Optional)</label>
                      <input
                        id="room_password_input"
                        type="text"
                        placeholder="Leave blank for public room"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Max Students Limit</label>
                      <input
                        id="room_max_students"
                        type="number"
                        min={1}
                        max={200}
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(parseInt(e.target.value) || 50)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-6 mt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="gen_random_checkbox"
                      type="checkbox"
                      checked={general.randomOrder}
                      onChange={(e) => setGeneral({ ...general, randomOrder: e.target.checked })}
                      className="rounded text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Randomize question order for students</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="gen_latejoin_checkbox"
                      type="checkbox"
                      checked={lateJoinEnabled}
                      onChange={(e) => setLateJoinEnabled(e.target.checked)}
                      className="rounded text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Allow late-joining after quiz starts</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="gen_show_answers_checkbox"
                      type="checkbox"
                      checked={general.showAnswersAfter}
                      onChange={(e) => setGeneral({ ...general, showAnswersAfter: e.target.checked })}
                      className="rounded text-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Reveal correct answers to students upon submission</span>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
