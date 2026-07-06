import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, ExamRoom, Participant, ExamConfig, MathQuestion, AppStatistics } from '../types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we have real Supabase variables configured
export const isRealSupabaseConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

// Keep local in-memory storage for mock sessions
const LOCAL_SESSION_KEY = 'math_exam_session';
const LOCAL_USER_KEY = 'math_exam_user';

// Native WebSockets server URL helper (port 3000)
function getWSUrl(): string {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use current host which proxies port 3000 internally
  return `${protocol}//${loc.host}/ws`;
}

// REST API URL helper
function getAPIUrl(path: string): string {
  return `${window.location.protocol}//${window.location.host}${path}`;
}

// Native Supabase Client (if variables exist)
let supabase: SupabaseClient | null = null;
if (isRealSupabaseConfigured) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Interface for db operations
export const db = {
  auth: {
    async signUp(email: string, password: string, name: string, role: 'teacher' | 'student' | 'admin'): Promise<UserProfile> {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role }
          }
        });
        if (error) throw error;
        if (!data.user) throw new Error('Sign up failed');

        return {
          id: data.user.id,
          email: data.user.email || email,
          name,
          role,
          createdAt: new Date().toISOString()
        };
      } else {
        // Fallback to Express backend Auth
        const response = await fetch(getAPIUrl('/api/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Sign up failed');

        localStorage.setItem(LOCAL_SESSION_KEY, data.token);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    },

    async signIn(email: string, password: string): Promise<UserProfile> {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (!data.user) throw new Error('Sign in failed');

        // Fetch user profile
        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (pError || !profile) {
          // fallback if trigger is slow
          return {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || 'User',
            role: data.user.user_metadata?.role || 'student',
            createdAt: new Date().toISOString()
          };
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          createdAt: profile.created_at
        };
      } else {
        const response = await fetch(getAPIUrl('/api/auth/signin'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Sign in failed');

        localStorage.setItem(LOCAL_SESSION_KEY, data.token);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
    },

    async signOut(): Promise<void> {
      if (isRealSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        localStorage.removeItem(LOCAL_USER_KEY);
      }
    },

    async getCurrentUser(): Promise<UserProfile | null> {
      if (isRealSupabaseConfigured && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            createdAt: profile.created_at
          };
        }
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 'User',
          role: user.user_metadata?.role || 'student',
          createdAt: new Date().toISOString()
        };
      } else {
        const userJson = localStorage.getItem(LOCAL_USER_KEY);
        if (!userJson) return null;

        // Optionally verify token with API
        try {
          const token = localStorage.getItem(LOCAL_SESSION_KEY);
          const response = await fetch(getAPIUrl('/api/auth/profile'), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data.user));
            return data.user;
          } else {
            localStorage.removeItem(LOCAL_SESSION_KEY);
            localStorage.removeItem(LOCAL_USER_KEY);
            return null;
          }
        } catch (e) {
          return JSON.parse(userJson);
        }
      }
    }
  },

  rooms: {
    async create(
      config: ExamConfig,
      teacherId: string,
      teacherName: string,
      password?: string,
      maxStudents: number = 50,
      lateJoinEnabled: boolean = true
    ): Promise<ExamRoom> {
      // Generate unique 6-digit room code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Dynamically import math question generator
      const { generateQuestions } = await import('./mathGenerator');
      const questions = generateQuestions(config);

      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('rooms')
          .insert({
            code,
            password: password || null,
            max_students: maxStudents,
            late_join_enabled: lateJoinEnabled,
            is_locked: false,
            status: 'lobby',
            teacher_id: teacherId,
            config,
            questions
          })
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          code: data.code,
          password: data.password || undefined,
          maxStudents: data.max_students,
          lateJoinEnabled: data.late_join_enabled,
          isLocked: data.is_locked,
          status: data.status,
          teacherId: data.teacher_id,
          teacherName,
          createdAt: data.created_at,
          config: data.config,
          questions: data.questions
        };
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        const response = await fetch(getAPIUrl('/api/rooms'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            code,
            password,
            maxStudents,
            lateJoinEnabled,
            config,
            questions,
            teacherName
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create room');
        return data.room;
      }
    },

    async getByCode(code: string): Promise<ExamRoom | null> {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Fetch teacher's name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.teacher_id)
          .single();

        return {
          id: data.id,
          code: data.code,
          password: data.password || undefined,
          maxStudents: data.max_students,
          lateJoinEnabled: data.late_join_enabled,
          isLocked: data.is_locked,
          status: data.status,
          teacherId: data.teacher_id,
          teacherName: profile?.name || 'Teacher',
          createdAt: data.created_at,
          config: data.config,
          questions: data.questions
        };
      } else {
        const response = await fetch(getAPIUrl(`/api/rooms/${code}`));
        if (response.status === 404) return null;
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch room');
        return data.room;
      }
    },

    async getTeacherRooms(teacherId: string): Promise<ExamRoom[]> {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(r => ({
          id: r.id,
          code: r.code,
          password: r.password || undefined,
          maxStudents: r.max_students,
          lateJoinEnabled: r.late_join_enabled,
          isLocked: r.is_locked,
          status: r.status,
          teacherId: r.teacher_id,
          teacherName: '', // can be filled as needed
          createdAt: r.created_at,
          config: r.config,
          questions: r.questions
        }));
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        const response = await fetch(getAPIUrl(`/api/rooms/teacher/${teacherId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch teacher rooms');
        return data.rooms;
      }
    }
  },

  admin: {
    async getStatistics(): Promise<AppStatistics> {
      if (isRealSupabaseConfigured && supabase) {
        const { count: roomsCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
        const { count: teachersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
        const { count: studentsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: participantsCount } = await supabase.from('participants').select('*', { count: 'exact', head: true });

        return {
          totalRooms: roomsCount || 0,
          totalTeachers: teachersCount || 0,
          totalStudents: studentsCount || 0,
          totalExamsCompleted: participantsCount || 0
        };
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        const response = await fetch(getAPIUrl('/api/admin/statistics'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch statistics');
        return data.stats;
      }
    },

    async getAllUsers(): Promise<UserProfile[]> {
      if (isRealSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          createdAt: p.created_at
        }));
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        const response = await fetch(getAPIUrl('/api/admin/users'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return data.users || [];
      }
    },

    async banUser(email: string): Promise<void> {
      if (isRealSupabaseConfigured && supabase) {
        // In real Supabase, would delete user or update auth configuration
        // For demonstration, we delete their profile row
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('email', email);
        if (error) throw error;
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        const response = await fetch(getAPIUrl('/api/admin/users/ban'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email })
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to ban user');
        }
      }
    },

    async deleteRoom(id: string): Promise<void> {
      if (isRealSupabaseConfigured && supabase) {
        const { error } = await supabase.from('rooms').delete().eq('id', id);
        if (error) throw error;
      } else {
        const token = localStorage.getItem(LOCAL_SESSION_KEY);
        await fetch(getAPIUrl(`/api/admin/rooms/${id}`), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
  }
};

// ============================================================================
// REAL-TIME SYNC MANAGER (WebSockets connection / SSE fallback)
// ============================================================================

export interface RoomConnection {
  sendAction: (action: string, payload: any) => void;
  disconnect: () => void;
}

export function subscribeToRoom(
  roomCode: string,
  userId: string,
  userName: string,
  onUpdate: (data: { room: ExamRoom; participants: Participant[] }) => void,
  onKicked?: () => void
): RoomConnection {
  if (isRealSupabaseConfigured && supabase) {
    // A simplified Realtime synchronization model for Supabase:
    // It creates a database subscription to the rooms and participants tables.
    let activeParticipants: Participant[] = [];
    let activeRoom: ExamRoom | null = null;

    const fetchAll = async () => {
      // Fetch Room
      const { data: rData } = await supabase!
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();
      
      if (!rData) return;

      const { data: pTeacher } = await supabase!
        .from('profiles')
        .select('name')
        .eq('id', rData.teacher_id)
        .single();

      activeRoom = {
        id: rData.id,
        code: rData.code,
        password: rData.password || undefined,
        maxStudents: rData.max_students,
        lateJoinEnabled: rData.late_join_enabled,
        isLocked: rData.is_locked,
        status: rData.status,
        teacherId: rData.teacher_id,
        teacherName: pTeacher?.name || 'Teacher',
        createdAt: rData.created_at,
        config: rData.config,
        questions: rData.questions
      };

      // Fetch Participants
      const { data: pData } = await supabase!
        .from('participants')
        .select('*')
        .eq('room_id', rData.id);
console.log("Participants:", activeParticipants);
      activeParticipants = (pData || []).map(p => ({
        id: p.id,
        roomId: p.room_id,
        userId: p.user_id,
        name: p.name,
        isReady: p.is_ready,
        score: p.score,
        correctAnswers: p.correct_answers,
        wrongAnswers: p.wrong_answers,
        progress: Number(p.progress),
        currentQuestionIndex: p.current_question_index,
        answers: p.answers,
        timeSpent: p.time_spent,
        disconnected: p.disconnected,
        lastActive: p.last_active
      }));

      onUpdate({ room: activeRoom, participants: activeParticipants });
   console.log("onUpdate fired");
    };

    // Initial load
    // fetchAll();
const init = async () => {
  await joinAsStudent();
  await fetchAll();
};

init();
    // Set up database listeners for Realtime changes
    const roomChannel = supabase.channel(`room_sync_${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, () => {
        fetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, (payload) => {
        // Re-fetch everything to maintain complete integrity
        fetchAll();
        
        // Handle kick detection
        if (payload.eventType === 'DELETE') {
          const oldRecord = payload.old;
          // If our participant record was deleted, we were kicked!
          const currentParticipant = activeParticipants.find(p => p.userId === userId);
          if (currentParticipant && oldRecord && oldRecord.id === currentParticipant.id) {
            if (onKicked) onKicked();
          }
        }
      })
      .subscribe();

    // Handle joining room as student immediately on connect
    const joinAsStudent = async () => {
      const { data: rData } = await supabase!
        .from('rooms')
        .select('id, teacher_id')
        .eq('code', roomCode)
        .single();

      if (rData && userId !== rData.teacher_id) {
        // Upsert participant
        await supabase!
          .from('participants')
          .upsert({
            room_id: rData.id,
            user_id: userId,
            name: userName,
            is_ready: false
          }, { onConflict: 'room_id,user_id' });
      }
    };
    // joinAsStudent();

    // Implement actions via standard DB updates
    const sendAction = async (action: string, payload: any) => {
      if (!activeRoom) return;
      if (action === 'ready') {
        await supabase!
          .from('participants')
          .update({ is_ready: payload.isReady })
          .eq('room_id', activeRoom.id)
          .eq('user_id', userId);
      } else if (action === 'start_countdown') {
        await supabase!
          .from('rooms')
          .update({ status: 'countdown' })
          .eq('id', activeRoom.id);
      } else if (action === 'start_exam') {
        await supabase!
          .from('rooms')
          .update({ status: 'active' })
          .eq('id', activeRoom.id);
      } else if (action === 'end_exam') {
        await supabase!
          .from('rooms')
          .update({ status: 'ended' })
          .eq('id', activeRoom.id);
      } else if (action === 'lock_room') {
        await supabase!
          .from('rooms')
          .update({ is_locked: payload.isLocked })
          .eq('id', activeRoom.id);
      } else if (action === 'kick_student') {
        await supabase!
          .from('participants')
          .delete()
          .eq('room_id', activeRoom.id)
          .eq('user_id', payload.studentUserId);
      } else if (action === 'submit_answer') {
        const participant = activeParticipants.find(p => p.userId === userId);
        if (participant) {
          const updatedAnswers = { ...participant.answers, [payload.questionId]: payload.answer };
          await supabase!
            .from('participants')
            .update({
              answers: updatedAnswers,
              score: payload.score,
              correct_answers: payload.correctAnswers,
              wrong_answers: payload.wrongAnswers,
              progress: payload.progress,
              current_question_index: payload.currentQuestionIndex,
              time_spent: payload.timeSpent
            })
            .eq('id', participant.id);
        }
      } else if (action === 'update_progress') {
        const participant = activeParticipants.find(p => p.userId === userId);
        if (participant) {
          await supabase!
            .from('participants')
            .update({
              progress: payload.progress,
              current_question_index: payload.currentQuestionIndex,
              time_spent: payload.timeSpent
            })
            .eq('id', participant.id);
        }
      }
    };

    return {
      sendAction,
      disconnect: () => {
        roomChannel.unsubscribe();
      }
    };
  } else {
    // WebSocket mock realtime connection to our Express Backend
    const wsUrl = getWSUrl();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Join Room Lobby
      ws.send(JSON.stringify({
        type: 'join',
        payload: { code: roomCode, userId, name: userName }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'state_update') {
          onUpdate(message.payload);
        } else if (message.type === 'kicked') {
          if (onKicked) onKicked();
          ws.close();
        }
      } catch (err) {
        console.error('WS parsing error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WS Connection closed');
    };

    ws.onerror = (err) => {
      console.error('WS socket error:', err);
    };

    const sendAction = (action: string, payload: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'action',
          payload: { action, ...payload }
        }));
      }
    };

    return {
      sendAction,
      disconnect: () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
    };
  }
}
