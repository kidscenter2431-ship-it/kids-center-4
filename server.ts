import express from 'express';
import path from 'path';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { ExamRoom, Participant, UserProfile, ExamConfig, MathQuestion } from './src/types';

const PORT = 3000;

// In-memory Database for high-fidelity fallback in Preview
const users: UserProfile[] = [
  {
    id: 'admin-id-123',
    email: 'admin@mathquest.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'teacher-newton',
    email: 'teacher@mathquest.com',
    name: 'Professor Newton',
    role: 'teacher',
    createdAt: new Date().toISOString()
  }
];

const passwords = new Map<string, string>([
  ['admin@mathquest.com', 'admin123'],
  ['teacher@mathquest.com', 'teacher123']
]);

const rooms = new Map<string, ExamRoom>();
const roomParticipants = new Map<string, Participant[]>(); // roomId -> Participant[]

// Track active WebSocket connections
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  roomCode: string;
}
const activeClients = new Set<ConnectedClient>();

// Helper: Broadcast room state to all clients in that room
function broadcastRoomState(roomCode: string) {
  const room = Array.from(rooms.values()).find(r => r.code === roomCode);
  if (!room) return;

  const participants = roomParticipants.get(room.id) || [];

  const payload = {
    room,
    participants
  };

  const message = JSON.stringify({
    type: 'state_update',
    payload
  });

  for (const client of activeClients) {
    if (client.roomCode === roomCode && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // Set up WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    let clientInfo: ConnectedClient | null = null;

    ws.on('message', (messageStr: string) => {
      try {
        const message = JSON.parse(messageStr);

        if (message.type === 'join') {
          const { code, userId, name } = message.payload;
          const room = Array.from(rooms.values()).find(r => r.code === code);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Room not found' }));
            return;
          }

          // RLS or join validation: check lock or max students
          const participants = roomParticipants.get(room.id) || [];
          const existingParticipant = participants.find(p => p.userId === userId);

          if (!existingParticipant) {
            if (room.isLocked) {
              ws.send(JSON.stringify({ type: 'error', payload: 'Room is locked' }));
              return;
            }
            if (room.status !== 'lobby' && !room.lateJoinEnabled) {
              ws.send(JSON.stringify({ type: 'error', payload: 'Late joining is disabled for this exam' }));
              return;
            }
            if (participants.length >= room.maxStudents) {
              ws.send(JSON.stringify({ type: 'error', payload: 'Room is full' }));
              return;
            }

            // Create new participant if student (not the teacher)
            if (userId !== room.teacherId) {
              const newParticipant: Participant = {
                id: `part_${Math.random().toString(36).substring(2, 9)}`,
                roomId: room.id,
                userId,
                name: name || 'Student',
                isReady: false,
                score: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                progress: 0,
                currentQuestionIndex: 0,
                answers: {},
                timeSpent: 0,
                disconnected: false,
                lastActive: new Date().toISOString()
              };
              participants.push(newParticipant);
              roomParticipants.set(room.id, participants);
            }
          } else {
            // Reconnect
            existingParticipant.disconnected = false;
            existingParticipant.lastActive = new Date().toISOString();
          }

          // Save connection info
          clientInfo = { ws, userId, roomCode: code };
          activeClients.add(clientInfo);

          // Broadcast updated state
          broadcastRoomState(code);

        } else if (message.type === 'action' && clientInfo) {
          const { action, ...payload } = message.payload;
          const { roomCode, userId } = clientInfo;
          const room = Array.from(rooms.values()).find(r => r.code === roomCode);

          if (!room) return;

          const participants = roomParticipants.get(room.id) || [];

          if (action === 'ready') {
            const part = participants.find(p => p.userId === userId);
            if (part) {
              part.isReady = payload.isReady;
            }
          } else if (action === 'start_countdown') {
            if (userId === room.teacherId) {
              room.status = 'countdown';
              // Simulate countdown tick server-side if needed, but client-side timer is usually smoother
              // We'll update the status, clients will trigger their local countdown
            }
          } else if (action === 'start_exam') {
            if (userId === room.teacherId) {
              room.status = 'active';
            }
          } else if (action === 'end_exam') {
            if (userId === room.teacherId) {
              room.status = 'ended';
            }
          } else if (action === 'lock_room') {
            if (userId === room.teacherId) {
              room.isLocked = payload.isLocked;
            }
          } else if (action === 'kick_student') {
            if (userId === room.teacherId) {
              // Find participant
              const targetIdx = participants.findIndex(p => p.userId === payload.studentUserId);
              if (targetIdx !== -1) {
                const targetPart = participants[targetIdx];
                // Remove participant row
                participants.splice(targetIdx, 1);
                roomParticipants.set(room.id, participants);

                // Notify kicked client
                for (const client of activeClients) {
                  if (client.userId === payload.studentUserId && client.roomCode === roomCode) {
                    client.ws.send(JSON.stringify({ type: 'kicked' }));
                    client.ws.close();
                    activeClients.delete(client);
                    break;
                  }
                }
              }
            }
          } else if (action === 'submit_answer') {
            const part = participants.find(p => p.userId === userId);
            if (part) {
              part.answers[payload.questionId] = payload.answer;
              part.score = payload.score;
              part.correctAnswers = payload.correctAnswers;
              part.wrongAnswers = payload.wrongAnswers;
              part.progress = payload.progress;
              part.currentQuestionIndex = payload.currentQuestionIndex;
              part.timeSpent = payload.timeSpent;
              part.lastActive = new Date().toISOString();
            }
          } else if (action === 'update_progress') {
            const part = participants.find(p => p.userId === userId);
            if (part) {
              part.progress = payload.progress;
              part.currentQuestionIndex = payload.currentQuestionIndex;
              part.timeSpent = payload.timeSpent;
              part.lastActive = new Date().toISOString();
            }
          }

          broadcastRoomState(roomCode);
        }
      } catch (err) {
        console.error('WS Error handling message:', err);
      }
    });

    ws.on('close', () => {
      if (clientInfo) {
        activeClients.delete(clientInfo);

        // Mark student as disconnected but preserve records for reconnection
        const room = Array.from(rooms.values()).find(r => r.code === clientInfo!.roomCode);
        if (room) {
          const participants = roomParticipants.get(room.id) || [];
          const part = participants.find(p => p.userId === clientInfo!.userId);
          if (part) {
            part.disconnected = true;
            part.lastActive = new Date().toISOString();
          }
          broadcastRoomState(clientInfo.roomCode);
        }
      }
    });
  });

  // ============================================================================
  // REST API ROUTING
  // ============================================================================

  // Auth: SignUp
  app.post('/api/auth/signup', (req, res) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser: UserProfile = {
      id: `user_${Math.random().toString(36).substring(2, 9)}`,
      email,
      name,
      role: role || 'student',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    passwords.set(email.toLowerCase(), password);

    res.json({
      token: `mock_token_${newUser.id}`,
      user: newUser
    });
  });

  // Auth: SignIn
  app.post('/api/auth/signin', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || passwords.get(email.toLowerCase()) !== password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: `mock_token_${user.id}`,
      user
    });
  });

  // Auth: Profile
  app.get('/api/auth/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const userId = token.replace('mock_token_', '');
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(401).json({ message: 'User session expired' });
    }

    res.json({ user });
  });

  // Create Room
  app.post('/api/rooms', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

    const { code, password, maxStudents, lateJoinEnabled, config, questions, teacherName } = req.body;

    const token = authHeader.split(' ')[1];
    const teacherId = token.replace('mock_token_', '');

    const newRoom: ExamRoom = {
      id: `room_${Math.random().toString(36).substring(2, 9)}`,
      code,
      password: password || undefined,
      maxStudents: maxStudents || 50,
      lateJoinEnabled: lateJoinEnabled !== false,
      isLocked: false,
      status: 'lobby',
      teacherId,
      teacherName,
      createdAt: new Date().toISOString(),
      config,
      questions
    };

    rooms.set(newRoom.id, newRoom);
    roomParticipants.set(newRoom.id, []);

    res.json({ room: newRoom });
  });

  // Get Room by Code
  app.get('/api/rooms/:code', (req, res) => {
    const { code } = req.params;
    const room = Array.from(rooms.values()).find(r => r.code === code);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ room });
  });

  // Get Teacher Rooms
  app.get('/api/rooms/teacher/:teacherId', (req, res) => {
    const { teacherId } = req.params;
    const teacherRooms = Array.from(rooms.values())
      .filter(r => r.teacherId === teacherId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ rooms: teacherRooms });
  });

  // Admin: Get Statistics
  app.get('/api/admin/statistics', (req, res) => {
    const totalRooms = rooms.size;
    const totalTeachers = users.filter(u => u.role === 'teacher').length;
    const totalStudents = users.filter(u => u.role === 'student').length;

    let totalExamsCompleted = 0;
    for (const parts of roomParticipants.values()) {
      totalExamsCompleted += parts.filter(p => p.progress >= 100).length;
    }

    res.json({
      stats: {
        totalRooms,
        totalTeachers,
        totalStudents,
        totalExamsCompleted
      }
    });
  });

  // Admin: Get Users
  app.get('/api/admin/users', (req, res) => {
    res.json({ users });
  });

  // Admin: Ban User
  app.post('/api/admin/users/ban', (req, res) => {
    const { email } = req.body;
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) {
      const user = users[idx];
      users.splice(idx, 1);
      passwords.delete(email.toLowerCase());

      // Disconnect user if active in any room
      for (const client of activeClients) {
        if (client.userId === user.id) {
          client.ws.send(JSON.stringify({ type: 'kicked' }));
          client.ws.close();
          activeClients.delete(client);
        }
      }
      return res.json({ success: true });
    }
    res.status(404).json({ message: 'User not found' });
  });

  // Admin: Delete Room
  app.delete('/api/admin/rooms/:id', (req, res) => {
    const { id } = req.params;
    const room = rooms.get(id);
    if (room) {
      rooms.delete(id);
      roomParticipants.delete(id);

      // Disconnect all clients in this room
      for (const client of activeClients) {
        if (client.roomCode === room.code) {
          client.ws.send(JSON.stringify({ type: 'kicked' }));
          client.ws.close();
          activeClients.delete(client);
        }
      }
      return res.json({ success: true });
    }
    res.status(404).json({ message: 'Room not found' });
  });

  // ============================================================================
  // FRONTEND INTEGRATION & MIDDLEWARE
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
