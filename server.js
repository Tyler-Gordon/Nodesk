// Node modules
const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

// Environment Variables
const port = process.env.PORT || 8000
var connectedUsers = [];

// Our modules
const createChat =  require('./chat').createChat;
const message = require('./messages');
const registerUser = require('./userRegistration').registerUser;
const createKey = require('./createSocketKey').createKey;
const parseBuffer = require('./parseBuffer').parseBuffer;
const constructBuffer = require('./constructBuffer').constructBuffer;


server.on('request', (req, res) => {
    switch (req.url) {

        case '/':
            res.writeHead(200, { 'Content-Type': 'text/html' });            
            res.end(fs.readFileSync(`./Public/index.html`));
            break;
        case '/components/':
            res.writeHead(200, { 'Content-Type': '' });            
            res.end(fs.readFileSync(`./Public/components/Messages.vue`));
        //WORK IN PROGRESS
        case '/messages':
            res.writeHead(200, { 'Content-Type': 'application/json' });
            const username = url.parse(req.url, true).username;
            // getMessages(username, (data) => {
            //     res.end(JSON.stringify(data));
            // })
            // Test getMessages();

            res.end()

        case '/chat':
            res.writeHead(200, { 'Content-Type': 'text/html' });            
            res.end(fs.readFileSync(`./public/messages.html`));
            break;

        // Need to rework this later (reminder for Connor) 
        case '/submit':
            if (req.method === 'POST') {
                var body = '';

                req.on('data', data => {
                    body += data;
                });

                req.on('end', () => {
                    body = qs.parse(body);
                    registrationStatus = registerUser(body.username, body.email, body.passwordCheck);
                });
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Registration successful');
            break;

        // If they attempt to go somewhere that's not allowed
        default:
            res.writeHead(404);
            res.end();
    }
});

server.on('upgrade', (req, socket) => {

    // I want to write this section into a function
    if (req.url !== '/messages'){
        socket.end('HTTP/1.1 400 Bad Request');
        return;
    }

    if (req.headers['upgrade'] !== 'websocket') {
        socket.end('HTTP/1.1 400 Bad Request');
        return;
    }
    
    let userKey = req.headers['sec-websocket-key'];
    const serverKey = createKey(userKey);

    const responseHeader = [ 
        'HTTP/1.1 101 Web Socket Protocol Handshake', 
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${serverKey}`,
        'Sec-WebSocket-Protocol: json'];
    // I want to write this section into a function

    // This establishes the connection and turns the current TCP socket
    // into a websocket
    socket.write(responseHeader.join('\r\n') + '\r\n\r\n'); // I want to make a socket.acceptWebsocket function
    
    // For some reason this event and the 'connect' event don't fire? Maybe we should just do all this stuff before
    // the 'data' event and make sure we have all this stuff connected.
    socket.on('ready', () => {
        // Grab the user's username and get all the chatIds they're linked to
        // Then push to connectedUsers a local object that stores:
        // the UserIds, ChatIds and socket they're connected to.
        // userChatIDs = getChatIDs(userID);
        // let user = {
        //     userID : 'something',
        //     chatIDs : userChatIDs,
        //     sock : socket.ref()
        // }
        // connectedUsers.push(user)
        
    });

    socket.on('data', buffer => {
        try {
            // Parses the buffer data received from client
            const userMessage = parseBuffer(buffer)

            // We stringify the data then pass it into constructBuffer

            const messageString = JSON.stringify(userMessage)
            const serverMessage = constructBuffer(messageString)

            // This will echo the message back to the client
            socket.write(serverMessage)

            // This sends the user message in json format to the database

            // User auth and sending user info has to be implemented first
            // addMessage(userMessage)

            //TODO maintain a list of userIDs that are connected
            //TODO sendToOnlineClients(serverMessage);
            //TODO security and stuff

        } catch (e) {
            // I've thrown a couple errors in parseBuffer instead of returning null.
            // That way we can include a logging functionality if we want.
            console.log(e.message)
        }
    });

});
            

server.listen(port);