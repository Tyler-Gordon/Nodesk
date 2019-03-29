function parseBuffer (buffer) {
    const firstByte = buffer.readUInt8(0);

    // Defines how we should interpret the data by grabbing the last 4 bits
    const opCode = firstByte & 0xF;

    // 0x8 signifies a connection close frame so we'll return null so the server knows the connections been closed
    // 0x1 signifies a text frame which is the only type of data we want to handle
    if (opCode === 0x8 || opCode !== 0x1){
      return null;
    }

    const secondByte = buffer.readUInt8(1);

    // If the first bit of the second byte is a 1, then the payload is masked
    // and we have to grab the masking key which is the next 4 bytes after the payload length
    const frameIsMasked = Boolean((secondByte >>> 7) & 0x1);

    // Monitor what byte we want to work with next
    let currentByte = 2;

    // This will tell us how long the payload is (<125 or 126 or 127)
    let payloadLength = secondByte & 0x7F;

    // We are only supporting message sizes of up to 500 characters
    // If the payload length is less-than or equal-to 125 then that is the actual payload length
    if (payloadLength > 125){
      if (payloadLength === 126){

        // The actual payload length will be in the next 2 bytes and will be
        // between 126 - 14400
        payloadLength = buffer.readUInt16BE(currentByte);

        // Monitor what byte we want to work with next
        currentByte += 2;
        
        // If it's some massive payload then someone has tampered with the html
        // and we're not gonna handle that
      } else {
        return null;
      }
    }

    // Allocate memory to store the message
    const payload = Buffer.alloc(payloadLength);

    // Retrieve the masking key if it exists, it will for any communication sent from a browser
    // which is the only communication we want to receive.
    var maskingKey;
    if (frameIsMasked) {

      // We use BE instead of LE as we want the bytes in BigEndian order, which is
      // simply the order they arrived in
      maskingKey = buffer.readUInt32BE(currentByte);
      currentByte += 4;
      
      for (let i = 0; i < payloadLength; ++i) {

        // Byte masking key to use for the XOR calc
        let j = i % 4;

        // Grabs a byte of data to be XOR'd against the masking key
        const chunk = buffer.readUInt8(currentByte++);

        // Decides how much to shift the masking key to extract the correct bytes
        const shift = 24 - j * 8;
        
        // Bitwise-AND operator to grab the last byte of data which is our key
        // as we 
        const key = ((shift == 0) ? maskingKey : (maskingKey >>> shift)) & 0xFF;
        
        // Writes to the memory we allocated earlier by first unmasking it
        // By XORing it with its masking key
        payload.writeUInt8(chunk ^ key, i);
      }
    } else {
      return null;
    }

    const parsedJson = JSON.parse(payload.toString('utf8'));
    return parsedJson;

}

module.exports = {
parseBuffer
}