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
  console.log('A user connected:', socket.id);

  socket.on('join-room', ({ username, userstatus, roomid }) => {
    socket.join(roomid);
    console.log(`${username} joined room ${roomid}`);

    if (userstatus === 'admin') {
      roomAdmins[roomid] = true;
    }

    socket.data = { username, userstatus, roomid };
  });

  socket.on('disconnect', () => {
    const { roomid, userstatus } = socket.data || {};
    if (userstatus === 'admin' && roomid) {
      roomAdmins[roomid] = false;
    }
    console.log('A user disconnected:', socket.id);
  });
});

app.post('/send', (req, res) => {
  const { username, userstatus, roomid, Message } = req.body;

  if (!username || !userstatus || !roomid || !Message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const messageData = {
    username,
    message: Message,
  };


  io.to(roomid).emit('new-message', messageData);

  res.status(200).json({ status: 'Message broadcasted' });
});

app.get('/admin-status/:roomid', (req, res) => {
  const roomid = req.params.roomid;
  const status = roomAdmins[roomid] || false;
  res.json({ adminOnline: status });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
