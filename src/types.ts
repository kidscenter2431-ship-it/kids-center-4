export type UserRole = 'teacher' | 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AdditionConfig {
  enabled: boolean;
  numQuestions: number;
  digits: number;
  termsCount: number; // number of horizontal numbers in expression
  carryEnabled: boolean;
  minVal: number;
  maxVal: number;
}

export interface SubtractionConfig {
  enabled: boolean;
  numQuestions: number;
  digits: number;
  horizontal: boolean;
  borrowEnabled: boolean;
  alwaysPositive: boolean;
}

export interface MultiplicationConfig {
  enabled: boolean;
  digits1: number; // number of digits for term 1 (e.g. 1, 2, 3)
  digits2: number; // number of digits for term 2 (e.g. 1, 2, 3)
  numQuestions: number;
}

export interface DivisionConfig {
  enabled: boolean;
  dividendDigits: number; // digits of dividend (e.g. 2, 3, 4)
  divisorDigits: number; // digits of divisor (e.g. 1, 2)
  exactOnly: boolean;
  allowRemainder: boolean;
  numQuestions: number;
}

export interface GeneralExamConfig {
  totalQuestions: number;
  randomOrder: boolean;
  durationSeconds: number; // total exam duration or per-question duration (let's do total)
  pointsPerQuestion: number;
  autoSubmit: boolean;
  showAnswersAfter: boolean;
  showScoreImmediately: boolean; // immediately or after everyone finishes
}

export interface ExamConfig {
  addition: AdditionConfig;
  subtraction: SubtractionConfig;
  multiplication: MultiplicationConfig;
  division: DivisionConfig;
  general: GeneralExamConfig;
}

export interface MathQuestion {
  id: string;
  expression: string; // e.g. "22 + 11 - 10 + 44 + 55" (displayed appropriately)
  displayExpression: string; // formatting of expression based on specific rules (e.g. spaces, missing signs)
  answer: number;
  remainder?: number;
  points: number;
  category: 'addition' | 'subtraction' | 'multiplication' | 'division';
}

export type RoomStatus = 'lobby' | 'countdown' | 'active' | 'ended';

export interface ExamRoom {
  id: string;
  code: string;
  password?: string;
  maxStudents: number;
  lateJoinEnabled: boolean;
  isLocked: boolean;
  status: RoomStatus;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  config: ExamConfig;
  questions: MathQuestion[];
}

export interface Participant {
  id: string;
  roomId: string;
  userId: string;
  name: string;
  isReady: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  progress: number; // percentage (0 to 100)
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> submittedAnswer
  timeSpent: number; // seconds
  disconnected: boolean;
  lastActive: string;
}

export interface AppStatistics {
  totalRooms: number;
  totalTeachers: number;
  totalStudents: number;
  totalExamsCompleted: number;
}
