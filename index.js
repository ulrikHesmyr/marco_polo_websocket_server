

//Initialize a socket server


//Listen for connection



//Listen for "initialize-peer-connection" 
    //Generate a 4-digit code
    //Create a room for this 4 digit code
    //Add socket to the current room 
    //Emit a message with the 4-digit room-ID

//Listen for "join-peer-connection"
    //Take 4-digit room-ID  and check if there is a room
    //Check how many sockets is within this room
    //If less than 2, let the socket join that room
    //Emit to the room that the connection is established
    //Call new function called peerConnection(roomID) and pass in the room-ID


//Enable socket event listener to listen for "geolocation"

//function peerConnection(roomID)
//Add socket event listener for both the sockets in the room to listen for "sent-geolocation"
    //Emit an event called "got-geolocation" with the data for this event to the other peer in the room

//Add socket event listener for both sockets on "disconnect"
    //Emit to the other peer in the room that the other peer has disconnected with an event called "peer-disconnected"
    //Delete/remove the room with the current roomID