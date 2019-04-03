const crypto = require('crypto');

function createHash(string) {
    let hash = crypto.createHmac("sha256",'')
    .update(string)
    .digest('hex');

    return hash
}

module.exports = {
    createHash
}
