const crypto = require('crypto');

function createHash(string) {
    let key = crypto.createHmac("sha256")
    .update(string)
    .digest('hex');

    return key
}

module.exports = {
    createHash
}
