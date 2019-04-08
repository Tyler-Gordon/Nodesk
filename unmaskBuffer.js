// Unmasks a text buffer
function unmaskBuffer (buffer) {

    // Monitor what byte we want to work with
    let currentByte = 0;

    // Our frame sized is set such that all frames sent by the client will be final frames
    // Defines how we should interpret the data by grabbing the last 4 bits
    const opCode = buffer.readUInt8(currentByte++) & 0xF;

    // 0x8 signifies a connection close frame so we'll return null so the server knows the connections been closed
    // 0x1 signifies a text frame which is the only type of data we want to handle
    if (opCode === 0x8){
      var connectionClosed = Error('Connection closed');
      connectionClosed.name = 'ConnectionError';
      throw connectionClosed; 
    } else if (opCode !== 0x1) {
      throw new Error('Unsupported data frame')
    }

    const secondByte = buffer.readUInt8(currentByte++);

    // All messages sent from the client must be masked
    // (Explanation on the >>> and & operators below)
    if (!Boolean((secondByte >>> 7) & 0x1)) {
      throw new Error('Frame not masked')
    }

    // This will tell us how long the payload is (<125 or 126 or 127)
    let payloadLength = secondByte & 0x7F;

    // We are only supporting message sizes of up to 500 characters
    // If the payload length is less-than or equal-to 125 then that is the actual payload length
    if (payloadLength > 125){
      if (payloadLength === 126){

        // The payload length will be in the next 2 bytes since we got a 126 in the 2nd byte
        payloadLength = buffer.readUInt16BE(currentByte);
        currentByte += 2;
        
        // If it's some massive payload then someone has tampered with the html form
      } else {
        throw new Error('Payload too large')
      }
    }

    // Allocate memory to store the message. We could use allocUnsafe() maybe?
    // However it doesn't set the memory to 0 so if our security sucks then data could easily be taken 
    const payload = Buffer.alloc(payloadLength);

    // BE refers to BigEndian which basically means from largest to smallest
    // which ends up being the order they arrived in
    // We know the maskingKey will exist since we are throwing an error
    // if we don't get a 1 in the first bit of the second byte
    let maskingKey = buffer.readUInt32BE(currentByte);
    currentByte += 4;
    
    // Unmasking the data is a little tricky. The masking key is 32 bits or 4 bytes long
    // and matches each 4 byte section of the payload. So basically if were grabbing the first byte
    // of the payload we need to XOR it with the first byte of the masking key, the 5th byte of the payload
    // would also need to be XOR'd with the first byte of the masking key.
    for (let i = 0; i < payloadLength; ++i) {

      // This is to track which byte of the masking key we want to work with
      let j = i % 4;

      // Grabs the payload byte we want to unmask
      const chunk = buffer.readUInt8(currentByte++);

      // When we use the bitwise-AND operator (&) with (0xFF) this
      // means we want the 2 bytes at the end. So if the masking key
      // looks something like (ex: 0x92A211FC) and we need the 3rd and 4th byte (A2)
      // Rather than ANDing the entire key like so (key & 0x00FF0000), we should shift the
      // bytes to the right such that the key ends up looking like this (0x92A2). 
      // So when we AND it with 0xFF we grab exactly the bytes we want.
      const shift = 24 - j * 8;
      
      // Really cool thing I learned during this project that reminds of python generator expressions.
      // It's a ternery operator with the format var x = (condition) ? ifTrue : ifFalse
      // So we shift the bits of the maskingKey then afterwards grab the portion we want.
      const key = ( (shift == 0) ? maskingKey : (maskingKey >>> shift) ) & 0xFF;
      
      // Here we are simply writing the XOR result of the key and it's corresponding byte
      // and placing it at the index of the memory we allocated earlier. We don't need to bother
      // writing the header as we will be constructing that on our own.
      payload.writeUInt8(chunk ^ key, i);
    }

    // We should just return the payload here rather than encode and parse it.
    // That way if we choose not to use json at a later date or want to implement
    // this elsewhere we don't actually have to touch this function.
    // That being said there'd still be a ton of work to do if we wanted to make this 
    // less dependant on our current system.
    return payload
}

module.exports = {
  unmaskBuffer
}