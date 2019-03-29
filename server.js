// Node modules
const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

// Environment Variables
const port = process.env.PORT || 8000

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
            res.end(fs.readFileSync(`./public/loginpage.html`));
            break;

        //WORK IN PROGRESS
        case '/messages':
            res.writeHead(200, { 'Content-Type': 'application/json' });
            const username = url.parse(req.url, true).username;
            getMessages(username, (data) => {
                res.end(JSON.stringify(data));
            })
            // Test getMessages();

            res.end()

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

    // This establishes the connection and turns the current TCP socket
    // into a websocket
    socket.write(responseHeader.join('\r\n') + '\r\n\r\n');

    socket.on('data', buffer => {
        // Parses the buffer data received from client
        const userMessage = parseBuffer(buffer)

        // If it's null there was an error and we'll handle it
        if (userMessage !== null) {

            // Here we'll build the unmasked message from the initial message
            const serverMessage = constructBuffer(userMessage)

            // This will echo the message back to the client
            socket.write(serverMessage)

            // This sends the user message in json format to the database

            // User auth and sending user info has to be implemented first before
            // We can add shit to the db
            // addMessage(userMessage)

            //TODO maintain a list of userIDs that are connected
            //TODO sendToOnlineClients(serverMessage);
            //TODO security and stuff
        } else {
            console.log('There has been an error');
        }
    });
});
            

server.listen(port);