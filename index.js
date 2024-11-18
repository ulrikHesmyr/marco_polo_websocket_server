const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

//Host mock-client to use for logic testing together with app emulator
app.use(express.static(path.join(__dirname, "static")));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const activeRooms = {};

// Function to generate a 4-digit room ID
function generateRoomID() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Listen for new client connections
io.on("connection", (socket) => {
  // Listen for 'initialize-peer-connection'
  socket.on("initialize-peer-connection", () => {
    const currentRooms = Array.from(socket.rooms);

    if (currentRooms.length > 1) {
      leaveRoom(socket, currentRooms[1]);
    }

    let roomID = generateRoomID();

    //Avoid room duplicates
    while (activeRooms[roomID]) {
      roomID = generateRoomID();
    }

    // Add socket to the room
    socket.join(roomID);
    activeRooms[roomID] = [socket];

    // Emit room ID to the client so that he can send this roomID to his friend via SMS/tell him on the phone and such
    socket.emit("room-created", roomID);
  });

  // Listen for 'join-peer-connection'
  socket.on("join-peer-connection", (roomID) => {
    const room = io.sockets.adapter.rooms.get(roomID);

    if (room && room.size < 2) {
      // Add second socket to room
      socket.join(roomID);
      activeRooms[roomID].push(socket);

      // Emit connection established event to both peers
      io.to(roomID).emit("peers-connected", roomID);

      // Initiate peer connection logic
      peerConnection(roomID);
    } else {
      socket.emit("error", "Room is full or does not exist.");
    }
  });

  socket.on("leave-room", () => {
    if (Array.from(socket.rooms).length > 1) {
      leaveRoom(socket, Array.from(socket.rooms)[1]);
    }
  });

  // Listen for 'disconnect' event
  socket.on("disconnect", () => {
    // Find the room the socket was in and notify the other peer
    for (const roomID in activeRooms) {
      const sockets = activeRooms[roomID];
      if (sockets.includes(socket)) {
        leaveRoom(socket, roomID);
        break;
      }
    }
  });
});

function leaveRoom(socket, roomID) {
  activeRooms[roomID].splice(activeRooms[roomID].indexOf(socket), 1);
  socket.to(roomID).emit("peer-disconnected");
  socket.leave(roomID);

  // Remove room if empty
  if (activeRooms[roomID].length === 0) {
    delete activeRooms[roomID];
  }
}

// Function to handle peer communication
function peerConnection(roomID) {
  for (let socket of activeRooms[roomID]) {
    socket.on("sent-geolocation", (data) => {
      // Emit 'got-geolocation' event to the other peer
      socket.to(roomID).emit("got-geolocation", data);
    });
  }
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
