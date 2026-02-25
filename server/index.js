const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

// Basic vocabulary for testing
const wordList = ['apple', 'computer', 'house', 'dog', 'airplane', 'guitar', 'ocean', 'mountain', 'car', 'tree'];

// Store room state
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, username, avatar, action }) => {
    // If they are trying to join but it doesn't exist, reject them
    if (action === 'join' && !rooms[roomId]) {
      socket.emit('room_error', { message: `Room ${roomId} does not exist.` });
      return;
    }

    socket.join(roomId);

    // Initialize room if it doesn't exist (only allows 'create' action to do this)
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: [],
        status: 'waiting', // waiting, playing, round_end
        currentWord: '',
        currentDrawer: null,
        roundEndTime: 0,
        roundTime: 60 * 1000, // 60 seconds
        currentRoundId: 0, // Track specific round instances for timeouts
        currentRound: 0,
        totalRounds: 3,
        drawerQueue: []
      };
    }

    // Add player
    const player = {
      id: socket.id,
      username,
      avatar: avatar || '🤖', // default fallback just in case
      score: 0,
      hasGuessed: false
    };
    rooms[roomId].players.push(player);

    console.log(`${username} (${socket.id}) joined room: ${roomId}`);

    // Broadcast updated state
    io.in(roomId).emit('room_state_update', rooms[roomId]);
    io.in(roomId).emit('chat_message', { system: true, message: `${username} joined the room.` });
  });

  socket.on('start_game', ({ roomId, totalRounds }) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    // Reset scores for a new game
    room.players.forEach(p => p.score = 0);
    room.currentRound = 1;
    room.totalRounds = totalRounds || 3;
    room.drawerQueue = [...room.players.map(p => p.id)]; // Everyone gets a turn this round

    startNextTurn(roomId);
  });

  // Handle incoming drawing batches
  socket.on('draw_batch', (data) => {
    const room = rooms[data.roomId];
    if (room && ((room.status === 'playing' && room.currentDrawer === socket.id) || room.status === 'waiting')) {
      socket.to(data.roomId).emit('draw_batch', data.paths);
    }
  });

  socket.on('clear_canvas', (roomId) => {
    const room = rooms[roomId];
    if (room && ((room.status === 'playing' && room.currentDrawer === socket.id) || room.status === 'waiting')) {
      socket.to(roomId).emit('clear_canvas');
    }
  });

  socket.on('undo_action', (data) => {
    const room = rooms[data.roomId];
    if (room && ((room.status === 'playing' && room.currentDrawer === socket.id) || room.status === 'waiting')) {
      socket.to(data.roomId).emit('undo_action', data);
    }
  });

  // Handle live reactions
  socket.on('reaction', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(data.roomId).emit('reaction', { emoji: data.emoji, senderId: socket.id });
    }
  });

  // Chat message & Guess logic
  socket.on('chat_message', (data) => {
    const room = rooms[data.roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if playing and player hasn't guessed yet and is not drawer
    if (room.status === 'playing' && room.currentDrawer !== socket.id && !player.hasGuessed) {
      if (data.message.toLowerCase().trim() === room.currentWord.toLowerCase()) {
        player.hasGuessed = true;

        // Calculate score based on time left
        const timeLeft = Math.max(0, room.roundEndTime - Date.now());
        const points = Math.floor((timeLeft / room.roundTime) * 100) + 10;
        player.score += points;

        // Drawer gets points too
        const drawer = room.players.find(p => p.id === room.currentDrawer);
        if (drawer) drawer.score += 20;

        io.in(data.roomId).emit('chat_message', { system: true, message: `${player.username} guessed the word!` });
        io.in(data.roomId).emit('room_state_update', room);

        // Check if everyone guessed
        const allGuessed = room.players.every(p => p.hasGuessed || p.id === room.currentDrawer);
        if (allGuessed) {
          endTurn(data.roomId);
        }
        return;
      }
    }

    // Normal chat broadcast
    io.in(data.roomId).emit('chat_message', { username: player.username, message: data.message });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove player from any rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        io.in(roomId).emit('chat_message', { system: true, message: `${player.username} left the room.` });

        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          // If drawer left, end round
          if (room.currentDrawer === socket.id && room.status === 'playing') {
            endTurn(roomId);
          } else {
            io.in(roomId).emit('room_state_update', room);
          }
        }
      }
    }
  });
});

function startNextTurn(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  // Check if we need to start a new round
  if (room.drawerQueue.length === 0) {
    room.currentRound++;
    if (room.currentRound > room.totalRounds) {
      // Game Over!
      room.status = 'waiting';
      room.currentWord = '';
      room.currentDrawer = null;
      io.in(roomId).emit('chat_message', { system: true, message: `Game Over! The final scores are in.` });
      io.in(roomId).emit('room_state_update', room);
      return;
    }
    // Refill the queue
    room.drawerQueue = [...room.players.map(p => p.id)];
  }

  room.status = 'playing';
  room.players.forEach(p => p.hasGuessed = false);

  // Pop next drawer
  room.currentDrawer = room.drawerQueue.shift();

  // If the drawer left the game, skip to next turn
  if (!room.players.find(p => p.id === room.currentDrawer)) {
    startNextTurn(roomId);
    return;
  }

  room.currentWord = wordList[Math.floor(Math.random() * wordList.length)];
  room.roundEndTime = Date.now() + room.roundTime;
  room.currentRoundId += 1; // Increment timeout ID
  const thisRoundId = room.currentRoundId;

  io.in(roomId).emit('room_state_update', room);
  io.in(roomId).emit('clear_canvas');
  io.in(roomId).emit('chat_message', { system: true, message: `Round ${room.currentRound} of ${room.totalRounds}! It brings up ${room.players.find(p => p.id === room.currentDrawer)?.username || 'someone'} to draw.` });

  // Inform the drawer of the word
  io.to(room.currentDrawer).emit('you_are_drawer', { word: room.currentWord });

  // Auto-end round timeout
  setTimeout(() => {
    // Only end the turn if this specific turn is still active
    if (rooms[roomId] && rooms[roomId].status === 'playing' && rooms[roomId].currentRoundId === thisRoundId) {
      endTurn(roomId);
    }
  }, room.roundTime);
}

function endTurn(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.status = 'round_end';
  io.in(roomId).emit('chat_message', { system: true, message: `Time's up! The word was: ${room.currentWord}` });
  io.in(roomId).emit('room_state_update', room);

  // Wait a few seconds, then start next turn backwards
  setTimeout(() => {
    if (rooms[roomId] && rooms[roomId].players.length > 1) {
      startNextTurn(roomId);
    } else if (rooms[roomId]) {
      rooms[roomId].status = 'waiting';
      io.in(roomId).emit('room_state_update', rooms[roomId]);
    }
  }, 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DoodleDash server running on port ${PORT}`);
});
