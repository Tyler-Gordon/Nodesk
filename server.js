// Node modules
const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

// Environment Variables
const port = process.env.PORT || 8000
var authenticatedUsers = new Set();
var openChats = new Set();
var userSockets = new Set();


// Our modules
const hashPassword = require('./hashString').createHash;
const getBody = require('./getStreamData').getStreamData;
const chat =  require('./chat');
const authenticateUser = require('./userLogin').authenticateUser;
const message = require('./messages');
const registerUser = require('./userRegistration').registerUser;
const createKey = require('./createSocketKey').createKey;
const unmaskBuffer = require('./unmaskBuffer').unmaskBuffer;
const constructPayloadHeader = require('./constructPayloadHeader').constructPayloadHeader;


server.on('request', (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    switch (parsedUrl.pathname) {

        // Static files
        case '/':
            var stream = fs.createReadStream(`./Public/index.html`);
            res.writeHead(200, {'Content-Type': 'text/html'});
            stream.pipe(res);      
            break;

        case '/chat':
            // Check authorization from cookie
            var file = fs.readFileSync(`./Public/chat.html`);
            var user = qs.parse(req.headers.cookie).Username;
            if (authenticatedUsers.has(user)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(file)
            } else {
                res.writeHead(301, { 'Location': '/' });
                res.end();
            }
            break;

        case '/chatids':
            var user = qs.parse(req.headers.cookie).Username;
            if (authenticatedUsers.has(user)) {
                try {
                    chat.getChatIDs(user, (data) => {
                        data.forEach(chatId => {
                            openChats.add(chatId);
                        });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(data));
                        console.log(openChats, authenticatedUsers);
                    });
                } catch (error) {
                    console.log(error)
                    res.end();
                }
            } else {
                res.writeHead(301, { 'Location': '/' });
                res.end();
            }
            break;

        case '/images':
            var stream = fs.createReadStream('./Public/images/lighthouse.jpg')
            res.writeHead(200, {'Content-Type': 'image/jpeg'});
            stream.pipe(res)
            break;

        // Getting the user's latest messages
        case '/messages':
        var chatId = url.parse(req.url, true).query.chatid;
        var user = qs.parse(req.headers.cookie).Username;
        if (authenticatedUsers.has(user)) {
            try {
                message.getMessages(chatId, (messages) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify(messages));
                    console.log(messages);
                    console.log(chatId);
                    res.end()
                });
            } catch (error) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('[]');
            }
        } else {
            res.writeHead(301, { 'Location': '/' });
            res.end();
        }
        break;

        // Form submission routes
        case '/register':
            // If /register is accessed by a POST method we'll initiate the registration process
            if (req.method === 'POST') {
                getBody(req, (body) => {
                    try {
                        body = qs.parse(body);
                        registerUser(body.username, body.email, body.password);
                        res.writeHead(200);            
                        res.end();
                    } catch (e) {
                        console.log(e)
                        res.writeHead(400);            
                        res.end();
                    }
                });  
            }
            // If /register is accessed by any other method, we're going to reroute them to the homepage
            res.writeHead(301, { 'Location': '/' });
            res.end();
            break;
        
        case '/login':
            if (req.method === 'POST') {
                getBody(req, (body) => {
                    body = qs.parse(body);
                    let password = hashPassword(body.password)
                    authenticateUser(body.email, password, (username) => {
                        if (!username) {
                            res.writeHead(301, { 'Location': '/' });
                            res.end();
                        } else {
                            authenticatedUsers.add(username);
                            // Max-Age set to 3 hours
                            res.setHeader('Set-Cookie', [`Max-Age=${1000 * 60 * 60 * 3}`])
                            res.setHeader('Set-Cookie', [`Username=${username}`]) 
                            res.writeHead(301, { 'Location': '/chat' });
                            res.end();
                        }
                    });
                });
            } else {
                res.writeHead(301, { 'Location': '/' });
                res.end();
            }
            break;

        // If they attempt to go somewhere that doesn't exist
        default:
            res.writeHead(404);
            res.end();
    }
});

server.on('upgrade', (req, socket) => {
    try {
        if (req.url !== '/chat'){
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
    
        // This establishes the connection and turns the current TCP socket into a websocket
        socket.write(responseHeader.join('\r\n') + '\r\n\r\n');
    
        var user = qs.parse(req.headers.cookie).Username;
        if (authenticatedUsers.has(user)) {
            const userSocket = socket.ref()
            userSockets.add({ [user] : userSocket });
        }
    } catch (error) {
        console.log(error.message);
    }

    socket.on('data', buffer => {
        try {
            // Unmasks the buffer received from client
            const bufferedUserMessage = unmaskBuffer(buffer);
            const userPayloadLength = bufferedUserMessage.byteLength

            // Parses the buffer for use with the database and other functions
            const parsedUserMessage = JSON.parse(bufferedUserMessage.toString('utf8'));
            
            // Create the header to send back to the client
            const payloadHeader = constructPayloadHeader(userPayloadLength)
            const payloadHeaderLength = payloadHeader.byteLength

            // Add the messages to the database
            message.addMessage(parsedUserMessage);

            // We construct the return payload from header and the unmasked payload
            // Then send it to all users that are connected
            const returnPayload = Buffer.concat([payloadHeader, bufferedUserMessage], payloadHeaderLength + userPayloadLength);

            // Check that the incoming message is in our open chats
            if(openChats.has(parsedUserMessage.chatid)) {

                // Look at all the users connected to the chat
                chat.getChatUsers(parsedUserMessage.chatid, (users) => {
                    users.forEach(user => {
                        if(authenticatedUsers.has(user)) {

                            // Push to every user that's online
                            userSockets.forEach(value =>{
                                value[user].write(returnPayload)
                            });
                        }
                    });
                });
            }
            
        } catch (e) {
            // I've thrown a couple errors in parseBuffer instead of returning null.
            // That way we can include a logging functionality if we want.
            console.log(e.message)
        }
    });
});
            

server.listen(port);