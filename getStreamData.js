function getStreamData(stream, callback) {
    var body = '';

    stream.on('data', data => {
        body += data;
    });

    stream.on('end', () => {
        callback(body);
    });
}

module.exports = {
    getStreamData
}