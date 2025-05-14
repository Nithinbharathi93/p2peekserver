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

const roomAdmins = {};
const activeRooms = {};
const roomUsers = {}; // ✅ Tracks usernames per room

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ username, userstatus, roomid }) => {
    if (!username || !userstatus || !roomid) return;

    const roomExists = activeRooms[roomid] === true;

    // ✅ Check if username already exists in the room
    if (roomUsers[roomid]?.has(username)) {
      socket.emit('room-error', 'Username already exists in this room');
      return;
    }

    if (userstatus === 'admin') {
      if (roomExists) {
        socket.emit('room-error', 'Room ID already exists');
        return;
      }

      activeRooms[roomid] = true;
      roomAdmins[roomid] = true;
      roomUsers[roomid] = new Set(); // ✅ initialize user list for new room
      console.log(`Admin ${username} created and joined room: ${roomid}`);
    } else {
      if (!roomExists) {
        socket.emit('room-error', 'Room ID does not exist');
        return;
      }

      if (!roomUsers[roomid]) {
        roomUsers[roomid] = new Set(); // Just in case
      }

      console.log(`Client ${username} joined room: ${roomid}`);
    }

    socket.join(roomid);
    socket.data = { username, userstatus, roomid };
    roomUsers[roomid].add(username); // ✅ Add to the user set

    io.to(roomid).emit('system-message', `${username} has joined the room.`);
  });

  socket.on('disconnect', () => {
    const { roomid, userstatus, username } = socket.data || {};
    console.log(`User disconnected: ${socket.id} (${username})`);

    if (roomid && roomUsers[roomid]) {
      roomUsers[roomid].delete(username); // ✅ Remove user on disconnect
    }

    if (userstatus === 'admin' && roomid) {
      roomAdmins[roomid] = false;
      activeRooms[roomid] = false;

      io.to(roomid).emit('system-message', `Admin ${username} has left. Room is now inactive.`);
    }
  });
});


app.post('/send', (req, res) => {
  const { username, userstatus, roomid, Message } = req.body;

  if (!username || !userstatus || !roomid || !Message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }


  io.to(roomid).emit('new-message', {
    username,
    message: Message,
  });
  console.log(`A message from ${username}`);
  res.status(200).json({ status: 'Message broadcasted to room: ' + roomid });
});

app.get('/admin-status/:roomid', (req, res) => {
  const roomid = req.params.roomid;
  res.json({ adminOnline: !!roomAdmins[roomid] });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
