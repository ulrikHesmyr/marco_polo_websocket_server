const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}))

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(express.static("./static"));

const activeRooms = {}; // Store active rooms with sockets

// Helper function to generate a 4-digit room ID
function generateRoomID() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Listen for new client connections
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Listen for 'initialize-peer-connection'
    socket.on('initialize-peer-connection', () => {

        const currentRooms = Array.from(socket.rooms);
        console.log(currentRooms);
        if(currentRooms.length > 1){
            leaveRoom(socket, currentRooms[1]);
        }

        const roomID = generateRoomID();
        socket.join(roomID);
        console.log(Array.from(socket.rooms));
        //TODO: Add while loop to generate a new roomID if there is an already existing room with this roomID
        //For now we assume that there there will be no crashes due to low probability

        activeRooms[roomID] = [socket]; // Add socket to the room
        console.log(`Room created: ${roomID} by ${socket.id}`);

        // Emit room ID to the client so that he can send this roomID to his friend via SMS/tell him on the phone and such
        socket.emit('room-created', roomID);
    });

    // Listen for 'join-peer-connection'
    socket.on('join-peer-connection', (roomID) => {
        const room = io.sockets.adapter.rooms.get(roomID);
        
        if (room && room.size < 2) {
            socket.join(roomID);
            activeRooms[roomID].push(socket); // Add second socket to room

            console.log(`Socket ${socket.id} joined room ${roomID}`);

            // Emit connection established event to both peers
            io.to(roomID).emit('peers-connected', roomID);

            // Initiate peer connection logic
            peerConnection(roomID);
        } else {
            socket.emit('error', 'Room is full or does not exist.');
        }
    });

    socket.on('leave-room', ()=>{
        if(Array.from(socket.rooms).length > 1){
            leaveRoom(socket, Array.from(socket.rooms)[1]);
        }
    })

    // Listen for 'disconnect' event
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

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

function leaveRoom(socket, roomID){
    activeRooms[roomID].splice(activeRooms[roomID].indexOf(socket), 1);
    socket.to(roomID).emit('peer-disconnected');
    socket.leave(roomID);

    if (activeRooms[roomID].length === 0) {
        delete activeRooms[roomID]; // Remove room if empty
        console.log(`Room ${roomID} deleted`);
    }
}

// Function to handle peer communication
function peerConnection(roomID) {
    
    for(let socket of activeRooms[roomID]){
        socket.on('sent-geolocation', (data) => {
            // Emit 'got-geolocation' event to the other peer
            socket.to(roomID).emit('got-geolocation', data);
        });
    }
}

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
