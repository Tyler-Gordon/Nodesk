const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');
const url = require('url');

const port = process.env.PORT || 8000

const registerUser = require('./userRegistration').registerUser;
const createKey = require('./createSocketKey').createKey;

server.on('request', (req, res) => {
    switch (req.url) {

        case '/':
            res.writeHead(200, { 'Content-Type': 'text/html' });            
            res.end(fs.readFileSync(`./loginpage.html`));
            break;

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

        case '/chat':
            if (req.headers.connection === 'Upgrade') {
                let userKey = req.headers['sec-websocket-key']
                createKey(userKey, (serverKey)=> {
                    res.writeHead(101, {
                        'Upgrade': 'websocket',
                        'Connection': 'Upgrade',
                        'Sec-WebSocket-Accept': serverKey
                    }); 
                })
        
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });           
                res.write(fs.readFileSync(`./chat.html`));
            }
            res.end()
            
            break;

        default:
            res.writeHead(404);
            res.end();
    }
});

server.listen(port);