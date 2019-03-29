function constructBuffer(data) {
    const json = JSON.stringify(data);

    // We need to know how large the payload is in bytes
    const jsonByteLength = Buffer.byteLength(json);

    // If the payload is greater than 126 bytes we need to
    // allocate space for the 3rd and 4th bytes to assign the actual length
    // 0 if the bytes are less than 126, 2 if greater
    const additionalPayloadHeader = (jsonByteLength < 126) ? 0 : 2;

    // If the payload is greater than 126 bits we need to put 126 in the header
    const payloadLength = (additionalPayloadHeader === 0) ? jsonByteLength : 126;

    // We then need to allocate memory to store the payload in
    const buffer = Buffer.alloc(2 + additionalPayloadHeader + jsonByteLength);

    // Tracking what byte we want to work with
    let currentByte = 0;

    // We write opCode 1 and send a 1 for the FIN signifying 
    // this is the final frame as the first byte in the header
    buffer.writeUInt8(129, currentByte++);

    // We write how long the payload will be in the second byte
    buffer.writeUInt8(payloadLength, currentByte++);

    // If the payload is larger than 126 bytes we need to write
    // How many bytes it'll be in the 3rd and 4th byte
    if (additionalPayloadHeader === 2) {
        buffer.writeUInt16BE(jsonByteLength, currentByte);
        currentByte += 2;
    }

    // We use the rest of the buffer for the actual payload
    buffer.write(json, currentByte);
    return buffer
}

module.exports = {
    constructBuffer
}