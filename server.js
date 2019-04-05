// Node modules
const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

// Environment Variables
const port = process.env.PORT || 8000
var connectedUsers = [];

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
    switch (req.url) {

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

        case '/images':
            var stream = fs.createReadStream('./Public/images/lighthouse.jpg')
            res.writeHead(200, {'Content-Type': 'image/jpeg'});
            stream.pipe(res)
            break;

        // Getting the user's latest messages
            case '/messages':
            var user = qs.parse(req.headers.cookie).Username;
            if (connectedUsers.includes(user)) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(file)
            } else {
                res.writeHead(301, { 'Location': '/' });
                res.end();
            }
            // res.writeHead(200, { 'Content-Type': 'application/json' });
            // const chatid = query.chatid
            // console.log(chatid)
            // message.getMessages(chatid,(data)=>{
            //     console.log(data)
            //     res.end(JSON.stringify(data));
            // });
            console.log(query)
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

    // I want to write this section into a function
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
    // I want to write this section into a function

    // This establishes the connection and turns the current TCP socket
    // into a websocket
    socket.write(responseHeader.join('\r\n') + '\r\n\r\n'); // I want to make a socket.acceptWebsocket function
    
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

            // This will echo the message back to the client
            const returnPayload = Buffer.concat([payloadHeader, bufferedUserMessage], payloadHeaderLength + userPayloadLength);
            socket.write(returnPayload);
            
            // Add the message to the database
            // message.addMessage(parsedUserMessage);

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