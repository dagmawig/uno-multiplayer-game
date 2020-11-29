const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// server port
const port = 4001;

const app = express();

// creating a server
const server = http.createServer(app);

// creating a socket and allowing request from any origin
const io = socketIO(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});


// parameters to track properties of clients connected and disconnected
var gameOn = false;
var users = {};
var order = 0;
var names = [];
var socketID = [];

// defining the socket connection instance  
io.on('connection', socket => {

    // preventing a player from joining a server if a game session is on
    if(gameOn) {
        socket.emit('join', false);
        return;
    }
    else {
        socket.emit('join', true);
    }
    let userID = socket.id;
    socketID.push(userID);
    console.log(`User ${userID} connected.`);

    //handling a palyer joining a server
    socket.on('name', name => {
        users[userID] = order;
        names.push(name);
        let totPlayer = names.length;
        let hand = [...Array(totPlayer)].map(i=>[]);
        socket.emit('usersInfo', [order, names, userID, hand]);
        socket.broadcast.emit('newUser', [names, hand]);
        order++;
        console.log(users, names);
    })

    // handling an update to a player state
    socket.on('updateState', (state) => {
        console.log('broadcasting state update');
        if('gameOn' in state) gameOn = state.gameOn;
        socket.broadcast.emit('updateState', state);
    })

    // handling a plaer being disconnected from server
    socket.on('disconnect', () => {
        gameOn = false;
        order--;
        let index = users[socket.id];
        names.splice(index, 1);
        let place = socketID.indexOf(socket.id);
        if(place !== -1){
            socketID.splice(place, 1);
        }
        delete users[socket.id];
        socketID.map(ID => {
            if (users[ID] > index) {
                //console.log('ID is:', ID, users[ID]);
                users[ID]--;
                //console.log(users[ID]);
                io.to(ID).emit('updateOrder', users[ID]);
            }
        })
        let totPlayer = names.length;
        let hand = [...Array(totPlayer)].map(i=>[]);
        socket.broadcast.emit('lostUser', [names, hand, index]);
        console.log(`User ${userID} disconnected.`);
        if (socketID.length === 0) gameOn = false;
    });
});

// server listening on ports
server.listen(port, '192.168.1.5', () => console.log(`Listening on port ${port}`));