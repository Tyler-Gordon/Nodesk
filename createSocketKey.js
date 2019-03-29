const crypto = require('crypto');
const websocketMagicString = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createKey(userKey) {
    var key = crypto.createHash("sha1")
    .update(userKey + websocketMagicString)
    .digest('base64');

    return key
}

module.exports = {
    createKey
}