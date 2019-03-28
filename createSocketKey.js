const crypto = require('crypto');
const magicString = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createKey(userKey, callback) {
    var key = crypto.createHash("sha1").update(userKey + magicString).digest('base64')
    callback(key);
}

module.exports = {
    createKey
}