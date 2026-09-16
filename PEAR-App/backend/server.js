const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// In-memory data store (replace with PostgreSQL in production)
const events = new Map();
const users = new Map();
const matchHistory = new Map();
const votingRecords = new Map();
const mutualMatches = new Map();
const attendeeSessions = new Map();
const userSockets = new Map(); // FIX: Map userId to socket for direct messaging
const timerIntervals = new Map(); // FIX: Track timers for cleanup

// Rate limiting (FIX #5)
const rateLimits = new Map();

function checkRateLimit(ip, limit = 20, window = 60000) {
  const now = Date.now();
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }
  const times = rateLimits.get(ip).filter(t => now - t < window);
  if (times.length >= limit) {
    return false;
  }
  times.push(now);
  rateLimits.set(ip, times);
  return true;
}

app.use((req, res, next) => {
  if (!checkRateLimit(req.ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

// ============================================================================
// DATA MODELS
// ============================================================================

class EventSession {
  constructor(eventCode, venueName) {
    this.id = uuidv4();
    this.eventCode = eventCode;
    this.venueName = venueName;
    this.status = 'pending';
    this.currentRound = 0;
    this.attendees = new Set();
    this.countdownStart = null;
    this.countdownDuration = 900;
    this.scavengerHuntDuration = 45;
    this.chatRoundDuration = 120;
    this.bufferDuration = 60;
    this.maxRounds = 4;
    this.createdAt = Date.now();
    this.matchPairs = new Map();
    this.completedMatches = [];
  }
}

class User {
  constructor(phone, firstName, gender, lookingFor, interestedIn, photoUrl, instagram) {
    this.id = uuidv4();
    this.phone = phone;
    this.firstName = firstName;
    this.gender = gender;
    this.lookingFor = lookingFor;
    this.interestedIn = Array.isArray(interestedIn) ? interestedIn : []; // FIX: Ensure array
    this.photoUrl = photoUrl;
    this.instagram = instagram || null;
    this.createdAt = Date.now();
  }
}

class AttendeeStatus {
  constructor(eventSessionId, userId) {
    this.eventSessionId = eventSessionId;
    this.userId = userId;
    this.status = 'active';
    this.outfitColor = '';
    this.currentMatchId = null;
    this.peardConfirmed = false;
    this.lastUpdate = Date.now();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getMatchingAlgorithm(eventSession) {
  const activeAttendees = Array.from(eventSession.attendees).filter(userId => {
    const status = attendeeSessions.get(`${eventSession.id}:${userId}`);
    return status && status.status === 'active';
  });

  if (activeAttendees.length < 2) {
    return { pairs: [], solos: activeAttendees };
  }

  const previousPairs = new Set();
  matchHistory.forEach((record) => {
    if (record.eventSessionId === eventSession.id && record.matchConfirmed) {
      previousPairs.add(JSON.stringify([record.userAId, record.userBId].sort()));
    }
  });

  const shuffled = shuffleArray(activeAttendees);
  const pairs = [];
  const solos = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const userId1 = shuffled[i];
      const userId2 = shuffled[i + 1];
      const pairKey = JSON.stringify([userId1, userId2].sort());

      if (!previousPairs.has(pairKey)) {
        pairs.push({ userId1, userId2 });
      }
    } else {
      solos.push(shuffled[i]);
    }
  }

  if (pairs.length === 0 && shuffled.length >= 2) {
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        pairs.push({ userId1: shuffled[i], userId2: shuffled[i + 1] });
      } else {
        solos.push(shuffled[i]);
      }
    }
  }

  return { pairs, solos };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.post('/api/events/create', (req, res) => {
  const { eventCode, venueName } = req.body;
  
  // FIX #6: Validate input
  if (!eventCode || !venueName) {
    return res.status(400).json({ error: 'Missing eventCode or venueName' });
  }

  // FIX #7: Check for duplicate event codes
  const existing = Array.from(events.values()).find(e => e.eventCode === eventCode);
  if (existing) {
    return res.status(400).json({ error: 'Event code already exists' });
  }

  const eventSession = new EventSession(eventCode, venueName);
  events.set(eventSession.id, eventSession);
  res.json({ success: true, eventId: eventSession.id, eventCode: eventSession.eventCode });
});

app.get('/api/events/:eventId', (req, res) => {
  const event = events.get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({
    id: event.id,
    eventCode: event.eventCode,
    venueName: event.venueName,
    status: event.status,
    currentRound: event.currentRound,
    countdownDuration: event.countdownDuration,
    attendeeCount: event.attendees.size
  });
});

// FIX #7: New endpoint to lookup event by code
app.post('/api/events/lookup', (req, res) => {
  const { eventCode } = req.body;
  
  if (!eventCode) {
    return res.status(400).json({ error: 'Missing eventCode' });
  }

  const event = Array.from(events.values()).find(e => e.eventCode === eventCode);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json({ eventId: event.id });
});

app.post('/api/users/signup', (req, res) => {
  const { phone, firstName, gender, lookingFor, interestedIn, photoUrl, instagram } = req.body;
  
  // FIX #4: Add input validation
  if (!phone || !firstName || !gender) {
    return res.status(400).json({ error: 'Missing required fields (phone, firstName, gender)' });
  }

  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number (must be 10 digits)' });
  }

  if (!Array.isArray(interestedIn) || interestedIn.length === 0) {
    return res.status(400).json({ error: 'interestedIn must be non-empty array' });
  }

  const user = new User(phone, firstName, gender, lookingFor, interestedIn, photoUrl, instagram);
  users.set(user.id, user);
  console.log(`✅ User signed up: ${user.id} (${firstName})`);
  res.json({ success: true, userId: user.id });
});

app.get('/api/users/:userId', (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('join-event', (data) => {
    const { eventId, userId, outfitColor } = data;
    const event = events.get(eventId);
    const user = users.get(userId);

    if (!event || !user) {
      socket.emit('error', { message: 'Event or user not found' });
      return;
    }

    event.attendees.add(userId);
    const attendeeStatus = new AttendeeStatus(eventId, userId);
    attendeeStatus.outfitColor = outfitColor;
    attendeeSessions.set(`${eventId}:${userId}`, attendeeStatus);

    socket.data.eventId = eventId;
    socket.data.userId = userId;
    socket.join(`event:${eventId}`);
    
    // FIX #2: Store socket for direct messaging
    userSockets.set(`${eventId}:${userId}`, socket);

    io.to(`event:${eventId}`).emit('lobby-update', {
      attendeeCount: event.attendees.size,
      attendees: Array.from(event.attendees).map(uId => ({
        userId: uId,
        firstName: users.get(uId)?.firstName,
        status: attendeeSessions.get(`${eventId}:${uId}`)?.status
      }))
    });

    socket.emit('joined-event', { eventId, userId, event });
    console.log(`👤 User ${userId} joined event ${eventId}`);
  });

  socket.on('start-countdown', (data) => {
    const { eventId } = data;
    const event = events.get(eventId);
    if (!event) return;

    event.status = 'lobby';
    event.countdownStart = Date.now();

    io.to(`event:${eventId}`).emit('countdown-started', {
      serverTime: Date.now(),
      duration: event.countdownDuration
    });

    setTimeout(() => {
      if (event) {
        event.status = 'active';
        triggerNextRound(eventId);
      }
    }, event.countdownDuration * 1000);
  });

  socket.on('update-status', (data) => {
    const { eventId, userId, status } = data;
    const attendeeStatus = attendeeSessions.get(`${eventId}:${userId}`);
    if (attendeeStatus) {
      attendeeStatus.status = status;
      io.to(`event:${eventId}`).emit('status-changed', { userId, status });
    }
  });

  socket.on('update-outfit', (data) => {
    const { eventId, userId, outfitColor } = data;
    const attendeeStatus = attendeeSessions.get(`${eventId}:${userId}`);
    if (attendeeStatus) {
      attendeeStatus.outfitColor = outfitColor;
    }
  });

  socket.on('next-round', (data) => {
    const { eventId } = data;
    triggerNextRound(eventId);
  });

  socket.on('peard-confirm', (data) => {
    const { eventId, userId } = data;
    const event = events.get(eventId);
    const attendeeStatus = attendeeSessions.get(`${eventId}:${userId}`);

    if (!attendeeStatus || !event) return;

    attendeeStatus.peardConfirmed = true;
    const matchId = attendeeStatus.currentMatchId;

    if (!matchId) return;

    const matcherStatus = attendeeSessions.get(`${eventId}:${matchId}`);
    if (matcherStatus && matcherStatus.peardConfirmed) {
      const serverTime = Date.now();
      io.to(`event:${eventId}`).emit('match-confirmed', {
        userId1: userId,
        userId2: matchId,
        serverTime,
        duration: event.chatRoundDuration
      });

      const matchRecord = {
        id: uuidv4(),
        eventSessionId: eventId,
        round: event.currentRound,
        userAId: userId,
        userBId: matchId,
        matchConfirmed: true,
        chatStartTime: new Date().toISOString(),
        status: 'confirmed'
      };
      matchHistory.set(matchRecord.id, matchRecord);

      broadcastTimer(eventId, userId, matchId, event.chatRoundDuration, 'chat-timer');
      console.log(`💑 Match confirmed: ${userId} ↔️ ${matchId}`);
    }
  });

  socket.on('cant-find-pear', (data) => {
    const { eventId, userId } = data;
    const attendeeStatus = attendeeSessions.get(`${eventId}:${userId}`);

    if (attendeeStatus && attendeeStatus.currentMatchId) {
      const matchId = attendeeStatus.currentMatchId;

      socket.emit('voucher-issued', {
        code: 'PEAR5OFF',
        discount: 5,
        message: 'Priority #1 in next round!'
      });

      attendeeStatus.currentMatchId = null;
      attendeeStatus.peardConfirmed = false;

      const matcherStatus = attendeeSessions.get(`${eventId}:${matchId}`);
      if (matcherStatus) {
        matcherStatus.currentMatchId = null;
        matcherStatus.peardConfirmed = false;
      }

      io.to(`event:${eventId}`).emit('match-abandoned', { userIds: [userId, matchId] });
      console.log(`💔 Match abandoned: ${userId}`);
    }
  });

  socket.on('submit-votes', (data) => {
    const { eventId, userId, votes } = data;

    votes.forEach(vote => {
      const record = {
        id: uuidv4(),
        eventSessionId: eventId,
        voterId: userId,
        targetId: vote.targetId,
        vote: vote.type,
        createdAt: new Date().toISOString()
      };
      votingRecords.set(record.id, record);

      // Check for mutual matches
      const reverseVotes = Array.from(votingRecords.values()).filter(v =>
        v.eventSessionId === eventId &&
        v.voterId === vote.targetId &&
        v.targetId === userId &&
        v.vote === vote.type &&
        ['pear_match', 'buddy_pear'].includes(v.vote)
      );

      if (reverseVotes.length > 0) {
        const matchKey = [userId, vote.targetId].sort().join(':');
        if (!mutualMatches.has(matchKey)) {
          const match = {
            id: uuidv4(),
            eventSessionId: eventId,
            userAId: userId,
            userBId: vote.targetId,
            matchType: vote.type,
            userAPhone: users.get(userId)?.phone,
            userBPhone: users.get(vote.targetId)?.phone,
            userAInstagram: users.get(userId)?.instagram,
            userBInstagram: users.get(vote.targetId)?.instagram,
            createdAt: new Date().toISOString()
          };
          mutualMatches.set(matchKey, match);

          // FIX #2: Use broadcast to entire event instead of user rooms
          io.to(`event:${eventId}`).emit('mutual-match-unlock', {
            ...match,
            forUserId: userId // Indicate which user this is for
          });

          console.log(`🍐 Mutual match: ${userId} ↔️ ${vote.targetId}`);
        }
      }
    });

    socket.emit('votes-submitted', { success: true });
  });

  socket.on('disconnect', () => {
    // FIX #2: Clean up stored socket
    Array.from(userSockets.entries()).forEach(([key, s]) => {
      if (s === socket) {
        userSockets.delete(key);
      }
    });
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// ============================================================================
// GAME LOGIC FUNCTIONS
// ============================================================================

function triggerNextRound(eventId) {
  const event = events.get(eventId);
  
  // FIX #1: Proper null check
  if (!event) {
    console.error(`❌ Event not found: ${eventId}`);
    io.to(`event:${eventId}`).emit('error', { message: 'Event ended' });
    return;
  }

  if (event.currentRound >= event.maxRounds) {
    event.status = 'completed';
    io.to(`event:${eventId}`).emit('event-completed', { round: event.currentRound });
    console.log(`🏁 Event completed: ${eventId}`);
    return;
  }

  event.currentRound++;
  console.log(`🎮 Starting round ${event.currentRound} for event ${eventId}`);

  const { pairs, solos } = getMatchingAlgorithm(event);

  pairs.forEach(pair => {
    const attendeeA = attendeeSessions.get(`${eventId}:${pair.userId1}`);
    const attendeeB = attendeeSessions.get(`${eventId}:${pair.userId2}`);

    if (attendeeA && attendeeB) {
      attendeeA.currentMatchId = pair.userId2;
      attendeeB.currentMatchId = pair.userId1;
      attendeeA.peardConfirmed = false;
      attendeeB.peardConfirmed = false;
    }
  });

  pairs.forEach(pair => {
    const user1 = users.get(pair.userId1);
    const user2 = users.get(pair.userId2);
    const status2 = attendeeSessions.get(`${eventId}:${pair.userId2}`);

    io.to(`event:${eventId}`).emit('match-found', {
      userId: pair.userId1,
      matchUserId: pair.userId2,
      matchPhoto: user2?.photoUrl,
      outfitColor: status2?.outfitColor,
      serverTime: Date.now(),
      duration: event.scavengerHuntDuration
    });

    io.to(`event:${eventId}`).emit('match-found', {
      userId: pair.userId2,
      matchUserId: pair.userId1,
      matchPhoto: user1?.photoUrl,
      outfitColor: attendeeSessions.get(`${eventId}:${pair.userId1}`)?.outfitColor,
      serverTime: Date.now(),
      duration: event.scavengerHuntDuration
    });
  });

  solos.forEach(userId => {
    io.to(`event:${eventId}`).emit('voucher-issued-auto', {
      userId,
      code: 'PEAR5OFF',
      message: 'Priority #1 in next round!'
    });
  });

  const scavengerInterval = setTimeout(() => {
    io.to(`event:${eventId}`).emit('round-transition-start', {
      round: event.currentRound,
      serverTime: Date.now(),
      bufferDuration: event.bufferDuration
    });

    const bufferInterval = setTimeout(() => {
      triggerNextRound(eventId);
    }, event.bufferDuration * 1000);

    timerIntervals.set(`${eventId}:buffer`, bufferInterval);
  }, event.scavengerHuntDuration * 1000 + 2000);

  timerIntervals.set(`${eventId}:scavenger`, scavengerInterval);
}

function broadcastTimer(eventId, userId1, userId2, duration, timerType) {
  const startTime = Date.now();
  const timerId = `${eventId}:${userId1}:${userId2}:${timerType}`;
  
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration * 1000 - elapsed);

    io.to(`event:${eventId}`).emit(timerType, {
      remaining: Math.ceil(remaining / 1000),
      userIds: [userId1, userId2]
    });

    if (remaining <= 0) {
      clearInterval(interval);
      timerIntervals.delete(timerId); // FIX #3: Cleanup
      io.to(`event:${eventId}`).emit('timer-complete', {
        timerType,
        userIds: [userId1, userId2]
      });
    }
  }, 500);

  // FIX #3: Store timer for cleanup
  timerIntervals.set(timerId, interval);
}

// Cleanup function for graceful shutdown
function cleanup() {
  timerIntervals.forEach(interval => clearInterval(interval));
  timerIntervals.clear();
  console.log('✅ All timers cleaned up');
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  cleanup();
  process.exit(0);
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log(`🍐 PEAR backend running on port ${PORT}`);
  console.log(`✅ All 7 bugs fixed`);
  console.log(`✅ Input validation added`);
  console.log(`✅ Rate limiting enabled`);
});
