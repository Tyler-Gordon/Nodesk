// We're going to stringify the data outside of the function to
// decrease the dependancy it has on the system.
function constructBuffer(data) {

    // Tracking what byte we want to work with
    let currentByte = 0;
    const dataByteLength = Buffer.byteLength(data);

    // If the payload is greater than 126 bytes we need to
    // allocate space for the 3rd and 4th bytes to assign the actual length
    // 0 if the bytes are less than 126, 2 if greater
    const additionalPayloadHeader = (dataByteLength < 126) ? 0 : 2;

    // Allocate some memory to write to, I wonder how we can access the memory
    // we wrote to earlier when the message came in?
    const buffer = Buffer.alloc(2 + additionalPayloadHeader + dataByteLength);

    // We write opCode 1 and send a 1 for the FIN to tell the client this is the final frame
    buffer.writeUInt8(129, currentByte++);

    // If the payload is larger than 125 bytes we need to put that information
    // in the frame header. That means putting 126 in the last 7 bits of the 2nd byte
    // and then writing the actual length in the 3rd and 4th byte.
    if (additionalPayloadHeader === 2) {
        let payloadLength = 126;
        buffer.writeUInt8(payloadLength, currentByte++);
        buffer.writeUInt16BE(dataByteLength, currentByte);
        currentByte += 2;
    } else {
        // If the data is small we can simply just write the length in the 2nd byte
        buffer.writeUInt8(dataByteLength, currentByte++);
    }

    buffer.write(data, currentByte);
    return buffer
}

module.exports = {
    constructBuffer
}