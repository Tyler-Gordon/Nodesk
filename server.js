const server = require('http').createServer();
const fs = require('fs');
const qs = require('querystring');

server.on('request', (req, res) => {
    switch (req.url) {

        case '/':
            res.writeHead(200, { 'Content-Type': 'text/html' });            
            res.end(fs.readFileSync(`./loginpage.html`));
            break;

        // case '/':
        //     if (req.method === 'POST') {
        //         var body = '';

        //         req.on('data', data => {
        //             body += data;
        //         })

        //         req.on('end', () => {
        //             console.log(qs.parse(body));
        //         })
        //     }

        //     res.writeHead(200, { 'Content-Type': 'text/html' });
        //     res.end(fs.readFileSync(`.${req.url}.html`));
        //     break;

        default:
            req.on('data', data => {
                console.log(data)
            });
            
            res.writeHead(404);
            res.end();
    }
});

server.listen(8000);