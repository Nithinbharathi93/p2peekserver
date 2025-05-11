const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// Track which rooms have admins online
const roomAdmins = {};

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ username, userstatus, roomid }) => {
    if (!username || !userstatus || !roomid) return;

    socket.join(roomid);
    socket.data = { username, userstatus, roomid };

    console.log(`${username} joined room: ${roomid}`);

    if (userstatus === 'admin') {
      roomAdmins[roomid] = true;
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const { roomid, userstatus, username } = socket.data || {};
    console.log(`User disconnected: ${socket.id} (${username})`);

    if (userstatus === 'admin' && roomid) {
      roomAdmins[roomid] = false;
    }
  });
});

// HTTP route for sending message to a room
app.post('/send', (req, res) => {
  const { username, userstatus, roomid, Message } = req.body;

  if (!username || !userstatus || !roomid || !Message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Broadcast to users in the same room
  io.to(roomid).emit('new-message', {
    username,
    message: Message,
  });

  res.status(200).json({ status: 'Message broadcasted to room: ' + roomid });
});

// Optional route to check if admin is online in a room
app.get('/admin-status/:roomid', (req, res) => {
  const roomid = req.params.roomid;
  res.json({ adminOnline: !!roomAdmins[roomid] });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
