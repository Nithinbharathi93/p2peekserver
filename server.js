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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);


  socket.on('join-room', ({ username, userstatus, roomid }) => {
    if (!username || !userstatus || !roomid) return;

    socket.join(roomid);
    socket.data = { username, userstatus, roomid };

    console.log(`${username} joined room: ${roomid}`);

    if (userstatus === 'admin') {
      roomAdmins[roomid] = true;
    }
  });


  socket.on('disconnect', () => {
    const { roomid, userstatus, username } = socket.data || {};
    console.log(`User disconnected: ${socket.id} (${username})`);

    if (userstatus === 'admin' && roomid) {
      roomAdmins[roomid] = false;
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
