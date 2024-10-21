//const URL = "https://marco-polo-websocket-server.onrender.com/" //"http://10.212.174.70:80";
const socket = io(); // Connect to the server
let roomID = null;
let geolocationInterval = null;
const SECONDS_DELAY_EMIT_GEOLOCATION = 2;

// Get HTML elements
const initializeBtn = document.getElementById('initializeBtn');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const statusElement = document.getElementById('status');
const peerGeolocationElement = document.getElementById('peer-geolocation');
const roomIDInput = document.getElementById('roomID');

// Function to request geolocation access and emit location to server
function startGeolocationEmit() {
    if (navigator.geolocation) {
        geolocationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                console.log('Emitting geolocation:', { latitude, longitude });
                socket.emit('sent-geolocation', { latitude, longitude });
            }, (error) => {
                console.error('Geolocation error:', error.message);
            });
        }, SECONDS_DELAY_EMIT_GEOLOCATION * 1000); // Emit every 5 seconds
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}

// Listen for "room-created" event and log the room ID
socket.on('room-created', (newRoomID) => {
    roomID = newRoomID;
    console.log(`Room created: ${roomID}`);
    statusElement.textContent = `Room created: ${roomID}`;
});

// Listen for "peer-connected" event and start geolocation emitting
socket.on('peers-connected', (roomID) => {
    console.log(`Peer connected in room: ${roomID}`);
    statusElement.textContent = `Peer connection established in room: ${roomID}`;

    // Start emitting geolocation every 5 seconds
    startGeolocationEmit();
});

// Listen for "got-geolocation" event from the peer
socket.on('got-geolocation', (peerLocation) => {
    console.log(`Got geolocation of peer: Latitude ${peerLocation.latitude}, Longitude ${peerLocation.longitude}`);
    peerGeolocationElement.textContent = `Latitude ${peerLocation.latitude}, Longitude ${peerLocation.longitude}`;
});

// Initialize Peer Connection button click
initializeBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {
            socket.emit('initialize-peer-connection'); // Emit event to initialize connection
        }, (error) => {
            console.error('Geolocation permission denied:', error.message);
            statusElement.textContent = 'Geolocation permission denied.';
        });
    } else {
        console.error('Geolocation not supported by this browser.');
    }
});

// Join Peer Connection button click
joinBtn.addEventListener('click', () => {
    if (roomIDInput.value != "") {
        socket.emit('join-peer-connection', roomIDInput.value); // Emit event to join connection
    } else {
        statusElement.textContent = 'Please initialize a room first or ask for the room ID.';
    }
});

leaveBtn.addEventListener('click', ()=>{
    socket.emit('leave-room');
})

// Listen for "peer-disconnected" event
socket.on('peer-disconnected', () => {
    console.log('Peer disconnected.');
    statusElement.textContent = 'Peer has disconnected.';
    
    // Clear geolocation interval when peer disconnects
    if (geolocationInterval) {
        clearInterval(geolocationInterval);
    }
});

socket.on('error', (data)=>{
    statusElement.textContent = data;
})
