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

  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);

    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: [],
        status: 'waiting', // waiting, playing, round_end
        currentWord: '',
        currentDrawer: null,
        roundEndTime: 0,
        roundTime: 60 * 1000, // 60 seconds
      };
    }

    // Add player
    const player = {
      id: socket.id,
      username,
      score: 0,
      hasGuessed: false
    };
    rooms[roomId].players.push(player);

    console.log(`${username} (${socket.id}) joined room: ${roomId}`);

    // Broadcast updated state
    io.in(roomId).emit('room_state_update', rooms[roomId]);
    io.in(roomId).emit('chat_message', { system: true, message: `${username} joined the room.` });
  });

  socket.on('start_game', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    startNextRound(roomId);
  });

  // Handle incoming drawing batches
  socket.on('draw_batch', (data) => {
    const room = rooms[data.roomId];
    if (room && room.currentDrawer === socket.id && room.status === 'playing') {
      socket.to(data.roomId).emit('draw_batch', data.paths);
    }
  });

  socket.on('clear_canvas', (roomId) => {
    const room = rooms[roomId];
    if (room && room.currentDrawer === socket.id) {
      socket.to(roomId).emit('clear_canvas');
    }
  });

  socket.on('undo_action', (data) => {
    const room = rooms[data.roomId];
    if (room && room.currentDrawer === socket.id) {
      socket.to(data.roomId).emit('undo_action', data);
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
          endRound(data.roomId);
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
            endRound(roomId);
          } else {
            io.in(roomId).emit('room_state_update', room);
          }
        }
      }
    }
  });
});

function startNextRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.status = 'playing';
  room.players.forEach(p => p.hasGuessed = false);

  // Pick a random drawer logic (simple version: rotate)
  // For now, let's just pick the first person who hasn't drawn recently, or random.
  const eligibleDrawers = room.players;
  room.currentDrawer = eligibleDrawers[Math.floor(Math.random() * eligibleDrawers.length)].id;

  room.currentWord = wordList[Math.floor(Math.random() * wordList.length)];
  room.roundEndTime = Date.now() + room.roundTime;

  io.in(roomId).emit('room_state_update', room);
  io.in(roomId).emit('clear_canvas');
  io.in(roomId).emit('chat_message', { system: true, message: `A new round has started!` });

  // Inform the drawer of the word
  io.to(room.currentDrawer).emit('you_are_drawer', { word: room.currentWord });

  // Auto-end round timeout
  setTimeout(() => {
    if (rooms[roomId] && rooms[roomId].status === 'playing' && rooms[roomId].currentWord === room.currentWord) {
      endRound(roomId);
    }
  }, room.roundTime);
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.status = 'round_end';
  io.in(roomId).emit('chat_message', { system: true, message: `Round over! The word was: ${room.currentWord}` });
  io.in(roomId).emit('room_state_update', room);

  // Wait a few seconds, then start next round
  setTimeout(() => {
    if (rooms[roomId] && rooms[roomId].players.length > 1) {
      startNextRound(roomId);
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
