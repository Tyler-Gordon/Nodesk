// Node modules
const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

// Environment Variables
const port = process.env.PORT || 8000
var connectedUsers = [];
var openChats = [];

// Our modules
const hashPassword = require('./hashString').createHash;
const getBody = require('./getStreamData').getStreamData;
const connection = require('./connection');
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
            if (connectedUsers.includes(user)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(file)
            } else {
                res.writeHead(301, { 'Location': '/' });
                res.end();
            }
            break;

        case '/chatids':
            var user = qs.parse(req.headers.cookie).Username;
            if (connectedUsers.includes(user)) {
                try {
                    
                    chat.getChatIDs(user, (data)=> {
                        // Super messy but it's working, don't want to look at this until later
                        // This is for keeping track of logged in users
                        data.forEach(chatId => {
                            connection.addOpenChats(openChats, chatId);
                            chat.getChatUsers(chatId, (users) => {
                                users.forEach(username => {
                                    connection.addOpenChatUsers(openChats, chatId, username);
                                });
                            });
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.write(JSON.stringify(data));
                        res.end();
                    });
                } catch (error) {
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
            var chatId = url.parse(req.url, true).chatId;
            var user = qs.parse(req.headers.cookie).Username;
            if (connectedUsers.includes(user)) {
                try {
                    message.getMessages(chatId, (messages) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(messages));
                    });
                } catch (error) {
                    res.end();
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
                            connectedUsers.push(username);
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

    // Add a reference to the user's socket in all chats the user is connected to
    var user = qs.parse(req.headers.cookie).Username;

    chat.getChatIDs(user, (chatIds) => {
        // We have to add a reference to the socket in each chatId, this ends up allowing us to
        // push messages to all connected users more easily
        chatIds.forEach(chatId => {
            connection.getConnectedUsers(openChats, chatId, (user) => {
                if (connectedUsers.includes(user.user)) {
                    user.socket = socket.ref();
                }
            });
        });
    });


    socket.on('data', buffer => {
        try {
            // Unmasks the buffer received from client
            const bufferedUserMessage = unmaskBuffer(buffer);
            const userPayloadLength = bufferedUserMessage.byteLength

            // Parses the buffer for use with the database and other functions
            const parsedUserMessage = JSON.parse(bufferedUserMessage.toString('utf8'));
            console.log(parsedUserMessage)
            
            // Create the header to send back to the client
            const payloadHeader = constructPayloadHeader(userPayloadLength)
            const payloadHeaderLength = payloadHeader.byteLength

            // Add the messages to the database
            // message.addMessage(parsedUserMessage);

            // We construct the return payload from header and the unmasked payload
            // Then send it to all users that are connected
            const returnPayload = Buffer.concat([payloadHeader, bufferedUserMessage], payloadHeaderLength + userPayloadLength);
            connection.getConnectedUsers(openChats, parsedUserMessage.chatId, (user) => {
                if (connectedUsers.includes(user.user)) {
                    user.socket.write(returnPayload);
                }
            });

        } catch (e) {
            // I've thrown a couple errors in parseBuffer instead of returning null.
            // That way we can include a logging functionality if we want.
            console.log(e.message)
        }
    });
});
            

server.listen(port);